# Team HackShield - MF Voice Advisor

Welcome to the Team HackShield repository! This project features a voice-first Mutual Fund Advisory Platform.

## Project Structure

This repository contains the following main components:

- **`mf-voice-advisor/`**: The core application monorepo containing a React + Vite web app and an Express + TypeScript API (with MongoDB, OpenAI, and Socket.io).
- **`start_ollama_tunnel.bat`**: A script to start an Ngrok tunnel with a permanent static domain for exposing the local Ollama LLM to external services (like Vercel).
- **`run_hidden_tunnel.vbs`**: A VBScript to run the Ollama Ngrok tunnel in the background without keeping a command prompt window open.

## Core Application: MF Voice Advisor

The main application resides in the `mf-voice-advisor` directory. Here is a quick overview of its tech stack and setup.

### Architecture

```text
team_hacksheild/
├── mf-voice-advisor/
│   ├── apps/
│   │   ├── web/          # React + Vite + Tailwind frontend
│   │   └── api/          # Express + TypeScript + MongoDB API
│   └── packages/
│       └── shared/       # Shared TypeScript types
├── start_ollama_tunnel.bat
└── run_hidden_tunnel.vbs
```

### Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Express 5, TypeScript, MongoDB, OpenAI, Ollama, Socket.io
- **Monorepo Management**: npm workspaces

### Quick Start

1. **Install Dependencies**
   Navigate to the core application folder and install dependencies:
   ```bash
   cd mf-voice-advisor
   npm install
   ```

2. **Environment Variables**
   Ensure you have `.env` files set up in both `apps/api` and `apps/web`. Example variables:
   - `apps/api/.env`: `PORT`, `MONGODB_URI`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL` (points to the Ngrok tunnel if deployed), etc.
   - `apps/web/.env`: `VITE_API_URL`, `VITE_SOCKET_URL`, etc.

3. **Start the Tunnel (Optional)**
   If you are running Ollama locally and want to expose it to the backend running elsewhere, start the tunnel from the root directory:
   ```cmd
   # Run visibly:
   start_ollama_tunnel.bat
   
   # Or run hidden in background:
   cscript run_hidden_tunnel.vbs
   ```

4. **Development**
   Start both apps concurrently from `mf-voice-advisor`:
   ```bash
   # Terminal 1 - API
   cd mf-voice-advisor/apps/api && npm run dev
   
   # Terminal 2 - Web
   cd mf-voice-advisor/apps/web && npm run dev
   ```

## More Information
For detailed API contracts, WebSocket events, and project documentation, please refer to the detailed `README.md` inside the `mf-voice-advisor/` directory.

## License
MIT — HackShield Team
