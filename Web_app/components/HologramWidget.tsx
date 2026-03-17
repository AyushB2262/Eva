import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface HologramWidgetProps {
  task: { id: string, message: string } | null;
  handPosition?: { x: number, y: number, z: number } | null;
  gesture?: string;
}

export default function HologramWidget({ task, handPosition, gesture }: HologramWidgetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const swipeDir = useRef(new THREE.Vector3(0,0,0));

  
  // Keep track of the task we are currently displaying so we can animate it out fully before it disappears
  const [displayedTask, setDisplayedTask] = useState(task);


  useFrame((state, delta) => {
    if (groupRef.current) {
      // Swipe Dismiss Logic
      if (!isDismissed && (gesture === 'swipe_left' || gesture === 'swipe_right')) {
        setIsDismissed(true);
        swipeDir.current.set(gesture === 'swipe_right' ? 20 : -20, 0, 0);
      }

      if (isDismissed) {
        groupRef.current.position.addScaledVector(swipeDir.current, delta);
        groupRef.current.scale.lerp(new THREE.Vector3(0,0,0), 5 * delta);
        if (groupRef.current.scale.x < 0.01) {
           setIsDismissed(false);
           setDisplayedTask(null);
        }
        return;
      }

      // Interaction Logic
      const isPinched = gesture === 'pinch' && handPosition;
      const targetPos = isPinched 
        ? new THREE.Vector3(handPosition.x, handPosition.y, handPosition.z)
        : new THREE.Vector3(1.8, 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1, 1);

      groupRef.current.position.lerp(targetPos, isPinched ? 20 * delta : 3 * delta);

      // Smooth scale in/out
      const targetScale = task ? 1 : 0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 10 * delta);

      // Always billboard towards the camera
      groupRef.current.lookAt(state.camera.position);

      // Update displayed task logic
      if (!task && groupRef.current.scale.x < 0.01) {
         if (displayedTask) setDisplayedTask(null);
      } else if (task && task !== displayedTask) {
         setDisplayedTask(task);
         setIsDismissed(false);
      }
    }
  });


  return (
    <group ref={groupRef} position={[1.8, 0.8, 1]} scale={0}>
      {displayedTask && (
        <Html transform distanceFactor={5} center sprite zIndexRange={[100, 0]}>
           <div className="flex flex-col gap-2 bg-zinc-950/80 w-[240px] pointer-events-none shadow-xl border border-yellow-500/30 rounded-xl overflow-hidden p-4 relative backdrop-blur-md">
              <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
              <div className="flex items-center gap-2 relative z-10">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></div>
                  <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest font-bold">Processing Core</span>
              </div>
              <div className="h-[1px] w-full bg-gradient-to-r from-yellow-500/50 to-transparent my-1 relative z-10"></div>
              <span className="text-sm font-medium text-zinc-100 leading-relaxed font-sans relative z-10">
                {displayedTask.message}
              </span>
              <div className="mt-2 text-[9px] font-mono text-zinc-500 uppercase flex justify-between tracking-wider relative z-10">
                  <span>Task UID</span>
                  <span>{displayedTask.id.substring(0, 8)}</span>
              </div>
           </div>
        </Html>
      )}
    </group>
  );
}

