AWS | React | AI | Serverless | Smart City
🌍 CleanWatch AI

AI-Powered Waste Monitoring System for Smart Cities ♻️

Detects garbage using AI and visualizes waste hotspots on a map to help municipalities respond faster.

🚀 Project Overview

Urban waste problems often go unreported or unnoticed.
CleanWatch AI allows citizens to report waste by uploading a photo. The system uses AI to analyze the image and determine:

Waste type
Severity level
Description of the problem
Recommended cleanup action

This information is then stored and displayed on an interactive map showing garbage hotspots.

🧠 AI Capabilities

AI analysis is performed using:
Amazon Bedrock
Amazon Nova 2 Lite

The AI returns structured results like:

{
 "severity": "high",
 
 "waste_type": ["plastic","mixed"],
 
 "description": "Large garbage accumulation near roadside",
 
 "recommended_action": "Municipal cleanup team required within 24 hours"
 
}

🏗 System Architecture

Architecture uses a serverless design built on AWS.

Flow

1️⃣ User uploads waste photo

2️⃣ API receives complaint

3️⃣ AI analyzes waste image

4️⃣ Results stored in database

5️⃣ Map shows garbage hotspots



☁️ AWS Services Used

Frontend Hosting
Amazon S3
Content Delivery
Amazon CloudFront
API Layer
Amazon API Gateway

Serverless Compute

AWS Lambda

AI Processing

Amazon Bedrock

Database

Amazon DynamoDB

Image Storage

Amazon S3

🖥 Tech Stack
Frontend

React

Leaflet Maps

Heatmap Visualization

Backend

Python Lambda API

Cloud Infrastructure

AWS Serverless Architecture

📊 Key Features

✔ AI garbage detection

✔ Waste severity classification

✔ Garbage hotspot ranking

✔ Heatmap visualization

✔ Complaint history tracking

✔ Location detection (GPS)

📍 Example Output

Field	Description
Severity	High / Moderate / Low
Waste Type	Plastic, Organic, Mixed
Description	AI explanation of waste
Recommended Action	Cleanup suggestion


📂 Project Structure
cleanwatch-ai
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── App.js
│   │   ├── Login.js
│   │   └── index.js
│
├── backend
│   └── lambda_function.py
│
├── architecture
│   └── system_architecture.png
│
├── README.md
└── .gitignore


📸 Application Features
Waste Reporting

Users capture garbage images directly from their camera.

AI Waste Detection

AI automatically identifies waste type and severity.

Complaint Map

All complaints displayed on a geographic map.

Garbage Hotspots

Areas with repeated complaints ranked automatically.

🔮 Future Enhancements

Municipal dashboard

Automated cleanup alerts

AI waste classification model

Drone waste monitoring

Predictive garbage hotspot detection

🤝 Contribution

Contributions are welcome!

Fork the repository

Create a feature branch

Submit a Pull Request

⭐ Support

If you like this project, please give it a ⭐ on GitHub.

👨‍💻 Author

Developed by Jayesh Sonawane

AI + AWS Serverless Project
