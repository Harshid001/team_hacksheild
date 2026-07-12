# 🎙️ MF Voice Advisor

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
</p>

A **voice-first Mutual Fund Advisory Platform**. This monorepo contains a React + Vite web application and an Express + TypeScript API, powered by MongoDB, OpenAI (GPT & Whisper), and Socket.io for real-time interactions.

---

## 🏗️ Architecture

```text
mf-voice-advisor/
├── apps/
│   ├── web/          # React + Vite + Tailwind frontend
│   └── api/          # Express + TypeScript + MongoDB API
└── packages/
    └── shared/       # Shared TypeScript types
```

## 💻 Tech Stack

### Frontend (`apps/web`)
- **Core**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Routing & State**: React Router v6, Context API
- **Utilities**: React OAuth (Google), Axios, Socket.io Client, Recharts, EventEmitter3, JWT Decode

### Backend (`apps/api`)
- **Core**: Express 5, TypeScript, tsx
- **Database**: MongoDB, Mongoose
- **AI/ML**: OpenAI (GPT-4o, Whisper STT), Ollama (local LLM fallback)
- **Real-time & Auth**: Socket.io, Google Auth Library, JWT, bcrypt
- **Utilities**: Cookie Parser, CORS, dotenv

### Shared (`packages/shared`)
- **Types**: Shared TypeScript interfaces/types between web and API

---

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js**: v20+
- **Database**: MongoDB (local or Atlas)
- **AI Keys**: OpenAI API key (for GPT + Whisper)
- **Authentication**: Google OAuth credentials (optional, for Google login)
- **Local AI**: Ollama (optional, for local LLM)

### 📦 Install Dependencies
```bash
npm install
```

### ⚙️ Environment Variables

Create `.env` files in both `apps/api` and `apps/web`.

**`apps/api/.env`**
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/mf-voice-advisor
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
CLIENT_URL=http://localhost:5173
```

**`apps/web/.env`**
```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_SOCKET_URL=http://localhost:4000
```

### 🏃‍♂️ Development

Start both apps concurrently from the root of `mf-voice-advisor`:
```bash
# Terminal 1 - API
cd apps/api && npm run dev

# Terminal 2 - Web
cd apps/web && npm run dev
```
- **API**: http://localhost:4000
- **Web**: http://localhost:5173

---

## 📂 Project Structure

### `apps/web` — Frontend
```text
src/
├── components/       # Reusable UI components (Auth, Chat Bubbles, SIP Calculator)
├── context/          # Auth and Theme Contexts
├── pages/            # App Routes (Landing, Conversation, Report, Demo)
├── router.tsx        # React Router Configuration
├── App.tsx
└── main.tsx
```
**Key Features:**
- 🎙️ Voice-first conversation UI with real-time streaming
- 🔐 Google OAuth + JWT auth flow
- 📊 SIP Calculator widget & Investment report generation (PDF export)
- 🌓 Dark/Light theme with persistence
- 💅 Responsive Tailwind UI with Framer Motion animations

### `apps/api` — Backend
```text
src/
├── config/           # Configuration & Constants (e.g., fund lists)
├── db/               # Database connection and Mongoose Models
├── middleware/       # Express middlewares (Auth, Error handling)
├── routes/           # API endpoints (Auth, Chat, Profile, Report)
├── services/         # Business logic (AI Clients, STT, Report Composer)
└── index.ts          # Entry point
```

**Key API Routes:**
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/google` | POST | Google OAuth Login/Registration |
| `/api/profile` | GET/PUT | Manage user financial profile |
| `/api/chat/start` | POST | Start a new conversation session |
| `/api/chat/message`| POST | Send a text/voice message |
| `/api/report/:id` | GET | Generate an investment report |

**WebSocket Events (Socket.io):**
- `chat:message` — Real-time chat text streaming
- `chat:typing` — Typing/Processing indicator
- `voice:stream` — Real-time voice audio streaming

---

## 📜 Available Scripts

### Root
```bash
npm run build          # Build both apps
```

### `apps/web`
```bash
npm run dev      # Vite dev server
npm run build    # TypeScript + Vite build
npm run preview  # Preview production build
```

### `apps/api`
```bash
npm run dev      # tsx watch mode for development
npm run start    # run compiled production build
```

---

## 🌍 Environment Setup Details

### MongoDB
- **Local**: `mongodb://localhost:27017/mf-voice-advisor`
- **Atlas**: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/mf-voice-advisor`

### AI & API Services
- **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Google OAuth**: Set up in [Google Cloud Console](https://console.cloud.google.com) (Redirect URI: `http://localhost:5173/oauth-callback`)
- **Ollama**: 
  ```bash
  ollama pull llama3
  ollama serve
  ```

---

## 📚 Documentation
- **API Contracts**: See [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) for detailed request/response schemas.
- **Master Doc**: See [docs/MASTER_DOC.md](docs/MASTER_DOC.md) for architecture decisions and product specs.

## 📄 License
MIT — HackShield Team