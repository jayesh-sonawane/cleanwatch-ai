# CleanWatch AI ♻️

AI-powered Waste Monitoring System built using Amazon Nova 2 Lite and AWS Serverless Architecture.
 
## Problem
Urban areas suffer from unreported garbage accumulation leading to health risks.

## Solution
CleanWatch AI allows citizens to report waste using a photo.  
AI analyzes the image and identifies severity and waste type.

## Features

• AI waste detection  
• Severity classification  
• Garbage hotspot map  
• Complaint history  
• Heatmap visualization  

## Tech Stack

Frontend:
- React
- Leaflet Maps

Backend:
- AWS Lambda
- Amazon API Gateway

AI:
- Amazon Bedrock
- Nova 2 Lite model

Storage:
- Amazon S3
- DynamoDB

## Architecture

User → CloudFront → API Gateway → Lambda → Bedrock Nova 2 Lite model → DynamoDB + S3

## AI Output

The system detects:

- Waste Type
- Severity
- Description
- Recommended Cleanup Action

## Future Improvements

- Municipal dashboard
- Auto cleanup scheduling
- Drone waste monitoring
