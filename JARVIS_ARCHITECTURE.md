# 🤖 J.A.R.V.I.S. — Architecture & Setup Guide

## What You're Building
A cross-platform personal AI assistant with:
- 🎙 Voice commands (speak naturally, Jarvis responds)
- 📷 Camera vision (ask "what am I holding?" and get 90%+ accuracy)
- 📁 File access (read, write, search your files)
- 🌐 Web search (real-time answers)
- 🧠 Claude as the intelligent brain/orchestrator

---

## Full Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Brain** | Claude claude-sonnet-4 (Anthropic) | Reasoning, vision analysis, orchestration |
| **STT** | OpenAI Whisper | Voice → Text (best accuracy available) |
| **TTS** | ElevenLabs Turbo v2 | Text → Natural voice output |
| **Vision** | Claude Vision API + OpenCV | Camera frame analysis |
| **Web Search** | Google Cloud Custom Search API | Real-time web answers |
| **Backend** | Python FastAPI | Ties all AI services together |
| **Web UI** | React (jarvis-ui.jsx) | Browser interface |
| **Mac App** | Electron wrapping the React UI | Native Mac desktop app |
| **Mobile** | React Native (Expo) | iOS & Android app |
| **Memory** | ChromaDB (vector DB) | Long-term context & recall |

---

## API Keys You Need (All Free Tiers Available)
1. **Anthropic** — https://console.anthropic.com → for Claude (brain + vision)
2. **OpenAI** — https://platform.openai.com → for Whisper (STT)
3. **ElevenLabs** — https://elevenlabs.io → for voice output
4. **Google Cloud console** — https://console.cloud.google.com → for web search (Custom Search API)

---

## Setup in 5 Steps

### 1. Clone & Install
```bash
mkdir jarvis && cd jarvis
pip install fastapi uvicorn anthropic openai elevenlabs \
            opencv-python python-multipart pillow \
            chromadb requests python-dotenv SpeechRecognition pyaudio
```

### 2. Create .env
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
GOOGLE_API_KEY=AIza...
GOOGLE_CX=...
FILES_ROOT=/Users/yourname/Documents/JarvisFiles
```

### 3. Run the Backend
```bash
python jarvis_backend.py
# → Running at http://localhost:8000
```

### 4. Run the Web UI
Put `jarvis-ui.jsx` in a React project:
```bash
npx create-react-app jarvis-web && cd jarvis-web
# Replace src/App.js content with the jarvis-ui.jsx component
npm start
```

### 5. Test It
```bash
# Health check
curl http://localhost:8000/health

# Send a chat message
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?", "include_camera": false}'

# Ask about what camera sees
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What am I holding?", "include_camera": true}'
```

---

## API Endpoints Summary

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | `/chat` | Main chat (text + optional camera) |
| POST | `/pipeline/full` | Full pipeline: audio → STT → Claude → TTS URL |
| GET | `/camera/snapshot` | Capture camera frame |
| POST | `/voice/transcribe` | Audio file → text (Whisper) |
| POST | `/voice/speak` | Text → speech audio (ElevenLabs) |
| GET | `/files/list` | List files in allowed directory |
| GET | `/files/read` | Read a file |
| POST | `/files/write` | Write/create a file |
| GET | `/search?query=...` | Web search via Google Custom Search API |
| DELETE | `/chat/clear` | Reset conversation |

---

## Platform Deployment

### Mac Desktop App (Electron)
```bash
npm install -g electron
# Create main.js that loads your React app
# electron-builder to package as .app
```

### Mobile App (React Native + Expo)
```bash
npx create-expo-app JarvisMobile
# Use expo-camera for camera access
# Use expo-av for audio recording
# Connect to your FastAPI backend URL
```

### Web Browser
- Just run the React UI and point it at the FastAPI backend
- Works on any device with a browser

---

## Vision Accuracy Tips (Getting to 90%+)

1. **Good lighting** — Claude Vision performs best in well-lit environments
2. **Hold objects clearly** — center in frame, minimal background clutter
3. **Use the right prompt** — "Analyze this image in detail. What object is the person holding? What brand/model if identifiable? Confidence %?"
4. **Multiple frames** — capture 3 frames and average Claude's analysis

---

## Adding Long-Term Memory (ChromaDB)
```python
import chromadb
client = chromadb.Client()
collection = client.create_collection("jarvis_memory")

# Save a memory
collection.add(documents=["User prefers dark mode"], ids=["pref_1"])

# Recall relevant memories before each chat
results = collection.query(query_texts=["user preferences"], n_results=3)
# Inject into Claude's system prompt
```

---

## Roadmap / What to Build Next
- [ ] Wake word detection ("Hey Jarvis") using Porcupine
- [ ] Smart home integration (Home Assistant API)
- [ ] Calendar & email access (Google APIs)
- [ ] Code execution (run scripts on command)
- [ ] Face recognition (recognize who Jarvis is talking to)
- [ ] Proactive alerts (Jarvis initiates based on events)
