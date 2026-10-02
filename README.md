# 🚑 LifeLens

## AI-Powered Emergency Response & Student Safety Platform

LifeLens is an AI-powered emergency response platform designed to identify emergency situations, assess their severity, and coordinate an appropriate response by connecting incident reporting with hospital and ambulance assistance.

The platform combines a web-based interface, real-time communication, backend services, and an AI-powered emergency response agent.

## ✨ Features

* 🚨 Emergency incident reporting
* 🤖 AI-based emergency severity classification
* 🏥 Hospital assignment based on emergency severity
* 🚑 Ambulance response coordination
* 📍 Location-based incident reporting
* ⚡ Real-time communication using Socket.IO
* 🌐 Web-based emergency dashboard
* 🔄 Backend API integration
* 🧠 LangGraph-based AI agent workflow
* 💬 Google Gemini integration for emergency analysis

## 🧠 AI Emergency Response

LifeLens uses an AI agent workflow to process emergency reports.

### Workflow

```text
Emergency Report
       ↓
   AI Analysis
       ↓
Severity Classification
  LOW / MEDIUM / HIGH
       ↓
Hospital Assignment
       ↓
Ambulance Assignment
       ↓
Response Information
```

The AI agent receives the emergency description and location, analyzes the incident, and classifies its severity. The workflow then determines the hospital and ambulance response.

## 🏗️ Architecture

```text
                 ┌───────────────────┐
                 │   Web Interface   │
                 │   HTML/CSS/JS     │
                 └─────────┬─────────┘
                           │
                           ↓
                 ┌───────────────────┐
                 │ Node.js / Express │
                 │    Backend API    │
                 └─────────┬─────────┘
                           │
                           ↓
                 ┌───────────────────┐
                 │   Python AI Agent │
                 │ FastAPI + Gemini  │
                 │    + LangGraph    │
                 └─────────┬─────────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
          Severity      Hospital     Ambulance
         Assessment    Assignment    Response
```

## 🛠️ Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js
* Socket.IO
* CORS

### AI / Python

* Python
* FastAPI
* Google Gemini
* LangGraph
* Pydantic

### Development

* Git
* GitHub
* Docker

## 📂 Project Structure

```text
LifeLens/
│
├── lifelens-backend/
├── agent.py
├── app.js
├── server.js
├── index.html
├── style.css
├── package.json
├── package-lock.json
├── Dockerfile
└── README.md
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/swarna624/LifeLens.git
cd LifeLens
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Gemini API

Create an environment variable for your Gemini API key:

```text
GEMINI_API_KEY=your_api_key
```

Do not commit API keys or other sensitive information to GitHub.

### 4. Run the Node.js Application

```bash
node server.js
```

### 5. Run the Python AI Agent

Install the required Python packages and start the FastAPI application:

```bash
uvicorn agent:app --reload
```

## 🔌 AI API

The AI emergency agent provides an endpoint for reporting incidents:

```text
POST /report
```

Example request:

```json
{
  "description": "Student injured and requires immediate assistance",
  "location": "Hyderabad"
}
```

## 🎯 Objective

The goal of LifeLens is to reduce the delay between identifying an emergency and coordinating an appropriate response by combining AI-assisted analysis, location information, backend services, and real-time communication.

## 🔮 Future Enhancements

* 📱 Dedicated mobile application
* 📍 Live GPS tracking
* 🗺️ Real-time map integration
* 🔔 SMS and push notifications
* 🏥 Integration with real hospital systems
* 🚑 Live ambulance tracking
* 👨‍👩‍👧 Guardian notifications
* 🔐 User authentication and role-based access
* ☁️ Cloud deployment
* 📊 Emergency analytics dashboard
* 🧠 Improved AI-based emergency triage

## 👩‍💻 Developer

**Baisa Swarna**

B.Tech – Computer Science & Engineering

## 📌 Project Status

🚧 **Under Development**

LifeLens is an ongoing project focused on building an AI-assisted emergency response and safety platform.

## 📄 License

This project is currently intended for educational and development purposes.
