import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../utils/audio';

export function useLiveSession(connectedFiles: File[]) {
  const [isConnected, setIsConnected] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const connect = useCallback(async (videoElement: HTMLVideoElement) => {
    if (isConnected) return;

    audioRecorderRef.current = new AudioRecorder();
    audioPlayerRef.current = new AudioPlayer();
    videoRef.current = videoElement;
    canvasRef.current = document.createElement('canvas');

    const handleToolCall = async (toolCall: any, session: any) => {
      const responses = [];
      for (const call of toolCall.functionCalls) {
        const { name, args, id } = call;
        let result: any = { error: "Unknown function" };

        if (name === 'listFiles') {
          if (connectedFiles.length === 0) {
            result = { error: "No files connected. Ask the user to connect a folder first." };
          } else {
            try {
              const files = connectedFiles.map(f => ({ name: f.webkitRelativePath || f.name, kind: 'file' }));
              result = { files };
            } catch (err: any) {
              result = { error: err.message };
            }
          }
        } else if (name === 'readFile') {
          if (connectedFiles.length === 0) {
            result = { error: "No files connected. Ask the user to connect a folder first." };
          } else {
            try {
              const file = connectedFiles.find(f => (f.webkitRelativePath || f.name) === args.filename || f.name === args.filename);
              if (!file) {
                result = { error: `File '${args.filename}' not found.` };
              } else {
                const text = await file.text();
                result = { content: text.substring(0, 5000) }; // limit to 5000 chars
              }
            } catch (err: any) {
              result = { error: err.message };
            }
          }
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
          systemInstruction: "You are Jarvis, a highly advanced, witty, and loyal personal AI assistant. You were created to make the user's life seamless and efficient. You possess a dry, British-style sense of humor, much like a sophisticated butler, but you are deeply caring and protective of your user. You have access to the user's camera, microphone, and a specific folder on their device. You can see what they are holding, read their files, and search the web. Be engaging, conversational, and helpful. Respond with high accuracy and precision, but always maintain your charming, slightly sarcastic, yet professional persona. DO NOT use markdown formatting, asterisks, bold text, or output internal thoughts.",
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
  }, [isConnected, connectedFiles]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    audioRecorderRef.current?.stop();
    audioPlayerRef.current?.stop();
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
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
