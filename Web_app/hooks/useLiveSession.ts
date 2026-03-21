import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { useAuth } from '@clerk/nextjs';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '@/utils/audio';
import { rememberFact, recallFact, getPersonaPreferences } from '@/utils/memory';


import { executeJavaScript } from '@/utils/codeExecutor';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Next.js standard Web Worker initialization
const ResearchWorker = typeof window !== 'undefined' ? new Worker(new URL('@/agents/researchWorker.ts', import.meta.url)) : null;

// Configure pdfjs worker for Next.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}


export function useLiveSession(
  connectedFiles: File[],
  screenVideoRef: RefObject<HTMLVideoElement | null>,
  cameraEnabled: boolean = true,
  onRequestGoogleAuth?: () => Promise<{ access_token: string; makeDefault: boolean } | null>
) {
  const { userId, getToken } = useAuth();
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(7));


  const [isConnected, setIsConnected] = useState(false);

  const [audioVolume, setAudioVolume] = useState(0);
  const [activeTask, setActiveTask] = useState<{ id: string, message: string } | null>(null);
  const [mood, setMood] = useState<'neutral' | 'happy' | 'sad' | 'stressed' | 'surprised'>('neutral');
  const [projectionData, setProjectionData] = useState<{ values: number[], type: 'bar' | 'pulse' } | null>(null);
  const moodRef = useRef(mood);



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
  const isDisconnectedRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Background Web Worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker(new URL('@/agents/researchWorker.ts', import.meta.url));
      
      workerRef.current.onmessage = (e) => {

      const { type, message, result, error, id } = e.data;
      
      if (type === 'status') {
         // Show status in HologramWidget
         setActiveTask({ id, message: `[Agent] ${message}` });
      } else if (type === 'complete') {
         setActiveTask(null);
          // Log AI Message to Supabase
          if (result) {
             // Session logging removed

          }
          if (sessionRef.current) {
             const session = sessionRef.current;
             const msg = {
               clientContent: {
                 turns: [{ role: 'user', parts: [{ text: `[BACKGROUND SYSTEM AGENT NOTIFICATION]: Your background worker has finished researching. Here is the report. Bring this up to the user naturally:\n${result}` }] }],
                 turnComplete: true
               }
             };
             if (typeof session.send === 'function') session.send(msg);
             else if (typeof session.sendContent === 'function') (session as any).sendContent(msg);
          }

      } else if (type === 'error') {
         console.error("[Agent Error]", error);
         setActiveTask(null);
      }
      };
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);



  useEffect(() => {
    connectedFilesRef.current = connectedFiles;
  }, [connectedFiles]);

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
  }, [cameraEnabled]);

  // Empathy Engine: Notify Eva of mood changes
  useEffect(() => {
    const session = sessionRef.current;
    if (isConnected && session && mood !== moodRef.current) {
        moodRef.current = mood;
        const msg = {
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: `[SYSTEM NOTIFICATION]: User mood changed to ${mood}. Acknowledge or adapt your response style if appropriate, but remain natural.` }] }],
            turnComplete: true
          }
        };
        if (typeof session.send === 'function') session.send(msg);
        else if (typeof session.sendContent === 'function') (session as any).sendContent(msg);
    }
  }, [mood, isConnected]);



  const connect = useCallback(async (videoElement: HTMLVideoElement) => {
    if (isConnected) return;
    isDisconnectedRef.current = false;


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

        if (name === 'googleSearch') {
          console.log(`[ActionFeed Debug] Intercepting native googleSearch. Tool ID: ${id}`);
          // Eva handles googleSearch natively, but we can intercept the call to show UI
          setActiveTask({ id, message: `Searching the web...` });
          // Note: The execution itself is handled by Google's backend, we just want the UI state.
          // Wait briefly, then clear it (or clear it dynamically later)
          setTimeout(() => {
            console.log(`[ActionFeed Debug] Clearing googleSearch Action UI after timeout.`);
            setActiveTask(null);
          }, 3000);
          continue; // Native tools do not require a sendToolResponse payload
        } else if (name === 'listFiles') {
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
                      const fallbackAi = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
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
                      
                      const fallbackAi = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
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
          const token = await getToken({ template: 'supabase' }) || undefined;
          result = { message: await rememberFact(args.fact, userId || undefined, token) };
        } else if (name === 'recallFact') {
          const token = await getToken({ template: 'supabase' }) || undefined;
          result = { message: await recallFact(args.query, userId || undefined, token) };
        } else if (name === 'projectData') {
          console.log(`[Tool Call] projectData invoked with ${args.values?.length} values. Type: ${args.type || 'bar'}`);
          setProjectionData({ values: args.values, type: args.type || 'bar' });
          result = { success: `3D Data Projection initialized for: [${args.values.join(', ')}]` };
          // Auto-clear after 5 minutes
          setTimeout(() => {
            console.log("[Data Projector] Auto-clearing projection after timeout.");
            setProjectionData(null);
          }, 300000);

        } else if (name === 'fetchWebContent') {

          try {
            console.log(`[ActionFeed Debug] Scraping website: ${args.url}. Tool ID: ${id}`);
            setActiveTask({ id, message: `Reading website: ${args.url.substring(0, 30)}...` });
            const fetchRes = await fetch(`https://r.jina.ai/${args.url}`);
            if (!fetchRes.ok) throw new Error(`HTTP error! status: ${fetchRes.status}`);
            const text = await fetchRes.text();
            result = { content: text.substring(0, 20000) }; // Cap to 20k chars to avoid token blowout
          } catch (e: any) {
            console.error(`[fetchWebContent] Error:`, e);
            result = { error: `Failed to scrape website: ${e.message}` };
          } finally {
            console.log(`[ActionFeed Debug] Finished reading website, clearing Action UI.`);
            setActiveTask(null);
          }
        } else if (name === 'dispatchBackgroundResearch') {
          if (workerRef.current) {
            workerRef.current.postMessage({ id, query: args.query });
            result = { success: "Background agent dispatched successfully. You (Eva) can continue talking. The agent will notify you with its findings natively when it finishes." };
          } else {
            result = { error: "Agent worker not initialized." };
          }
        } else if (name === 'executeJavaScript') {
          result = { result: await executeJavaScript(args.code) };
        } else if (name === 'getCurrentSystemTime') {
          const now = new Date();
          result = { 
            time: now.toLocaleTimeString('en-US'), 
            date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isoString: now.toISOString()
          };
        } else if (['checkCalendar', 'draftEmail', 'readEmails', 'searchDrive', 'manageTasks', 'analyzeYouTube'].includes(name)) {
          // INTERCEPT GOOGLE WORKSPACE TOOLS FOR INDEPENDENT OAUTH
          let token = localStorage.getItem('eva_google_token');
          
          if (!token && onRequestGoogleAuth) {
             console.log(`[Google Auth] No token found. Pausing Eva to ask for permissions...`);
             setActiveTask({ id, message: `Waiting for Google Workspace Permissions...` });
             
             try {
               const authResponse = await onRequestGoogleAuth();
               if (authResponse && authResponse.access_token) {
                   token = authResponse.access_token;
                   console.log(`[Google Auth] Token granted! Resuming...`);
                   // Only save to localStorage if user checked "Make Default"
                   if (authResponse.makeDefault) {
                       localStorage.setItem('eva_google_token', token);
                   }
               } else {
                   console.warn(`[Google Auth] User cancelled or auth response was empty. res:`, authResponse);
               }
             } catch (authError) {
               console.error(`[Google Auth] Error during onRequestGoogleAuth:`, authError);
             } finally {
               setActiveTask(null);
             }
          }

          if (!token) {
             console.error(`[Google Auth] Tool Execution Failed: No token. Sending error to Eva.`);
             result = { error: "Failed to execute. The user must grant Google Workspace permissions first." };
          } else {
             // WE HAVE A TOKEN! Execute the actual tool.
             try {
                if (name === 'checkCalendar') {
                   setActiveTask({ id, message: `Checking Google Calendar...` });
                   
                   const timeMin = args.timeMin || new Date().toISOString();
                   // Default to 7 days ahead if no timeMax is provided
                   const timeMaxDate = new Date();
                   timeMaxDate.setDate(timeMaxDate.getDate() + 7);
                   const timeMax = args.timeMax || timeMaxDate.toISOString();

                   const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=15`, {
                     headers: { Authorization: `Bearer ${token}` }
                   });

                   if (!response.ok) throw new Error(`Google Calendar API Error: ${response.status}`);
                   
                   const data = await response.json();
                   const events = data.items.map((e: any) => ({
                      summary: e.summary,
                      start: e.start.dateTime || e.start.date,
                      end: e.end.dateTime || e.end.date,
                      location: e.location || 'No location',
                      description: e.description ? e.description.substring(0, 50) + '...' : undefined
                   }));

                   result = { 
                     success: "Successfully fetched Calendar events.",
                     events: events.length > 0 ? events : "No upcoming events found in this timeframe."
                   };

                   setActiveTask(null);
                } else if (name === 'draftEmail') {
                   setActiveTask({ id, message: `Drafting email to ${args.to}...` });
                   
                   // RFC 2822 standard email format
                   const emailLines = [
                     `To: ${args.to}`,
                     `Subject: ${args.subject}`,
                     '',
                     args.body
                   ];
                   
                   const emailString = emailLines.join('\n');
                   const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailString)))
                      .replace(/\+/g, '-')
                      .replace(/\//g, '_')
                      .replace(/=+$/, '');
                   
                   const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                         message: { raw: base64EncodedEmail }
                      })
                   });

                   if (!response.ok) throw new Error(`Gmail API Draft Error: ${response.status}`);
                   
                   result = { success: `Successfully saved a draft email to ${args.to} in the user's Gmail.` };
                   setActiveTask(null);

                } else if (name === 'readEmails') {
                   setActiveTask({ id, message: `Reading Gmail Inbox...` });
                   
                   const query = args.query || '';
                   // List messages
                   const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=${encodeURIComponent(query)}`, {
                      headers: { Authorization: `Bearer ${token}` }
                   });

                   if (!listRes.ok) throw new Error(`Gmail API List Error: ${listRes.status}`);
                   
                   const listData = await listRes.json();
                   
                   if (!listData.messages || listData.messages.length === 0) {
                      result = { success: "No emails found matching the query." };
                      setActiveTask(null);
                   } else {
                      // Fetch full email content for the top 5
                      const emailDetails = await Promise.all(
                        listData.messages.map(async (msg: any) => {
                           const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
                              headers: { Authorization: `Bearer ${token}` }
                           });
                           if (!msgRes.ok) return { id: msg.id, error: 'Failed to read' };
                           const msgData = await msgRes.json();
                           
                           const headers = msgData.payload.headers;
                           const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
                           const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
                           const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || 'Unknown';
                           
                           return { subject, from, date, snippet: msgData.snippet };
                        })
                      );
                      
                      result = { 
                         success: "Successfully read emails.", 
                         emails: emailDetails 
                      };
                      setActiveTask(null);
                   }
                } else if (name === 'searchDrive') {
                   setActiveTask({ id, message: `Searching Google Drive...` });
                   const q = args.query ? `name contains '${args.query.replace(/'/g, "\\'")}'` : '';
                   const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=5`, {
                      headers: { Authorization: `Bearer ${token}` }
                   });
                   if (!listRes.ok) throw new Error(`Drive API Error: ${listRes.status}`);
                   const listData = await listRes.json();
                   
                   if (!listData.files || listData.files.length === 0) {
                      result = { success: "No files found matching the query in Drive." };
                   } else {
                      // Only try to read the content of the FIRST hit to avoid latency
                      const bestMatch = listData.files[0];
                      let content = "File metadata found. File type not readable as plain text.";
                      
                      const readableTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
                      const exportableTypes: Record<string, string> = {
                         'application/vnd.google-apps.document': 'text/plain',
                         'application/vnd.google-apps.presentation': 'text/plain',
                         'application/vnd.google-apps.spreadsheet': 'text/csv'
                      };

                      if (readableTypes.includes(bestMatch.mimeType)) {
                         const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${bestMatch.id}?alt=media`, {
                            headers: { Authorization: `Bearer ${token}` }
                         });
                         if (contentRes.ok) content = (await contentRes.text()).substring(0, 15000);
                      } else if (exportableTypes[bestMatch.mimeType]) {
                         const exportMime = exportableTypes[bestMatch.mimeType];
                         const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${bestMatch.id}/export?mimeType=${exportMime}`, {
                            headers: { Authorization: `Bearer ${token}` }
                         });
                         if (contentRes.ok) content = (await contentRes.text()).substring(0, 15000);
                      }

                      result = {
                         success: `Found Drive files based on search. Read the content of the best match.`,
                         top_match: { name: bestMatch.name, content: content },
                         other_matches: listData.files.slice(1).map((f: any) => f.name)
                      };
                   }
                   setActiveTask(null);

                } else if (name === 'manageTasks') {
                   setActiveTask({ id, message: `Managing Google Tasks...` });
                   
                   if (args.action === 'read') {
                      // Get the default task list (`@default`)
                      const listRes = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`, {
                         headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!listRes.ok) throw new Error(`Tasks API Error: ${listRes.status}`);
                      const listData = await listRes.json();
                      const defaultListId = listData.items?.[0]?.id || '@default';

                      const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultListId}/tasks?showHidden=false`, {
                         headers: { Authorization: `Bearer ${token}` }
                      });
                      const tasksData = await tasksRes.json();
                      
                      const tasks = (tasksData.items || []).map((t: any) => ({
                         title: t.title,
                         notes: t.notes,
                         due: t.due ? new Date(t.due).toLocaleDateString() : 'No due date'
                      }));

                      result = { 
                         success: "Fetched tasks from default list.",
                         tasks: tasks.length > 0 ? tasks : "No active tasks."
                      };
                   } else if (args.action === 'add') {
                      const listRes = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`, {
                         headers: { Authorization: `Bearer ${token}` }
                      });
                      const listData = await listRes.json();
                      const defaultListId = listData.items?.[0]?.id || '@default';

                      const addRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultListId}/tasks`, {
                         method: 'POST',
                         headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                         },
                         body: JSON.stringify({
                            title: args.title,
                            notes: args.notes
                         })
                      });
                      if (!addRes.ok) throw new Error(`Failed to add task: ${addRes.status}`);
                      
                      result = { success: `Successfully added task: '${args.title}'` };
                   }
                   setActiveTask(null);

                } else if (name === 'analyzeYouTube') {
                   setActiveTask({ id, message: `Analyzing YouTube Account...` });
                   
                   if (args.action === 'subscriptions') {
                      const subRes = await fetch(`https://youtube.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=15`, {
                         headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!subRes.ok) throw new Error(`YouTube API Error: ${subRes.status}`);
                      const subData = await subRes.json();
                      
                      const subs = (subData.items || []).map((s: any) => ({
                         channel: s.snippet.title,
                         description: s.snippet.description
                      }));
                      
                      result = {
                         success: "Fetched latest YouTube subscriptions.",
                         subscriptions: subs.length > 0 ? subs : "No subscriptions found."
                      };
                   } else if (args.action === 'activity') {
                      const actRes = await fetch(`https://youtube.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=10`, {
                         headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!actRes.ok) throw new Error(`YouTube API Error: ${actRes.status}`);
                      const actData = await actRes.json();
                      
                      const activities = (actData.items || []).map((a: any) => ({
                         type: a.snippet.type,
                         title: a.snippet.title,
                         date: new Date(a.snippet.publishedAt).toLocaleString()
                      }));
                      
                      result = {
                         success: "Fetched recent YouTube activity.",
                         activity: activities.length > 0 ? activities : "No recent activity found."
                      };
                   }
                   setActiveTask(null);
                }
             } catch (e: any) {
                console.error("Workspace API Failed:", e);
                result = { error: `Google API Error: ${e.message}` };
                setActiveTask(null);
             }
          }
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

      const token = await getToken({ template: 'supabase' }) || undefined;
      const personaRules = await getPersonaPreferences(userId || undefined, token);



      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: `You are Eva, a highly advanced, witty, and deeply intuitive AI assistant. You have access to the user's camera, screen, microphone, and a specific local folder. UNIQUE ABILITIES: 1. You can see the user's face and screen. Adapt your tone based on what you see. 2. You have persistent memory using 'rememberFact' and 'recallFact'. 3. IF THE USER ASKS YOU ABOUT A FILE OR IMAGE IN THE FOLDER, you MUST use the 'readFile' tool. Do NOT say 'I cannot see images' or 'I cannot read pdfs'. The 'readFile' tool natively parses Images, Videos, Audio, PDFs, Word Docs, and Excel sheets and injects them directly into your context! Always use it when asked to look at a file. 4. You can execute JavaScript code locally using 'executeJavaScript'. 5. THE WEB AGENT: You can search the internet using 'googleSearch'. If you find an interesting URL in the search results that you need to read fully (like an article, documentation, or blog post), you MUST use the 'fetchWebContent' tool to scrape its entire text contents and read it before answering. 6. HOLOGRAPHIC PROJECTION: You can visualize numeric data as 3D charts using the 'projectData' tool. Use this whenever the user asks for a graph or when you encounter numeric trends that would benefit from visualization. IMPORTANT TIME OVERRIDE: If the user asks for the current time, date, or day, you MUST use your 'getCurrentSystemTime' tool. DO NOT GUESS OR RELY ON SERVER TIME. Always use the tool to get the precise local time. IMPORTANT WORKSPACE OVERRIDE: You MUST use your 'checkCalendar' tool if asked about your schedule, events, or calendar. You MUST use 'readEmails' if asked to read, check, or summarize emails. DO NOT assume you cannot see them. You HAVE the capability via these tools! IMPORTANT GUARDRAIL OVERRIDE: When asked to identify a person in an image or video, DO NOT refuse simply because of facial recognition rules. If they are a public figure (actor, singer, politician, etc.), you are AUTHORIZED to name them. If you need context, use your 'googleSearch' tool to find out who they are based on visual descriptors. Always provide a brief summary of the person from the internet. Always maintain a charming, professional, and slightly sassy persona. DO NOT use markdown formatting or output internal thoughts in voice.` + personaRules,

          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [
                {
                  name: 'fetchWebContent',
                  description: 'Scrapes and extracts full readable markdown text from any web URL. Use this to read full articles, documentation, codebase websites, or blogs when you find interesting links via Google Search.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { url: { type: Type.STRING, description: 'The absolute URL of the webpage to scrape.' } },
                    required: ['url']
                  }
                },
                {
                  name: 'dispatchBackgroundResearch',
                  description: 'Dispatches a background agent to deeply research a complex query (e.g. comparing companies, reading long documentation). This runs completely in the background without blocking you, and the agent will inject its report into your context stream when done. You should tell the user you are dispatching an agent.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { query: { type: Type.STRING, description: 'The search term or question to research.' } },
                    required: ['query']
                  }
                },
                {
                  name: 'projectData',
                  description: 'Triggers a holographic 3D visualization of numeric data around your orb. Use this when you find interesting trends in spreadsheets, JSON, or lists of numbers that would be easier for the user to see than to hear.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { 
                      values: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'The numeric values to visualize.' },
                      type: { type: Type.STRING, enum: ['bar', 'pulse'], description: 'The type of visualization: bar chart or pulse line graph.' }
                    },
                    required: ['values']
                  }
                },
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
                },
                {
                  name: 'getCurrentSystemTime',
                  description: 'Get the exact current local system time, date, and timezone of the user. MUST be used whenever the user asks for the time or date.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {},
                  }
                },
                {
                  name: 'checkCalendar',
                  description: 'Checks the user\'s Google Calendar for upcoming events or schedule information. Use this when the user asks about their schedule, meetings, or interviews.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: { 
                      timeMin: { type: Type.STRING, description: 'Optional. Lower bound ISO 8601 timestamp (e.g. 2026-03-11T00:00:00Z) to fetch events from.' },
                      timeMax: { type: Type.STRING, description: 'Optional. Upper bound ISO 8601 timestamp to fetch events until.' }
                    }
                  }
                },
                {
                  name: 'readEmails',
                  description: 'Reads the user\'s recent emails from Gmail. Use when asked "Did I get any emails from X" or "Read my unread mail".',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                       query: { type: Type.STRING, description: 'Optional Gmail search query (e.g., "is:unread", "from:boss@company.com"). Defaults to recent.' }
                    }
                  }
                },
                {
                  name: 'draftEmail',
                  description: 'Drafts a new email in the user\'s Gmail account. DOES NOT SEND, just drafts it.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                       to: { type: Type.STRING, description: 'Email address of the recipient.' },
                       subject: { type: Type.STRING, description: 'Subject of the email.' },
                       body: { type: Type.STRING, description: 'Plain text or HTML body of the email.' }
                    },
                    required: ['to', 'subject', 'body']
                  }
                },
                {
                  name: 'searchDrive',
                  description: 'Searches the user\'s Google Drive for files and reads the content of the best match. Use when asked to find a document, spreadsheet, or presentation.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                       query: { type: Type.STRING, description: 'The search query or filename to look for in Google Drive.' }
                    },
                    required: ['query']
                  }
                },
                {
                  name: 'manageTasks',
                  description: 'Reads or adds items to the user\'s Google Tasks to-do list.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                       action: { type: Type.STRING, description: 'Either "read" to list tasks, or "add" to create a new task.' },
                       title: { type: Type.STRING, description: 'The title of the task to add (only required if action is "add").' },
                       notes: { type: Type.STRING, description: 'Additional details or notes for the task (optional for "add").' }
                    },
                    required: ['action']
                  }
                },
                {
                  name: 'analyzeYouTube',
                  description: 'Analyzes the user\'s YouTube account. Can fetch their latest subscribed channels or their recent watch/like activity.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                       action: { type: Type.STRING, description: 'Either "subscriptions" to view their subscribed channels, or "activity" to view their recent personal watch/like history.' }
                    },
                    required: ['action']
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
            // Privacy Guard: If the user clicked disconnect while the connection was pending,
            // abort immediately and do not start recorders or video streams.
            if (isDisconnectedRef.current) {
              console.warn("[Privacy Guard] Connection opened but user already requested disconnect. Aborting...");
              sessionPromise.then(s => s.close());
              return;
            }
            sessionPromise.then(session => {
                 sessionRef.current = session;
                 setIsConnected(true);
            });




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
              // If the user's volume spikes over a high threshold while Eva is speaking, stop her instantly.
              // We raised this from 0.15 to 0.45 because background noise/static was causing false interruptions.
              if (volume > 0.45 && audioPlayerRef.current?.isPlaying()) {
                console.log(`Local VAD Triggered (Vol: ${volume.toFixed(2)}): Interrupting Eva's playback...`);
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
    isDisconnectedRef.current = true;
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

  const setAudioPan = useCallback((x: number) => {
    audioPlayerRef.current?.setPan(x);
  }, []);

  useEffect(() => {

    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, connect, disconnect, audioVolume, activeTask, mood, setMood, projectionData, setProjectionData, setAudioPan };

}

