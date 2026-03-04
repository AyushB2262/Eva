"""
╔══════════════════════════════════════════════════════════════════╗
║              J.A.R.V.I.S. — Personal AI Backend                 ║
║  Stack: FastAPI · Claude · Whisper · ElevenLabs · OpenCV        ║
╚══════════════════════════════════════════════════════════════════╝

SETUP:
  pip install fastapi uvicorn google-genai openai elevenlabs opencv-python
              python-multipart pillow chromadb watchdog SpeechRecognition
              pyaudio requests python-dotenv

  Create a .env file:
    GEMINI_API_KEY=your_key
    OPENAI_API_KEY=your_key         # for Whisper STT
    ELEVENLABS_API_KEY=your_key     # for TTS
    GOOGLE_API_KEY=your_key         # for web search (optional)
    GOOGLE_CX=your_cx               # for custom search engine (optional)
    FILES_ROOT=/Users/yourname/JarvisFiles   # folder to give Jarvis access to

RUN:
  uvicorn jarvis_backend:app --reload --port 8000
"""

import os, base64, json, asyncio, datetime, pathlib, shutil
from typing import Optional
from io import BytesIO
from dotenv import load_dotenv

from google import genai
from google.genai import types
import openai
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

# ─── Config ──────────────────────────────────────────────────────────────────
GEMINI_KEY      = os.getenv("GEMINI_API_KEY")
OPENAI_KEY      = os.getenv("OPENAI_API_KEY")
ELEVENLABS_KEY  = os.getenv("ELEVENLABS_API_KEY")
FILES_ROOT      = pathlib.Path(os.getenv("FILES_ROOT", "./jarvis_files"))
FILES_ROOT.mkdir(parents=True, exist_ok=True)

# google-genai automatically checks GOOGLE_API_KEY by default and crashes if it finds the custom search key.
# We explicitly pass our GEMINI_KEY, but we need to temporarily hide the other key from os.environ
_search_key = os.environ.get("GOOGLE_API_KEY")
if "GOOGLE_API_KEY" in os.environ:
    del os.environ["GOOGLE_API_KEY"]
    
gemini_client = genai.Client(api_key=GEMINI_KEY)

if _search_key:
    os.environ["GOOGLE_API_KEY"] = _search_key

openai_client    = openai.OpenAI(api_key=OPENAI_KEY)

JARVIS_SYSTEM = """
You are J.A.R.V.I.S. — a sophisticated, witty AI assistant.
Your personality: Precise, dry wit, slightly formal, intensely competent.
You have real-time access to: the user's camera, their files, and the web.
When analyzing images: always give a confidence percentage.
When uncertain: say so directly. Never hallucinate facts.
Keep responses concise unless asked for detail.
""".strip()

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="J.A.R.V.I.S. Backend", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

conversation_history = []   # In-memory conversation (replace with DB for persistence)

# ─── Models ──────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    include_camera: bool = False

class FileRequest(BaseModel):
    path: str

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel — change to any ElevenLabs voice

# ─── VISION: Camera Capture ───────────────────────────────────────────────────
def capture_camera_frame() -> Optional[str]:
    """Capture a frame from the default camera. Returns base64 JPEG."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return None
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return None
    _, buffer = cv2.imencode(".jpg", frame)
    return base64.b64encode(buffer).decode("utf-8")

@app.get("/camera/snapshot")
def camera_snapshot():
    b64 = capture_camera_frame()
    if not b64:
        raise HTTPException(503, "Camera not available")
    return {"image_base64": b64, "timestamp": datetime.datetime.now().isoformat()}

# ─── VOICE: Speech-to-Text (Whisper) ─────────────────────────────────────────
@app.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file using OpenAI Whisper."""
    audio_bytes = await file.read()
    transcript = openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.webm", BytesIO(audio_bytes), "audio/webm"),
    )
    return {"text": transcript.text}

