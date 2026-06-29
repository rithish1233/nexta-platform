# ⚡ NextA v2 — Intelligent Next Best Action Platform

### Powered by Groq LLMs · AI Agentic Platform

---

# 🚀 What This Does

Paste any customer interaction such as meeting notes, emails, or transcripts.

Seven AI agents execute sequentially using **Groq's high-performance LLM inference**, streaming their reasoning **word-by-word** to the browser through Socket.IO.

The platform analyzes customer interactions, generates **ranked and explainable Next Best Actions**, and provides approval/rejection controls with persistent memory for future recommendations.

---

# 📋 Prerequisites

## 1. Node.js 18+

Download from https://nodejs.org (LTS Version)

Verify installation:

```bash
node --version
```

Expected output:

```text
v18+
```

---

## 2. MongoDB

### macOS

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Ubuntu / Debian

```bash
sudo apt install -y mongodb
sudo systemctl start mongodb
```

### Windows

Download MongoDB Community Edition:

https://www.mongodb.com/try/download/community

Or run using Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

Verify:

```bash
mongosh --eval "db.adminCommand('ping')"
```

Expected Output

```json
{ "ok": 1 }
```

---

## 3. Groq API Key

Create a free Groq account and generate an API key.

Store it inside your `.env` file.

---

# ⚙️ Setup Guide

## Step 1 — Extract the Project

```bash
unzip nexta_v2.zip
cd nexta2
```

---

## Step 2 — Configure Backend

```bash
cd backend
cp .env.example .env
```

Update the `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexta

JWT_SECRET=your_jwt_secret

NODE_ENV=development

FRONTEND_URL=http://localhost:3000

GROQ_API_KEY=your_groq_api_key

GROQ_MODEL=llama-3.3-70b-versatile
```

---

## Step 3 — Install Backend Dependencies

```bash
cd backend
npm install
```

---

## Step 4 — Seed the Database

```bash
npm run seed
```

Expected output:

```text
[Seed] Created demo@nexta.ai / demo1234
```

---

## Step 5 — Start Backend

```bash
npm run dev
```

Expected output:

```text
[DB] MongoDB connected
[Server] http://localhost:5000
```

---

## Step 6 — Install and Start Frontend

```bash
cd frontend

npm install

npm start
```

Frontend runs at:

```
http://localhost:3000
```

---

## Step 7 — Run Your First Analysis

1. Open http://localhost:3000
2. Login using the demo credentials
3. Select a business domain
4. Click **Load Sample**
5. Click **⚡ Run Agent Pipeline**
6. Watch all seven AI agents stream their reasoning live.
7. Review and approve or dismiss recommendations.
8. Ask follow-up questions to individual agents.

---

# 🛠 Troubleshooting

## Invalid Groq API Key

Verify that your `.env` contains:

```env
GROQ_API_KEY=your_api_key
```

Restart the backend after updating the key.

---

## Cannot Connect to MongoDB

### macOS

```bash
brew services restart mongodb-community
```

### Linux

```bash
sudo systemctl restart mongod
```

Verify:

```bash
mongosh --eval "db.adminCommand('ping')"
```

---

## Port 5000 Already in Use

### macOS / Linux

```bash
lsof -ti:5000 | xargs kill -9
```

### Windows

```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## npm Install Fails

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

For Windows:

```cmd
rmdir /s node_modules
del package-lock.json
npm install
```

---

## Groq Rate Limit Exceeded

If you exceed the request limit, wait a few moments before retrying or check your Groq account limits.

---

# 🏗️ System Architecture

```text
                    Browser (React + Zustand)
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
      REST API (Axios)                  Socket.IO
          │                                     │
          └──────────────────┬──────────────────┘
                             │
                      Express Backend
                             │
                      AI Orchestrator
                             │
      ┌──────────────────────────────────────────────┐
      │ 📝 Planner Agent                             │
      │ 📥 Ingestion Agent                           │
      │ 🧠 Knowledge Agent                           │
      │ 🔍 Analysis Agent                            │
      │ 🎯 Recommendation Agent                      │
      │ 💡 Explainer Agent                           │
      │ 💾 Memory Agent                              │
      └──────────────────────────────────────────────┘
                             │
                             ▼
                    Groq LLM Inference API
                             │
                             ▼
                         MongoDB Database
              Users • Analyses • Memory • Logs
```

---

# 🔌 Socket Events

| Event               | Direction       | Payload                                          |
| ------------------- | --------------- | ------------------------------------------------ |
| `join:session`      | Client → Server | `{ sessionId }`                                  |
| `agent:followup`    | Client → Server | `{ sessionId, userId, agentId, question }`       |
| `agent:start`       | Server → Client | `{ agent, agentName, icon, color, step, total }` |
| `agent:stream`      | Server → Client | `{ agent, token, done }`                         |
| `agent:complete`    | Server → Client | `{ agent, output, step, total }`                 |
| `agent:error`       | Server → Client | `{ agent, error }`                               |
| `pipeline:progress` | Server → Client | `{ step, total, percent, message }`              |
| `pipeline:complete` | Server → Client | `{ sessionId, elapsed, metrics }`                |
| `pipeline:error`    | Server → Client | `{ sessionId, error }`                           |

---

# 📡 API Reference

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Analysis

```http
POST /api/analysis/start
GET  /api/analysis/:sessionId
GET  /api/analysis/:sessionId/logs
PATCH /api/analysis/:sessionId/recommendations/:recId
POST /api/analysis/:sessionId/rerun/:agentId
```

## History

```http
GET /api/history
GET /api/history/memory
DELETE /api/history/:sessionId
```

## Utility

```http
GET /api/domains
GET /api/domains/samples
GET /api/health
```

---

# 👤 Demo Credentials

```text
Email    : demo@nexta.ai
Password : demo1234
```

---

# 🚀 Tech Stack

* **Frontend:** React, Zustand, Axios, Socket.IO Client
* **Backend:** Node.js, Express.js, Socket.IO
* **AI:** Groq API (Llama Models)
* **Database:** MongoDB
* **Authentication:** JWT
* **State Management:** Zustand

---

# 📄 License

This project was developed as part of a hackathon and is intended for educational and demonstration purposes.
