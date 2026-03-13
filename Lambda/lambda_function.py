import json
import boto3
import uuid
import os
import base64
import urllib.request
from decimal import Decimal
from datetime import datetime

# ==========================
# AWS Clients
# ==========================
bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.environ.get("AWS_REGION", "us-east-1")
)

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# ==========================
# Config
# ==========================
MODEL_ID = "us.amazon.nova-2-lite-v1:0"
BUCKET_NAME = "cleanwatch-images-garbage"
TABLE_NAME = "cleanwatch-complaints"


# ==========================
# Location Checker
# ==========================
def check_sensitive_location(lat, lon):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "cleanwatch-app"}
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())

        display_name = data.get("display_name", "").lower()

        sensitive_keywords = [
            "hospital", "school", "college",
            "clinic", "market",
            "water", "lake", "river"
        ]

        for word in sensitive_keywords:
            if word in display_name:
                return True

        return False

    except Exception as e:
        print("Location check failed:", str(e))
        return False


# ==========================
# Lambda Handler
# ==========================
def lambda_handler(event, context):

    try:

        print("RAW EVENT:", event)

        table = dynamodb.Table(TABLE_NAME)
        method = event.get("requestContext", {}).get("http", {}).get("method", "")

        # =====================================================
        # GET → Fetch complaints
        # =====================================================
        if method == "GET":

            response = table.scan()
            items = response.get("Items", [])

            for item in items:

                if "latitude" in item:
                    item["latitude"] = float(item["latitude"])

                if "longitude" in item:
                    item["longitude"] = float(item["longitude"])

                if item.get("image_url"):

                    try:

                        key = item["image_url"].split("/")[-1]

                        presigned_url = s3.generate_presigned_url(
                            "get_object",
                            Params={
                                "Bucket": BUCKET_NAME,
                                "Key": key
                            },
                            ExpiresIn=3600
                        )

                        item["image_url"] = presigned_url

                    except Exception as e:
                        print("Presigned URL Error:", str(e))
                        item["image_url"] = None

            return build_response(200, items)

        # =====================================================
        # POST → Create complaint
        # =====================================================
        body = {}

        if "body" in event and event["body"]:
            body = json.loads(event["body"])
        else:
            body = event

        print("PARSED BODY:", body)

        report_text = body.get("description", "")
        image_base64 = body.get("image")
        latitude = body.get("latitude")
        longitude = body.get("longitude")

        if not image_base64:

            return build_response(200, {
                "message": "Complaint ignored because image was missing."
            })

        # ==========================
        # AI Prompt
        # ==========================
        prompt_text = f"""
You are an AI waste environmental monitoring system.

Analyze the waste complaint carefully using BOTH the image and description and recommend municipal action.

Image shows garbage on street.

Description:
{report_text}

IMPORTANT:
- If waste is near hospital, school, public place, market, or water body → severity MUST be HIGH.
- Large waste accumulation → HIGH.
- Mixed waste → at least MODERATE.
- Small isolated waste → LOW.

Return ONLY valid JSON.

Format:

{{
"waste_present": true or false,
"waste_type": ["plastic","organic","metal","glass","mixed","textile","other"],
"severity": "low" or "moderate" or "high",
"explanation": "Clear explanation",
"recommended_action": "recommend municipal action"

}}
"""

        messages_content = [{"text": prompt_text}]

        messages_content.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": image_base64}
            }
        })

        # ==========================
        # Call Bedrock Model
        # ==========================
        response_model = bedrock.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "messages": [
                    {"role": "user", "content": messages_content}
                ]
            })
        )

        result = json.loads(response_model["body"].read())

        raw_text = result["output"]["message"]["content"][0]["text"]

        clean_text = raw_text.replace("```json", "").replace("```", "").strip()

        try:

            ai_output = json.loads(clean_text)

        except:

            ai_output = {
                "waste_present": True,
                "waste_type": ["mixed"],
                "severity": "moderate",
                "explanation": "Waste detected but formatting issue occurred."
            }

        # ==========================
        # Garbage Detection Check
        # ==========================
        if not ai_output.get("waste_present", False):

            print("AI detected NO garbage. Complaint will NOT be saved.")

            return build_response(200, {
                "message": "No garbage detected in image. Complaint not registered.",
                "ai_analysis": ai_output
            })

        # ==========================
        # Upload image to S3
        # ==========================
        complaint_id = str(uuid.uuid4())

        image_bytes = base64.b64decode(image_base64)

        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=f"{complaint_id}.jpg",
            Body=image_bytes,
            ContentType="image/jpeg"
        )

        image_url = f"s3://{BUCKET_NAME}/{complaint_id}.jpg"

        # ==========================
        # GPS Override Logic
        # ==========================
        lat_decimal = None
        lon_decimal = None

        if latitude is not None and longitude is not None:

            try:

                lat_float = float(latitude)
                lon_float = float(longitude)

                if check_sensitive_location(lat_float, lon_float):
                    ai_output["severity"] = "high"

                lat_decimal = Decimal(str(lat_float))
                lon_decimal = Decimal(str(lon_float))

            except Exception as e:

                print("GPS processing error:", str(e))

        # ==========================
        # Save to DynamoDB
        # ==========================
        item = {
            "complaint_id": complaint_id,
            "report_text": report_text,
            "image_url": image_url,
            "severity": ai_output["severity"],
            "waste_type": ai_output["waste_type"],
            "explanation": ai_output["explanation"],
            "created_at": datetime.utcnow().isoformat(),
			"recommended_action": ai_output["recommended_action"]
			
        }

        if lat_decimal and lon_decimal:

            item["latitude"] = lat_decimal
            item["longitude"] = lon_decimal

        table.put_item(Item=item)

        return build_response(200, {
            "complaint_id": complaint_id,
            "analysis": ai_output
        })

    except Exception as e:

        print("ERROR:", str(e))

        return build_response(500, {"error": str(e)})


# ==========================
# Response Builder
# ==========================
def build_response(status, body):

    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body)
    }
