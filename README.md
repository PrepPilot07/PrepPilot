<div align="center">
  <div style="background-color: #059669; color: white; width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 16px;">
  
  </div>
  <h1 align="center">PrepPilot</h1>
  <p align="center">
    <strong>An AI-powered interview coach that builds personalized roadmaps and tests your readiness.</strong>
  </p>
</div>

---

## 🎯 The Problem

Most interview prep fails—not because resources are scarce, but because **consistency is hard to maintain alone**. People binge LeetCode for a weekend, then go cold for two weeks. When the actual interview arrives, the preparation is stale and the confidence is hollow.

PrepPilot fixes the consistency problem by generating a highly personalized, day-by-day roadmap tailored exactly to your resume and target job description.

---

## ✨ What PrepPilot Does

1. **Upload & Analyze:** You upload your resume and paste the job description you're targeting.
2. **Multi-Agent Evaluation:** A swarm of AI agents (Skills, Experience, Education, Culture Fit) running on **Google Gemini 3.1 Flash Lite** analyze your profile in parallel.
3. **Personalized Roadmap:** PrepPilot builds a 15-day roadmap identifying your exact skill gaps.
4. **Daily Practice:** Every day, you receive targeted interview questions to tackle.
5. **Real-time Tracking:** Your dashboard tracks a **Readiness Score** that moves as you actually practice.

---

## 🛠️ Tech Stack

PrepPilot is built using a modern, scalable, microservice-inspired architecture.

| Layer | Technology |
|---|---|
| **Frontend UI** | React + Vite + Tailwind CSS |
| **Backend API** | Node.js + Express + TypeScript |
| **AI Engine** | Python + FastAPI + LangChain + Google Gemini |
| **Database** | PostgreSQL |

---

## 🚀 Running Locally

You will need to run three separate servers concurrently: the Node backend, the Python AI API, and the Vite frontend.

### 1. Database Setup

Ensure you have a PostgreSQL database running. You can use a local instance or a managed service like Supabase/Neon.

### 2. Node Backend Setup

```bash
cd backend
cp ../.env.example .env
```

Edit the `.env` file in the `backend` folder:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A random secret (e.g., run `openssl rand -base64 32`).

Install dependencies and run migrations:
```bash
npm install
npm run migrate             # Initial schema
npm run migrate:name        # Add name column
npm run migrate:responses   # Add responses table
```

Start the backend server (runs on port 3000):
```bash
npm run dev
```

### 3. Python AI Engine Setup

In a **second terminal window**:

```bash
cd python-api
python -m venv venv
```

Activate the virtual environment:
- Windows: `.\venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

Install dependencies and start the FastAPI server:
```bash
pip install -r requirements.txt
python -m uvicorn api_server:app --port 8001 --reload
```
*(Ensure you have your `GEMINI_API_KEY` set in your `.env` or system environment).*

### 4. Frontend Setup

In a **third terminal window**:

```bash
cd frontend
npm install
npm run dev
```
Your application will now be running at `http://localhost:5173`.

---

## 📂 Repository Structure

```text
prep-pilot/
├── backend/            # Node + Express + TypeScript API (Auth, DB, User Routes)
├── frontend/           # React + Vite + Tailwind app (UI, Dashboard, Settings)
├── python-api/         # FastAPI + LangChain engine (Multi-agent AI analysis)
├── docs/               # Architecture and legacy documentation
└── seed/               # Sample data scripts
```

---

## 👥 Team

Built with ☕ and late nights for the hackathon by:
- **Srijan** — Backend, database design, authentication, deployment
- **Ranith** — AI layer (Python FastAPI), resume/JD parsing, gap analysis
- **Geetesh** — Frontend, UI/UX, responsive design

> [!NOTE]
> PrepPilot is actively under development. This repository represents the completed integration of the Node Backend, React Frontend, and Python AI microservice.
