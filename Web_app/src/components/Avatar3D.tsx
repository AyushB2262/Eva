import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Sphere, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
    volume: number;
    isConnected: boolean;
}

function ReactiveCore({ volume, isConnected }: Avatar3DProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Base scale is 0.72 (reduced by 10%). When person speaks, scale pulses up to 1.35 based on volume
    const targetScale = isConnected ? 0.9 + (volume * 0.45) : 0.72;
    // Distort amount increases when speaking
    const targetDistort = isConnected ? Math.max(0.2, volume * 0.8) : 0;
    // Speed of the liquid morphing
    const targetSpeed = isConnected ? Math.max(1, volume * 5) : 0.5;

    useFrame((state, delta) => {
        if (!isConnected || volume < 0.05) return; // Throttle math when idle

        if (meshRef.current) {
            // Lerp scale for smooth juiciness
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

            // Make the orb 'look' or tilt slightly towards the mouse pointer
            const targetRotationX = (state.pointer.y * Math.PI) / 8;
            const targetRotationY = (state.pointer.x * Math.PI) / 8;

            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotationX, 0.05);
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, 0.05);
        }
    });

    return (
        <Float speed={isConnected ? 2 : 1} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere ref={meshRef} args={[1, 64, 64]} scale={0.72}>
                <MeshDistortMaterial
                    color={isConnected ? "#eab308" : "#52525b"} // Yellow when active, Zinc when inactive
                    envMapIntensity={1}
                    clearcoat={0.8}
                    clearcoatRoughness={0.2}
                    metalness={0.7}
                    roughness={0.2}
                    distort={targetDistort}
                    speed={targetSpeed}
                />
            </Sphere>

            <Sphere args={[0.5, 32, 32]}>
                <meshBasicMaterial color={isConnected ? "#fef08a" : "#27272a"} transparent opacity={0.6} />
            </Sphere>
        </Float>
    );
}

export default function Avatar3D({ volume, isConnected }: Avatar3DProps) {
    return (
        <div className="w-full h-full absolute inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }} className="w-full h-full">
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color={isConnected ? "#facc15" : "#ffffff"} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color={isConnected ? "#ca8a04" : "#a1a1aa"} />
                <ReactiveCore volume={volume} isConnected={isConnected} />
                <Environment preset="city" />
                {/* Allow user to pan/zoom slightly but return to center (disabled for now to keep it UI-like) */}
                {/* <OrbitControls enableZoom={false} enablePan={false} /> */}
            </Canvas>
        </div>
    );
}
