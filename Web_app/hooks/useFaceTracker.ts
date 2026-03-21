import { useEffect, useRef, useState, RefObject } from 'react';
import { getVisionFilesetResolver } from '../utils/mediapipe';


export function useFaceTracker(videoRef: RefObject<HTMLVideoElement | null>, isEnabled: boolean) {
  const [faceData, setFaceData] = useState<{ 
    position: { x: number, y: number } | null, 
    mood: 'neutral' | 'happy' | 'sad' | 'stressed' | 'surprised' 
  }>({ position: null, mood: 'neutral' });

  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      if (typeof window === 'undefined') return;
      try {
        const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await getVisionFilesetResolver();
        if (!filesetResolver) return;
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",

          numFaces: 1
        });
        if (active) {
          landmarkerRef.current = faceLandmarker;
          setIsReady(true);
          console.log("[Face Tracker] Initialized successfully");
        }
      } catch (err) {
        console.error("[Face Tracker] Failed to initialize:", err);
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
      setFaceData({ position: null, mood: 'neutral' });
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
            
            if (detections.faceLandmarks && detections.faceLandmarks.length > 0) {
              const nose = detections.faceLandmarks[0][1];
              
              // Simple emotion detection logic based on blendshapes
              let detectedMood: 'neutral' | 'happy' | 'sad' | 'stressed' | 'surprised' = 'neutral';
              
              if (detections.faceBlendshapes && detections.faceBlendshapes.length > 0) {
                const shapes = detections.faceBlendshapes[0].categories;
                const getShape = (name: string) => shapes.find(s => s.categoryName === name)?.score || 0;

                const smile = (getShape('mouthSmileLeft') + getShape('mouthSmileRight')) / 2;
                const browDown = (getShape('browDownLeft') + getShape('browDownRight')) / 2;
                const browUp = getShape('browInnerUp');
                const eyeWide = (getShape('eyeWideLeft') + getShape('eyeWideRight')) / 2;
                const mouthFrown = (getShape('mouthFrownLeft') + getShape('mouthFrownRight')) / 2;

                if (smile > 0.4) detectedMood = 'happy';
                else if (browUp > 0.4 && eyeWide > 0.3) detectedMood = 'surprised';
                else if (browDown > 0.5) detectedMood = 'stressed';
                else if (mouthFrown > 0.3) detectedMood = 'sad';
              }

              setFaceData({
                position: {
                  x: (nose.x - 0.5) * -2,
                  y: (nose.y - 0.5) * -2
                },
                mood: detectedMood
              });
            } else {
              setFaceData({ position: null, mood: 'neutral' });
            }
          } catch(e) {
             // Silently ignore detection errors
          }
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isEnabled, isReady, videoRef]);

  return faceData;
}
