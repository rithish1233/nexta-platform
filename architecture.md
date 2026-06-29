# NextA — System Architecture

**Intelligent Next Best Action Platform**  
7 Real AI Agents · Groq API (llama3-70b) · MERN Stack · Socket.IO Streaming

---

## Overview

NextA is a pipeline-driven AI platform that converts raw sales inputs (meeting notes, emails, call transcripts) into actionable recommendations. A human-in-the-loop (HITL) layer lets reps approve or reject each suggestion before it reaches a workflow.

---

## Actors

| Role | Responsibility |
|---|---|
| Sales Rep / Analyst / CS Manager | Pastes input → reviews recommendations → approves / rejects |

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | React 18 · Zustand · Socket.IO Client |
| Backend | Node.js · Express · Socket.IO Server |
| AI Pipeline | `orchestror.js` · Groq API (`llama3-70b-8192`) |
| Database | MongoDB · Mongoose |
| External AI | Groq Cloud — free tier (~10 tok/s) |

---

## Frontend

**React 18 + Zustand + Socket.IO Client**

| View | Purpose |
|---|---|
| Dashboard | Input panel + live streaming output |
| Workspace | Results display + HITL approve / reject |
| History | Past analyses |
| Auth | Login / Register |

---

## Backend

**Node.js + Express + Socket.IO Server**

| Component | Role |
|---|---|
| Routes | `auth` / `analysis` / `domain` |
| Socket.IO Server | Real-time event broadcasting |
| JWT Middleware | Route protection |
| Orchestrator | Pipeline orchestration (`orchestror.js`) |
| Models | User · Analysis · Memory · AgentLog |

---

## AI Pipeline

**`orchestror.js` — 7 sequential agents, all calling `llama3-70b-8192` via Groq SDK**

| # | Agent | Token Budget |
|---|---|---|
| 1 | Planner | 250 |
| 2 | Ingestion | 500 |
| 3 | Knowledge | 450 |
| 4 | Analysis | 700 |
| 5 | Recs (Recommendations) | 700 |
| 6 | Explainer | 550 |
| 7 | Memory | 350 |

Each agent streams its output back to the client via Socket.IO as tokens arrive.

---

## Database

**MongoDB + Mongoose**

| Collection | Purpose |
|---|---|
| `Users` | JWT auth accounts |
| `Analysis` | Full pipeline results + per-agent outputs |
| `Memory` | Learnings scoped to company / domain |
| `AgentLog` | Per-run execution logs |

---

## External Services

| Service | Usage |
|---|---|
| **Groq Cloud** (`console.groq.com`) | `llama3-70b-8192` inference · free tier |
| **MongoDB Atlas** (`mongodb.com`) | Optional cloud DB (local MongoDB also supported) |

---

## Data Flow

```
User Input
    │
    ▼ HTTP / WebSocket (REST + Socket.IO)
Backend (Express + Socket.IO Server)
    │
    ▼ orchestror.js
AI Pipeline ──► Groq API (streaming)
    │                │
    │                └──► Socket.IO stream ──► Frontend (live tokens)
    │
    ▼ Mongoose
MongoDB
    ├── Analysis result written
    ├── Memory updated (per company / domain)
    └── AgentLog persisted
```

**Legend**

- `───` Data flow
- `►` Groq API call (streaming)
- `- -` Socket stream to client
- `~~~` DB write / memory store

---

## Key Design Decisions

- **Streaming first** — Groq SDK streams tokens; Socket.IO relays them to the UI in real time, keeping perceived latency low.
- **Agent token caps** — Each of the 7 agents has a hard token budget to control cost and latency on the free Groq tier.
- **HITL gate** — Recommendations surface in the Workspace view before any action is taken; the user must explicitly approve or reject.
- **Domain-scoped memory** — The Memory collection stores learnings per company/domain, allowing the pipeline to personalise over time without cross-tenant bleed.
- **JWT auth** — All backend routes are protected by middleware; tokens are stored in the `Users` collection.
