import json
import os
from typing import List, Literal

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

app = FastAPI(title="MyAI V2 - Groq Streaming")

# Demo-friendly CORS. Restrict allow_origins to your Codespaces frontend URL
# before using this outside a temporary demonstration.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


SYSTEM_INSTRUCTIONS = """
You are MyAI, a helpful and intelligent AI assistant.
Give clear, accurate and useful answers. Use Markdown when appropriate.
For technical questions, explain step by step and provide practical examples.
When asked for code, provide complete working examples.
Do not claim to have performed actions you did not perform.
"""


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "MyAI V2 Groq streaming backend is running",
        "model": MODEL,
    }


@app.get("/health")
def health():
    return {"status": "healthy", "api_key_configured": bool(API_KEY)}


@app.post("/chat")
async def chat(request: ChatRequest):
    if not API_KEY:
        def missing_key():
            payload = {
                "type": "error",
                "message": "GROQ_API_KEY is missing. Configure backend/.env or Codespaces Secrets.",
            }
            yield f"data: {json.dumps(payload)}\n\n"

        return StreamingResponse(missing_key(), media_type="text/event-stream")

    conversation = [{"role": "system", "content": SYSTEM_INSTRUCTIONS}]
    conversation.extend(
        {"role": item.role, "content": item.content}
        for item in request.messages
    )

    def generate():
        try:
            client = OpenAI(
                api_key=API_KEY,
                base_url="https://api.groq.com/openai/v1",
            )
            stream = client.chat.completions.create(
                model=MODEL,
                messages=conversation,
                stream=True,
            )

            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                content = delta.content
                if content:
                    payload = {"type": "delta", "text": content}
                    yield f"data: {json.dumps(payload)}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as exc:
            payload = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