# ─── VOICE: Text-to-Speech (ElevenLabs) ──────────────────────────────────────
@app.post("/voice/speak")
def text_to_speech(req: TTSRequest):
    """Convert text to speech using ElevenLabs and return audio stream."""
    import requests
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{req.voice_id}/stream"
    headers = {"xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json"}
    payload = {
        "text": req.text,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
    r = requests.post(url, headers=headers, json=payload, stream=True)
    if r.status_code != 200:
        raise HTTPException(r.status_code, "TTS failed")
    return StreamingResponse(r.iter_content(chunk_size=1024), media_type="audio/mpeg")

# ─── FILE SYSTEM ──────────────────────────────────────────────────────────────
def safe_path(relative: str) -> pathlib.Path:
    """Ensure path stays within FILES_ROOT (security)."""
    p = (FILES_ROOT / relative).resolve()
    if not str(p).startswith(str(FILES_ROOT.resolve())):
        raise HTTPException(403, "Access denied: path outside allowed directory")
    return p

@app.get("/files/list")
def list_files(subdir: str = ""):
    """List files and folders in the allowed directory."""
    target = safe_path(subdir)
    if not target.is_dir():
        raise HTTPException(404, "Directory not found")
    entries = []
    for item in sorted(target.iterdir()):
        entries.append({
            "name": item.name,
            "type": "dir" if item.is_dir() else "file",
            "size": item.stat().st_size if item.is_file() else None,
            "modified": datetime.datetime.fromtimestamp(item.stat().st_mtime).isoformat(),
            "path": str(item.relative_to(FILES_ROOT))
        })
    return {"entries": entries, "current": subdir or "/"}

@app.get("/files/read")
def read_file(path: str):
    """Read a text file."""
    p = safe_path(path)
    if not p.is_file():
        raise HTTPException(404, "File not found")
    try:
        return {"content": p.read_text(encoding="utf-8"), "path": path}
    except UnicodeDecodeError:
        raise HTTPException(400, "Binary files cannot be read as text")

@app.post("/files/write")
def write_file(path: str, content: str):
    """Write/overwrite a text file."""
    p = safe_path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return {"success": True, "path": path}

@app.delete("/files/delete")
def delete_file(path: str):
    """Delete a file."""
    p = safe_path(path)
    if p.is_file():
        p.unlink()
    elif p.is_dir():
        shutil.rmtree(p)
    else:
        raise HTTPException(404, "Not found")
    return {"success": True}

# ─── WEB SEARCH (via Google Cloud Custom Search API) ─────────────────────────
@app.get("/search")
def web_search(query: str):
    """Search the web using Google Cloud Custom Search API."""
    import requests
    key = os.getenv("GOOGLE_API_KEY")
    cx = os.getenv("GOOGLE_CX")
    if not key or not cx:
        return {"results": "Google Search API keys not configured. Add GOOGLE_API_KEY and GOOGLE_CX to .env"}
    
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": key,
        "cx": cx,
        "q": query
    }
    r = requests.get(url, params=params)
    data = r.json()
    
    if "items" not in data:
        return {"answer": "No results found or error occurred.", "citations": []}
    
    answer_parts = []
    citations = []
    for item in data["items"][:5]: # Take top 5 results
        answer_parts.append(f"{item.get('title', '')}: {item.get('snippet', '')}")
        citations.append(item.get('link', ''))
        
    return {
        "answer": "\\n\\n".join(answer_parts),
        "citations": citations
    }

# ─── BRAIN: Main Chat (Claude Orchestrator) ───────────────────────────────────
@app.post("/chat")
def chat(req: ChatRequest):
    """
    Main chat endpoint. Claude acts as orchestrator.
    If include_camera=True, a camera snapshot is attached for vision analysis.
    """
    global conversation_history

    # Build message content
    content = []

    # Attach camera image if requested
    if req.include_camera:
        b64 = capture_camera_frame()
        if b64:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}
            })

    content.append({"type": "text", "text": req.message})

    conversation_history.append({"role": "user", "content": content})

    # Keep last 20 turns to avoid token overflow
    history_window = conversation_history[-20:]

    # Format history window for Gemini API
    gemini_messages = []
    for m in history_window:
        role = "user" if m["role"] == "user" else "model"
        parts = []
        if isinstance(m["content"], list):
            for part in m["content"]:
                if part["type"] == "text":
                    if part["text"].strip():
                        parts.append(types.Part.from_text(text=part["text"]))
                elif part["type"] == "image":
                    parts.append(
                        types.Part.from_bytes(
                            data=base64.b64decode(part["source"]["data"]),
                            mime_type=part["source"]["media_type"]
                        )
                    )
        else:
            if m["content"].strip():
                parts.append(types.Part.from_text(text=m["content"]))
            
        if parts:
            gemini_messages.append(types.Content(role=role, parts=parts))

    if not gemini_messages:
      return {"reply": "I received an empty message, sir.", "tokens_used": 0, "timestamp": datetime.datetime.now().isoformat()}

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=gemini_messages,
            config=types.GenerateContentConfig(
                system_instruction=JARVIS_SYSTEM,
                max_output_tokens=1024,
                temperature=0.7
            ),
        )
        reply = response.text
    except Exception as e:
        reply = f"System Error: {str(e)}"
    conversation_history.append({"role": "assistant", "content": reply})

    return {
        "reply": reply,
        "tokens_used": 0, # Note: google-genai doesn't trivially expose this on the response object by default
        "timestamp": datetime.datetime.now().isoformat()
    }

# ─── FULL PIPELINE: Voice → Vision → Brain → Voice ───────────────────────────
@app.post("/pipeline/full")
async def full_pipeline(
    audio: UploadFile = File(...),
    include_camera: bool = False
):
    """
    Complete Jarvis pipeline:
    1. Transcribe voice input (Whisper)
    2. [Optional] Capture camera frame
    3. Send to Claude (with image if camera on)
    4. Return text reply + TTS audio URL
    """
    # Step 1: STT
    audio_bytes = await audio.read()
    transcript = openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.webm", BytesIO(audio_bytes), "audio/webm"),
    )
    text_input = transcript.text

    # Step 2 + 3: Vision + Chat
    chat_result = chat(ChatRequest(message=text_input, include_camera=include_camera))

    return {
        "transcription": text_input,
        "reply": chat_result["reply"],
        "speak_url": f"/voice/speak",   # POST this endpoint with the reply text
        "timestamp": chat_result["timestamp"]
    }

@app.delete("/chat/clear")
def clear_conversation():
    """Reset conversation history."""
    global conversation_history
    conversation_history = []
    return {"success": True}

@app.get("/health")
def health():
    return {
        "status": "online",
        "model": "gemini-2.5-flash",
        "files_root": str(FILES_ROOT),
        "capabilities": ["vision", "voice_stt", "voice_tts", "file_rw", "web_search", "memory"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
