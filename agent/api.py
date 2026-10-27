"""FastAPI wrapper the CRM calls:  POST http://127.0.0.1:8000/chat
Run:  uvicorn api:app --host 127.0.0.1 --port 8000
"""
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from main import agent

app = FastAPI(title="Srikara CRM Agent")


class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None


def _text(content) -> str:
    """Groq normally returns a string, but be safe if it is a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    return str(content)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
def chat(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    try:
        result = agent.invoke({"messages": [{"role": "user", "content": request.message}]}, config=config)
    except Exception as e:  # Groq rate limit, tool-call format error, etc.
        raise HTTPException(status_code=502, detail=f"Agent error: {e.__class__.__name__}: {e}")
    return {"thread_id": thread_id, "answer": _text(result["messages"][-1].content)}
