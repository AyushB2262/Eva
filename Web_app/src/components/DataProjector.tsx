import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface DataProjectorProps {
  data: number[];
  type: 'bar' | 'pulse';
  color?: string;
  handPosition?: { x: number, y: number, z: number } | null;
  gesture?: 'none' | 'pinch' | 'swipe_left' | 'swipe_right' | 'point';
  onDismiss?: () => void;
}

export default function DataProjector({ data, type, color = "#eab308", handPosition, gesture, onDismiss }: DataProjectorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  const targetPosRef = useRef(new THREE.Vector3(0, -0.2, 0));

  // Handle Hand Interaction
  useEffect(() => {
    if (gesture === 'pinch' && handPosition) {
      // Offset slightly to be interactive but not covering the hand
      targetPosRef.current.set(handPosition.x - 1.5, handPosition.y, handPosition.z);
    } else if (gesture === 'swipe_left' || gesture === 'swipe_right') {
      console.log(`[DataProjector] Gesture '${gesture}' detected. Dismissing graph.`);
      if (onDismiss) onDismiss();
    }
  }, [gesture, handPosition, onDismiss]);

  // Safety: Ensure data is an array and not empty
  const graphData = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const maxVal = useMemo(() => {
    const val = Math.max(...graphData);
    return isFinite(val) && val > 0 ? val : 1;
  }, [graphData]);

  const bars = useMemo(() => {
    if (type !== 'bar') return [];
    return graphData.slice(0, 10).map(v => (v / maxVal) * 1.2);
  }, [graphData, type, maxVal]);

  const pulsePoints = useMemo(() => {
    if (type !== 'pulse') return [];
    const points = [];
    const step = 0.3;
    const len = Math.min(graphData.length, 20);
    for (let i = 0; i < len; i++) {
        const h = (graphData[i] / maxVal) * 0.8;
        points.push(new THREE.Vector3(i * step - (len * step / 2), h, 0));
    }
    return points;
  }, [graphData, type, maxVal]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.5 * delta;
      
      // Smooth movement to target (hand-tracking)
      groupRef.current.position.lerp(targetPosRef.current, 5 * delta);

      // Smooth scale in
      const targetScale = graphData.length > 0 ? 1 : 0;
      const nextScale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 3 * delta);
      groupRef.current.scale.set(nextScale, nextScale, nextScale);
      
      if (textRef.current && textRef.current.material) {
         textRef.current.material.opacity = nextScale;
      }
    }
  });

  if (graphData.length === 0) return null;

  return (
    <group ref={groupRef} position={[0, -0.2, 0]} scale={0}>
      {type === 'bar' && bars.map((h, i) => (
        <group key={i} position={[(i - bars.length / 2) * 0.25, 0, 0]}>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[0.15, Math.max(0.01, h), 0.15]} />
            <meshStandardMaterial 
              color={color} 
              emissive={color} 
              emissiveIntensity={2} 
              transparent 
              opacity={0.6} 
            />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
             <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
             <meshStandardMaterial color={color} transparent opacity={0.3} />
          </mesh>
        </group>
      ))}

      {type === 'pulse' && (
        <group>
           {pulsePoints.map((p, i) => {
              if (i === 0) return null;
              const prev = pulsePoints[i-1];
              return (
                <mesh key={i} position={[ (p.x + prev.x)/2, (p.y + prev.y)/2, 0 ]}>
                  <boxGeometry args={[0.32, 0.02, 0.02]} />
                  <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={4} 
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              )
           })}
        </group>
      )}

      <Text
        ref={textRef}
        position={[0, -0.6, 0]}
        fontSize={0.12}
        color={color}
        anchorX="center"
        anchorY="middle"
        fillOpacity={1}
      >
        ANALYZING DATASTREAM...
      </Text>
    </group>
  );
}
