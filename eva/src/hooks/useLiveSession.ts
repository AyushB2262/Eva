import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../utils/audio';
import { rememberFact, recallFact } from '../utils/memory';
import { executeJavaScript } from '../utils/codeExecutor';

export function useLiveSession(connectedFiles: File[], screenVideoRef: RefObject<HTMLVideoElement | null>) {
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

  useEffect(() => {
    connectedFilesRef.current = connectedFiles;
  }, [connectedFiles]);

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
              const fileDef = currentFiles.find(f => (f.webkitRelativePath || f.name) === args.filename || f.name === args.filename);
              if (!fileDef) {
                result = { error: `File '${args.filename}' not found.` };
              } else {
                // If we're using File System Access API, we saved the handle
                const handle = (fileDef as any).handle;
                let text = "";
                if (handle) {
                  const freshFile = await handle.getFile();
                  text = await freshFile.text();
                } else {
                  // Fallback for standard input type=file
                  text = await fileDef.text();
                }
                result = { content: text.substring(0, 5000) }; // limit to 5000 chars
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

        responses.push({
          id,
          name,
          response: result
        });
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

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: "You are Eva, a highly advanced, witty, and deeply intuitive AI assistant. You have access to the user's camera, screen, microphone, and a specific local folder. UNIQUE ABILITIES: 1. You can see the user's face and screen. Adapt your tone based on what you see—if they look stressed, be calm and concise. If they are smiling, be warm. 2. You have persistent memory using the 'rememberFact' and 'recallFact' tools. If the user tells you personal details, remember them. Retrieve them when relevant. 3. You can read, list, and write files using the folder tools. 4. You can execute JavaScript code locally using 'executeJavaScript' to answer math, logic, or data questions securely. Always maintain a charming, professional, and slightly sassy persona. DO NOT use markdown formatting, asterisks, bold text, or output internal thoughts in voice.",
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
            });

            // Start video streaming
            videoIntervalRef.current = window.setInterval(() => {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              
              // Check if screen stream is active. If so, DO NOT SEND WEBCAM.
              const screenVid = screenVideoRef?.current;
              const isScreenSharing = screenVid && screenVid.readyState >= 2 && screenVid.srcObject;
              if (isScreenSharing) return;

              if (video && canvas && video.readyState >= 2) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                  sessionPromise.then(session => {
                    session.sendRealtimeInput({
                      media: { data: base64Data, mimeType: 'image/jpeg' }
                    });
                  });
                }
              }
            }, 1000); // 1 frame per second

            // Watch for screen share dynamically
            screenIntervalRef.current = window.setInterval(async () => {
              const screenVid = screenVideoRef?.current;
              const scanvas = screenCanvasRef.current;
              // Check if screen stream is active by checking readyState and srcObject
              if (screenVid && scanvas && screenVid.readyState >= 2 && screenVid.srcObject) {
                const stream = screenVid.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                let frameCaptured = false;

                if (track && 'ImageCapture' in window) {
                   try {
                     const imageCapture = new (window as any).ImageCapture(track);
                     const bitmap = await imageCapture.grabFrame();
                     scanvas.width = bitmap.width;
                     scanvas.height = bitmap.height;
                     const ctx = scanvas.getContext('2d');
                     if (ctx) {
                       ctx.drawImage(bitmap, 0, 0, scanvas.width, scanvas.height);
                       const base64Data = scanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                       sessionPromise.then(session => {
                         session.sendRealtimeInput({
                           media: { data: base64Data, mimeType: 'image/jpeg' }
                         });
                       });
                       frameCaptured = true;
                     }
                   } catch (e) {
                      // Fallback below
                   }
                }

                if (!frameCaptured) {
                  // Fallback for browsers that don't support ImageCapture
                  scanvas.width = screenVid.videoWidth;
                  scanvas.height = screenVid.videoHeight;
                  const ctx = scanvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(screenVid, 0, 0, scanvas.width, scanvas.height);
                    const base64Data = scanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                    // Send as image part
                    sessionPromise.then(session => {
                      session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                      });
                    });
                  }
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
