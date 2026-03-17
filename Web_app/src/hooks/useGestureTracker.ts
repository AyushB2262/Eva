import { useEffect, useRef, useState, RefObject } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type GestureType = 'none' | 'pinch' | 'swipe_left' | 'swipe_right' | 'point';

export function useGestureTracker(videoRef: RefObject<HTMLVideoElement | null>, isEnabled: boolean) {
  const [gestureData, setGestureData] = useState<{ 
    position: { x: number, y: number, z: number } | null, 
    gesture: GestureType 
  }>({ position: null, gesture: 'none' });
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // History for swipe detection
  const historyRef = useRef<{ x: number, time: number }[]>([]);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.x/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (active) {
          landmarkerRef.current = handLandmarker;
          setIsReady(true);
          console.log("[Gesture Tracker] Initialized successfully");
        }
      } catch (err) {
        console.error("[Gesture Tracker] Failed to initialize:", err);
      }
    }

    init();

    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  const lastDetectionTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isEnabled || !isReady || !videoRef.current || !landmarkerRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setGestureData({ position: null, gesture: 'none' });
      return;
    }

    const video = videoRef.current;
    let lastVideoTime = -1;

    const detect = () => {
      const now = performance.now();

      // Dynamic Throttling: Check every 41ms (~24fps) for cinematic fluiditiy
      if (now - lastDetectionTimeRef.current < 41) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      if (video.readyState >= 2 && landmarkerRef.current) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          lastDetectionTimeRef.current = now;

          
          try {
            const detections = landmarkerRef.current.detectForVideo(video, performance.now());
            
            if (detections.landmarks && detections.landmarks.length > 0) {
              const hand = detections.landmarks[0];
              const wrist = hand[0]; // Wrist
              const thumbTip = hand[4];
              const indexTip = hand[8];
              
              const currentPos = {
                x: (wrist.x - 0.5) * -4, // Wider range for gestures
                y: (wrist.y - 0.5) * -4,
                z: wrist.z
              };

              // Pinch Detection (Thumb and Index tips distance)
              const dx = thumbTip.x - indexTip.x;
              const dy = thumbTip.y - indexTip.y;
              const dz = thumbTip.z - indexTip.z;
              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
              
              let detectedGesture: GestureType = 'none';
              if (dist < 0.05) detectedGesture = 'pinch';

              // Swipe Detection
              const now = performance.now();
              historyRef.current.push({ x: currentPos.x, time: now });
              if (historyRef.current.length > 10) historyRef.current.shift();
              
              if (historyRef.current.length >= 5) {
                const first = historyRef.current[0];
                const last = historyRef.current[historyRef.current.length - 1];
                const dt = last.time - first.time;
                const dx_total = last.x - first.x;
                
                if (dt < 300 && Math.abs(dx_total) > 0.6) {
                   detectedGesture = dx_total > 0 ? 'swipe_right' : 'swipe_left';
                   historyRef.current = []; // Clear to prevent double trigger
                }
              }

              setGestureData({
                position: currentPos,
                gesture: detectedGesture
              });
            } else {
              setGestureData({ position: null, gesture: 'none' });
            }
          } catch(e) { /* silent */ }
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isEnabled, isReady, videoRef]);

  return gestureData;
}
