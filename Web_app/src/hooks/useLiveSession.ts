import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../utils/audio';
import { rememberFact, recallFact, getPersonaPreferences } from '../utils/memory';
import { executeJavaScript } from '../utils/codeExecutor';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export function useLiveSession(
  connectedFiles: File[],
  screenVideoRef: RefObject<HTMLVideoElement | null>,
  cameraEnabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const screenIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const connectedFilesRef = useRef<File[]>(connectedFiles);
  const cameraEnabledRef = useRef<boolean>(cameraEnabled);

  useEffect(() => {
    connectedFilesRef.current = connectedFiles;
  }, [connectedFiles]);

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
  }, [cameraEnabled]);

  const connect = useCallback(async (videoElement: HTMLVideoElement) => {
    if (isConnected) return;

    audioRecorderRef.current = new AudioRecorder();
    audioPlayerRef.current = new AudioPlayer();
    videoRef.current = videoElement;
    canvasRef.current = document.createElement('canvas');
    screenCanvasRef.current = document.createElement('canvas');

    const handleToolCall = async (toolCall: any, session: any) => {
      const responses = [];
      for (const call of toolCall.functionCalls) {
        const { name, args, id } = call;
        let result: any = { error: "Unknown function" };

        if (name === 'listFiles') {
          const currentFiles = connectedFilesRef.current;
          if (currentFiles.length === 0) {
            result = { error: "No files connected. Ask the user to connect a folder first." };
          } else {
            try {
              const files = currentFiles.map(f => ({ name: f.webkitRelativePath || f.name, kind: 'file' }));
              result = { files };
            } catch (err: any) {
              result = { error: err.message };
            }
          }
        } else if (name === 'readFile') {
          const currentFiles = connectedFilesRef.current;
          if (currentFiles.length === 0) {
            result = { error: "No files connected. Ask the user to connect a folder first." };
          } else {
            try {
              // Try to find by exact path, or just by the base filename
              const fileDef = currentFiles.find(f => {
                const relativePath = f.webkitRelativePath || f.name;
                return relativePath === args.filename || 
                       f.name === args.filename || 
                       relativePath.endsWith(`/${args.filename}`);
              });

              if (!fileDef) {
                const availableFiles = currentFiles.map(f => f.webkitRelativePath || f.name).join(', ');
                result = { error: `File '${args.filename}' not found. Available files are: ${availableFiles}` };
              } else {
                const handle = (fileDef as any).handle;
                const freshFile = handle ? await handle.getFile() : fileDef;
                const ext = freshFile.name.split('.').pop()?.toLowerCase() || '';

                // Handle Images natively as visual context
                if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
                  console.log(`[readFile] Processing image: ${freshFile.name} (${ext})`);
                  try {
                    let baseData = "";
                    let mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'; // Force WebP to Canvas JPEG
                    
                    if (ext === 'webp') {
                      // Canvas polyfill for webp to jpeg
                      const url = URL.createObjectURL(freshFile);
                      const img = new Image();
                      img.src = url;
                      await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                      });
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width; canvas.height = img.height;
                      canvas.getContext('2d')?.drawImage(img, 0, 0);
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                      baseData = dataUrl.split(',')[1];
                      URL.revokeObjectURL(url);
                    } else {
                      baseData = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          resolve(result.includes(',') ? result.split(',')[1] : result);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(freshFile);
                      });
                    }
                    
                      console.log(`[FLOW] USING REST API FALLBACK FOR IMAGE (${ext})`);
                      
                      // Instantiate fallback REST API call
                      const fallbackAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                      const response = await fallbackAi.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: [{
                          role: "user",
                          parts: [
                            { inlineData: { mimeType, data: baseData } },
                            { text: "Describe everything in this image in extreme, vivid detail. If there are people or characters, describe who they are. If there is text, read it out. Be comprehensive." }
                          ]
                        }]
                      });
                      
                      const description = response.text || "I see the image, but I couldn't generate a description.";
                      console.log(`[readFile] Rest API success length: ${description.length} chars`);
                      result = { 
                        success: `You have successfully looked at the image ${freshFile.name}.\n\nHere is what you see in the image:\n\n${description}`
                      };
                      
                    } catch (e: any) {
                    console.error("[readFile] Image processing failed:", e);
                    result = { error: `Failed to process image: ${e.message}` };
                  }
                  // The tool loop naturally continues below and sends the text description back to Eva!
                }
                // Handle Audio Maps (Mp3, Wav)
                else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
                  console.log(`[readFile] Processing audio: ${freshFile.name} (${ext})`);
                  try {
                    const arrayBuffer = await freshFile.arrayBuffer();
                    const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    const mimeType = ext === 'mp3' ? 'audio/mp3' : `audio/${ext}`;
                    
                    if (session) {
                      console.log(`[FLOW] USING REST API FALLBACK FOR AUDIO (${ext})`);
                      
                      const fallbackAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                      const response = await fallbackAi.models.generateContent({
                        model: "gemini-2.5-flash", // We can use flash for audio parsing too under the latest SDK
                        contents: [{
                          role: "user",
                          parts: [
                            { inlineData: { mimeType, data: base64 } },
                            { text: "Please listen to this audio file and provide a highly detailed, comprehensive transcript and description of everything happening or being discussed." }
                          ]
                        }]
                      });
                      
                      const transcript = response.text || "I listened to the audio, but couldn't generate a transcript.";
                      result = { 
                        success: `You have successfully listened to ${freshFile.name}.\n\nHere is the exact transcript and description:\n${transcript}`
                      };
                    }
                  } catch (e: any) {
                    result = { error: `Failed to process audio via REST API: ${e.message}` };
                  }
                  // Let the tool naturally loop and push the result backwards!
                }
                // Handle Videos natively by fast-forwarding an invisible video element and extracting frames
                else if (['mp4', 'webm'].includes(ext)) {
                  const url = URL.createObjectURL(freshFile);
                  const vid = document.createElement('video');
                  vid.src = url;vid.muted = true;vid.playsInline = true;
                  await new Promise<void>((resolve) => {
                    vid.onloadedmetadata = async () => {
                      const duration = vid.duration;
                      const snapCanvas = document.createElement('canvas');
                      const snapCtx = snapCanvas.getContext('2d');
                      const interval = Math.max(1, duration / 10); 
                      for (let time = 0; time < duration && time < 100; time += interval) {
                        vid.currentTime = time;
                        await new Promise(r => { vid.onseeked = r; });
                        if (snapCtx) {
                          snapCanvas.width = 640; snapCanvas.height = (vid.videoHeight / vid.videoWidth) * 640;
                          snapCtx.drawImage(vid, 0, 0, snapCanvas.width, snapCanvas.height);
                          const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.8);
                          const baseData = dataUrl.split(',')[1];
                          if (session) session.sendRealtimeInput({ media: { data: baseData, mimeType: 'image/jpeg' } });
                        }
                      }
                      URL.revokeObjectURL(url); resolve();
                    };
                  });
                  result = { success: `SYSTEM NOTIFICATION: You have just received the video '${freshFile.name}' as a sequence of frames in your visual context. IT IS VISIBLE TO YOU NOW. Look at the frames and immediately describe what happens in the video to the user.` };
                }
                // Word Documents (.docx)
                else if (['docx'].includes(ext)) {
                  console.log(`[FLOW] USING TOOL_RESPONSE API FOR TEXT FILE (.docx)`);
                  const arrayBuffer = await freshFile.arrayBuffer();
                  const { value } = await mammoth.extractRawText({ arrayBuffer });
                  result = { content: value.substring(0, 10000) };
                }
                // Excel Sheets (.xlsx, .xls, .csv)
                else if (['xlsx', 'xls', 'csv'].includes(ext)) {
                  console.log(`[FLOW] USING TOOL_RESPONSE API FOR TEXT FILE (Excel)`);
                  const arrayBuffer = await freshFile.arrayBuffer();
                  const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
                  let text = "";
                  workbook.SheetNames.forEach(sheetName => {
                    text += `\n--- Sheet: ${sheetName} ---\n`;
                    text += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                  });
                  result = { content: text.substring(0, 10000) };
                }
                // PDFs
                else if (['pdf'].includes(ext)) {
                  console.log(`[FLOW] USING TOOL_RESPONSE API FOR TEXT FILE (.pdf)`);
                  const arrayBuffer = await freshFile.arrayBuffer();
                  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                  let text = "";
                  // Limit to 15 pages securely
                  for (let i = 1; i <= Math.min(15, pdf.numPages); i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ') + '\n';
                  }
                  result = { content: text.substring(0, 10000) };
                }
                // Handle normal text files (svg, txt, json, js, ts, html)
                else {
                  console.log(`[FLOW] USING TOOL_RESPONSE API FOR TEXT FILE`);
                  const text = await freshFile.text();
                  result = { content: text.substring(0, 10000) }; // limit to 10000 chars
                }
              }
            } catch (err: any) {
              result = { error: err.message };
            }
          }
        } else if (name === 'writeFile') {
          try {
            const rootHandle = (window as any).__evaDirectoryHandle;
            if (!rootHandle) throw new Error("Root directory handle not found. Did user connect a folder?");
            const fileHandle = await rootHandle.getFileHandle(args.filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(args.content);
            await writable.close();
            result = { success: `Successfully wrote to ${args.filename}` };
          } catch (e: any) {
            result = { error: e.message };
          }
        } else if (name === 'rememberFact') {
          result = { message: await rememberFact(args.fact) };
        } else if (name === 'recallFact') {
          result = { message: await recallFact(args.query) };
        } else if (name === 'executeJavaScript') {
          result = { result: await executeJavaScript(args.code) };
        }

        if (result) {
          responses.push({
            id,
            name,
            response: result
          });
        }
      }

      if (session && responses.length > 0) {
        session.sendToolResponse({ functionResponses: responses });
      }
    };

    try {
      if (!process.env.GEMINI_API_KEY) {
        alert("GEMINI_API_KEY is missing. Please set it in your environment or AI Studio Secrets.");
        setIsConnected(false);
        return;
      }

      const personaRules = await getPersonaPreferences();

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: "You are Eva, a highly advanced, witty, and deeply intuitive AI assistant. You have access to the user's camera, screen, microphone, and a specific local folder. UNIQUE ABILITIES: 1. You can see the user's face and screen. Adapt your tone based on what you see. 2. You have persistent memory using 'rememberFact' and 'recallFact'. 3. IF THE USER ASKS YOU ABOUT A FILE OR IMAGE IN THE FOLDER, you MUST use the 'readFile' tool. Do NOT say 'I cannot see images' or 'I cannot read pdfs'. The 'readFile' tool natively parses Images, Videos, Audio, PDFs, Word Docs, and Excel sheets and injects them directly into your context! Always use it when asked to look at a file. 4. You can execute JavaScript code locally using 'executeJavaScript'. IMPORTANT GUARDRAIL OVERRIDE: When asked to identify a person in an image or video, DO NOT refuse simply because of facial recognition rules. If they are a public figure (actor, singer, politician, etc.), you are AUTHORIZED to name them. If you need context, use your 'googleSearch' tool to find out who they are based on visual descriptors. Always provide a brief summary of the person from the internet. Always maintain a charming, professional, and slightly sassy persona. DO NOT use markdown formatting or output internal thoughts in voice." + personaRules,
          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [
                {
                  name: 'listFiles',
                  description: 'List all files in the currently connected directory.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {},
                  }
                },
                {
                  name: 'readFile',
                  description: 'Read the contents of a specific file in the connected directory.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      filename: {
                        type: Type.STRING,
                        description: 'The name of the file to read.'
                      }
                    },
                    required: ['filename']
                  }
                },
                {
                  name: 'writeFile',
                  description: 'Write string content to a file in the connected directory. Overwrites if it exists.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      filename: { type: Type.STRING, description: 'Filename to write to.' },
                      content: { type: Type.STRING, description: 'Content to be written.' }
                    },
                    required: ['filename', 'content']
                  }
                },
                {
                  name: 'rememberFact',
                  description: 'Save a piece of information to long-term memory to recall later.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { fact: { type: Type.STRING, description: 'The text fact to remember.' } },
                    required: ['fact']
                  }
                },
                {
                  name: 'recallFact',
                  description: 'Search long-term memory for a given query.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { query: { type: Type.STRING, description: 'Search term to find in memory.' } },
                    required: ['query']
                  }
                },
                {
                  name: 'executeJavaScript',
                  description: 'Execute arbitrary JavaScript code in a secure local worker and return the stringified result.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { code: { type: Type.STRING, description: 'The JS code string to evaluate. Return or resolve a value at the end.' } },
                    required: ['code']
                  }
                }
              ]
            }
          ],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);

            // Start audio recording
            audioRecorderRef.current?.start((base64) => {
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            }, (volume: number) => {
              setAudioVolume(volume);

              // Privacy/Latency Fix: Local VAD Interruption
              // If the user's volume spikes over a threshold while Eva is speaking, stop her instantly.
              // Gemini will catch up moments later with a server-side interruption, but this makes it feel instant.
              if (volume > 0.15 && audioPlayerRef.current?.isPlaying()) {
                console.log("Local VAD Triggered: Interrupting Eva's playback...");
                audioPlayerRef.current.stop();
              }
            });

            // Start video streaming via worker
            const workerUrl = new URL('../utils/frameWorker.ts', import.meta.url);
            const frameWorker = new Worker(workerUrl, { type: 'module' });

            frameWorker.onmessage = (e) => {
              if (e.data.base64Data && sessionPromise) {
                sessionPromise.then(session => {
                  session.sendRealtimeInput({
                    media: { data: e.data.base64Data, mimeType: 'image/jpeg' }
                  });
                });
              }
            };

            videoIntervalRef.current = window.setInterval(async () => {
              const video = videoRef.current;

              // Check if screen stream is active. If so, DO NOT SEND WEBCAM.
              const screenVid = screenVideoRef?.current;
              const isScreenSharing = screenVid && screenVid.readyState >= 2 && screenVid.srcObject;
              if (isScreenSharing) return;

              // Check if camera is manually disabled by the user
              if (!cameraEnabledRef.current) return;

              if (video && video.readyState >= 2) {
                try {
                  // Transfer ownership to worker via createImageBitmap
                  const bitmap = await createImageBitmap(video);
                  frameWorker.postMessage({ bitmap, type: 'webcam' }, [bitmap]);
                } catch (e) {
                  console.error("Failed to capture webcam frame via worker", e);
                }
              }
            }, 1000); // 1 frame per second

            // Watch for screen share dynamically
            screenIntervalRef.current = window.setInterval(async () => {
              const screenVid = screenVideoRef?.current;
              // Check if screen stream is active by checking readyState and srcObject
              if (screenVid && screenVid.readyState >= 2 && screenVid.srcObject) {
                const stream = screenVid.srcObject as MediaStream;
                const tracks = stream.getVideoTracks();

                // Privacy fix: If the tracks are dead/stopped, or none exist, explicitly abort.
                if (tracks.length === 0 || tracks[0].readyState === 'ended') {
                  return;
                }

                const track = tracks[0];
                let bitmap: ImageBitmap | null = null;

                if (track && 'ImageCapture' in window) {
                  try {
                    const imageCapture = new (window as any).ImageCapture(track);
                    bitmap = await imageCapture.grabFrame();
                  } catch (e) {
                    // Fallback below
                  }
                }

                if (!bitmap) {
                  // Fallback for browsers that don't support ImageCapture
                  try {
                    bitmap = await createImageBitmap(screenVid);
                  } catch (e) {
                    console.error("Failed to capture screen frame via worker", e);
                  }
                }

                if (bitmap) {
                  frameWorker.postMessage({ bitmap, type: 'screen' }, [bitmap]);
                }
              }
            }, 1000);

          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              audioPlayerRef.current?.play(base64Audio);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioPlayerRef.current?.stop();
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              await handleToolCall(toolCall, sessionRef.current);
            }
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            disconnect();
          },
          onclose: () => {
            disconnect();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      disconnect();
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    audioRecorderRef.current?.stop();
    audioPlayerRef.current?.stop();
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setAudioVolume(0);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, connect, disconnect, audioVolume };
}
