# MyAI V2 Streaming — Groq + GitHub Codespaces

A minimal Next.js frontend + FastAPI backend demonstrating token-by-token streaming from Groq using Server-Sent Events (SSE).

## Requirements
- A GitHub account and GitHub Codespaces
- A Groq API key: https://console.groq.com/keys
- A Groq model currently enabled for your account. Check https://console.groq.com/docs/models

## 1. Upload this project to GitHub
1. Create a new GitHub repository, or upload these files into a folder in an existing repository.
2. Open the repository in GitHub.
3. Select **Code → Codespaces → Create codespace on main**.

## 2. Configure the Groq key
In the Codespace, open **Terminal → New Terminal** and go to the project root.

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set your key and a model currently available to your Groq account:

```env
GROQ_API_KEY=gsk_your_real_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Do not commit `backend/.env`. It is excluded by `.gitignore`.

Alternatively, add `GROQ_API_KEY` and `GROQ_MODEL` under GitHub repository **Settings → Secrets and variables → Codespaces**, then restart the Codespace. Codespaces secrets are injected as environment variables; the backend reads them automatically.

## 3. Start the backend
In terminal 1:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

In the Codespaces **Ports** tab, make port **8000** visible to the frontend. For this simple demo, set it to **Public** if the browser cannot reach it otherwise. Only do this for a demo backend; do not expose sensitive services.

Test:
- `https://YOUR-CODESPACE-8000.app.github.dev/`
- `https://YOUR-CODESPACE-8000.app.github.dev/docs`

## 4. Start the frontend
Open terminal 2 at the project root:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` and set the forwarded backend URL shown in the Ports tab:

```env
NEXT_PUBLIC_BACKEND_URL=https://YOUR-CODESPACE-8000.app.github.dev
```

Then run:

```bash
npm run dev
```

In the Ports tab, open port **3000**. The app is ready to test.

If you change `.env.local`, restart the Next.js dev server. If you add Codespaces secrets after the Codespace was created, restart the Codespace so they are injected.

## 5. Try it
Ask a question in the chat box. Text should appear progressively as Groq streams it.

## Troubleshooting
- **401 Unauthorized:** create a fresh Groq key and verify `GROQ_API_KEY` is available in the backend terminal. Never paste the key into frontend code.
- **Model not found / decommissioned:** select a currently supported model from https://console.groq.com/docs/models and update `GROQ_MODEL`.
- **Failed to fetch:** confirm backend terminal is running, port 8000 is forwarded, frontend `.env.local` contains the exact backend forwarded URL, and CORS allows the frontend origin. Restart Next.js after editing `.env.local`.
- **422 Validation Error:** the API expects `{"messages":[{"role":"user","content":"..."}]}`.
- **SSE display issue:** this demo parses `data:` events and handles `delta`, `done`, and `error` messages.

## API contract
`POST /chat`

Request:
```json
{
  "messages": [
    {"role": "user", "content": "Explain containerization"}
  ]
}
```

Response: `text/event-stream`, with events:
- `{"type":"delta","text":"..."}`
- `{"type":"done"}`
- `{"type":"error","message":"..."}`

This is a teaching/demo starter, not a production deployment. Add authentication, request limits, and stricter CORS before exposing it publicly.
