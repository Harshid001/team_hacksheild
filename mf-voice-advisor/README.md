# MF Voice Advisor

A voice-first Mutual Fund Advisory Platform — a monorepo containing a React + Vite web app and an Express + TypeScript API with MongoDB, OpenAI, and Socket.io.

## Architecture

```
mf-voice-advisor/
├── apps/
│   ├── web/          # React + Vite + Tailwind frontend
│   └── api/          # Express + TypeScript + MongoDB API
└── packages/
    └── shared/       # Shared TypeScript types
```

## Tech Stack

### Frontend (`apps/web`)
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **React Router v6**, **React Router DOM v6**
- **React OAuth (Google)**, **Axios**, **Socket.io Client**
- **Recharts**, **Recharts**, **EventEmitter3**, **JWT Decode**

### Backend (`apps/api`)
- **Express 5** + **TypeScript** + **tsx**
- **MongoDB** + **Mongoose**
- **OpenAI** (GPT, Whisper STT), **Ollama** (local LLM)
- **Socket.io** (WebSocket), **Google Auth Library**, **JWT**, **bcrypt**
- **Socket.io**, **Cookie Parser**, **CORS**, **dotenv**

### Shared (`packages/shared`)
- Shared TypeScript types between web and API

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- OpenAI API key (for GPT + Whisper)
- Google OAuth credentials (optional, for Google OAuth)
- Ollama (optional, for local LLM)

### Install Dependencies
```bash
npm install
```

### Environment Variables

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

### Development

**Start both apps concurrently (from root):**
```bash
# Terminal 1 - API
cd apps/api && npm run dev

# Terminal 2 - Web
cd apps/web && npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

### Build
```bash
# Build web app
npm run build
```

## Project Structure

### `apps/web` — Frontend
```
src/
├── components/       # Reusable UI components
│   ├── AuthModal.tsx
│   ├── ConversationBubble.tsx
│   ├── DisclaimerBanner.tsx
│   ├── ListeningIndicator.tsx
│   ├── ProfileDropdown.tsx
│   ├── ProfileModal.tsx
│   ├── QuickReplies.tsx
│   ├── ReportCard.tsx
│   ├── SettingsModal.tsx
│   ├── SipCalculatorWidget.tsx
│   ├── StageLabel.tsx
│   └── TextFallback.tsx
├── context/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── pages/
│   ├── ConversationPage.tsx
│   ├── DemoPage.tsx
│   ├── DisclaimerPage.tsx
│   ├── LandingPage.tsx
│   ├── OAuthCallback.tsx
│   ├── ReportPage.tsx
│   └── SignupPage.tsx
├── router.tsx
├── App.tsx
└── main.tsx
```

**Key Features:**
- Voice-first conversation UI with real-time streaming
- Google OAuth + JWT auth flow
- Conversation stages with visual stage indicators
- SIP Calculator widget
- Investment report generation & PDF export
- Dark/Light theme with persistence
- Responsive Tailwind UI with Framer Motion animations

### `apps/api` — Backend
```
src/
├── config/
│   └── fundList.ts
├── db/
│   ├── connection.ts
│   └── models/
│       ├── Answer.model.ts
│       ├── ChatMessage.model.ts
│       ├── ConversationSession.model.ts
│       ├── FinancialProfile.model.ts
│       ├── FundMetrics.model.ts
│       ├── RefreshToken.model.ts
│       ├── Report.model.ts
│       └── User.model.ts
├── middleware/
│   └── auth.middleware.ts
├── routes/
│   ├── analytics.route.ts
│   ├── auth.route.ts
│   ├── chat.route.ts
│   ├── profile.route.ts
│   └── report.route.ts
├── services/
│   ├── analyticsClient.service.ts
│   ├── chat.service.ts
│   ├── ollama.service.ts
│   ├── profile.service.ts
│   ├── reportComposer.service.ts
│   └── stt.service.ts
└── index.ts
```

**API Routes:**
| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Email/password register |
| `POST /api/auth/login` | Email/password login |
| `POST /api/auth/google` | Google OAuth |
| `POST /api/auth/refresh` | Refresh access token |
| `POST /api/auth/logout` | Logout + revoke refresh token |
| `GET /api/profile` | Get user profile |
| `PUT /api/profile` | Update financial profile |
| `POST /api/chat/start` | Start conversation session |
| `POST /api/chat/message` | Send message (text/voice) |
| `POST /api/chat/voice` | Upload voice → STT → LLM response |
| `GET /api/chat/sessions` | List conversation sessions |
| `GET /api/report/:sessionId` | Generate investment report |
| `GET /api/analytics` | Analytics dashboard data |

**WebSocket Events (Socket.io):**
- `chat:message` — Real-time chat streaming
- `chat:typing` — Typing indicator
- `voice:stream` — Real-time voice streaming

### `packages/shared`
```
src/
├── types/
│   ├── api.ts
│   ├── chat.ts
│   ├── profile.ts
│   └── report.ts
└── index.ts
```

## Available Scripts

### Root
```bash
npm run build          # Build web app
```

### `apps/web`
```bash
npm run dev      # Vite dev server
npm run build    # TypeScript + Vite build
npm run preview  # Preview production build
```

### `apps/api`
```bash
npm run dev      # tsx watch mode
npm run start    # tsx production run
```

## Environment Setup Details

### MongoDB
- Local: `mongodb://localhost:27017/mf-voice-advisor`
- Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/mf-voice-advisor`

### OpenAI
- Get API key from https://platform.openai.com/api-keys
- Used for: GPT-4o (chat), Whisper (STT)

### Google OAuth
1. Create project at https://console.cloud.google.com
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:5173/oauth-callback`

### Ollama (Optional)
```bash
ollama pull llama3
ollama serve
```

## Project Scripts

### Development Workflow
```bash
# 1. Start MongoDB
mongod

# 2. Start Ollama (optional)
ollama serve

# 3. Start API
cd apps/api && npm run dev

# 4. Start Web
cd apps/web && npm run dev
```

### Production Build
```bash
cd apps/web && npm run build
# Deploy dist/ to Vercel/Netlify/Cloudflare Pages

cd apps/api && npm run start
# Deploy to Railway/Render/Fly.io with MongoDB Atlas
```

## API Contracts
See [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) for detailed request/response schemas.

## Project Documentation
See [docs/MASTER_DOC.md](docs/MASTER_DOC.md) for architecture decisions and product specs.

## License
MIT — HackShield Team