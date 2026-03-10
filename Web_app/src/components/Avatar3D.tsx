import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Icosahedron, Torus, Environment, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
    volume: number;
    isConnected: boolean;
}

function HolographicCore({ volume, isConnected }: Avatar3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const innerCoreRef = useRef<THREE.Mesh>(null);
    const wireframeRef = useRef<THREE.Mesh>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);
    const ring3Ref = useRef<THREE.Mesh>(null);

    // Dynamic Reactive Targets
    const targetScale = isConnected ? 1.0 + (volume * 0.8) : 0.8;
    const targetEmissive = isConnected ? Math.max(0.5, volume * 5.0) : 0.1;
    const targetRingSpeed = isConnected ? 1.0 + (volume * 10) : 0.2;

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Smooth Lerping for Scale
        groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Core Pulsing
        if (innerCoreRef.current) {
            const mat = innerCoreRef.current.material as THREE.MeshPhysicalMaterial;
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.1);
        }

        // Wireframe Pulsing
        if (wireframeRef.current) {
            const mat = wireframeRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive * 1.5, 0.1);
            wireframeRef.current.rotation.y += delta * 0.2;
            wireframeRef.current.rotation.x += delta * 0.1;
        }

        // Orbiting Rings
        if (ring1Ref.current && ring2Ref.current && ring3Ref.current) {
            ring1Ref.current.rotation.x += delta * targetRingSpeed * 0.5;
            ring1Ref.current.rotation.y += delta * targetRingSpeed * 0.3;

            ring2Ref.current.rotation.y -= delta * targetRingSpeed * 0.4;
            ring2Ref.current.rotation.z += delta * targetRingSpeed * 0.6;

            ring3Ref.current.rotation.x -= delta * targetRingSpeed * 0.7;
            ring3Ref.current.rotation.z -= delta * targetRingSpeed * 0.2;
        }

        // Make the entire group slightly 'look' towards the mouse
        const targetRotationX = (state.pointer.y * Math.PI) / 6;
        const targetRotationY = (state.pointer.x * Math.PI) / 6;

        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotationX, 0.05);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.05);
    });

    const activeColor = "#eab308"; // Golden Yellow
    const inactiveColor = "#52525b"; // Zinc/Gray
    const currentColor = isConnected ? activeColor : inactiveColor;

    return (
        <Float speed={isConnected ? 3 : 1} rotationIntensity={0.2} floatIntensity={0.5}>
            <group ref={groupRef}>
                
                {/* 1. Inner Refractive Glass Core */}
                <Icosahedron ref={innerCoreRef} args={[0.62, 5]} scale={1}>
                    <meshPhysicalMaterial 
                        color={currentColor}
                        emissive={currentColor}
                        emissiveIntensity={0.5}
                        roughness={0.05}
                        metalness={0.2}
                        transmission={1.0} // Fully transparent volumetric physical glass
                        thickness={2.0}
                        ior={2.3}          // High index of refraction like a diamond
                        clearcoat={1.0}
                        clearcoatRoughness={0.0}
                        transparent={true}
                        opacity={0.25}      // Low opacity to reveal wires
                        depthWrite={false} // CRITICAL: Allows drawing geometry behind this glass
                        side={THREE.DoubleSide}
                    />
                </Icosahedron>

                {/* 2. Outer Wireframe Energy Grid */}
                <Icosahedron ref={wireframeRef} args={[0.9, 3]}>
                    <meshStandardMaterial 
                        color={currentColor}
                        emissive={currentColor}
                        emissiveIntensity={1}
                        wireframe={true}
                        transparent
                        opacity={0.4}
                    />
                </Icosahedron>

                {/* 3. Orbiting Data Ring 1 (Inner) */}
                <Torus ref={ring1Ref} args={[1.2, 0.02, 16, 64]} rotation={[Math.PI / 4, 0, 0]}>
                    <meshStandardMaterial 
                        color={currentColor} 
                        emissive={currentColor}
                        emissiveIntensity={isConnected ? 2 : 0}
                        roughness={0.1} 
                        metalness={1} 
                        transparent 
                        opacity={0.6}
                    />
                </Torus>

                {/* 4. Orbiting Data Ring 2 (Middle) */}
                <Torus ref={ring2Ref} args={[1.6, 0.015, 16, 64]} rotation={[0, Math.PI / 3, 0]}>
                     <meshStandardMaterial 
                        color={currentColor} 
                        emissive={currentColor}
                        emissiveIntensity={isConnected ? 1.5 : 0}
                        roughness={0.1} 
                        metalness={1} 
                        transparent 
                        opacity={0.4}
                    />
                </Torus>

                {/* 5. Orbiting Data Ring 3 (Outer) */}
                <Torus ref={ring3Ref} args={[2.0, 0.03, 16, 128]} rotation={[Math.PI / 6, Math.PI / 2, Math.PI / 8]}>
                     <meshStandardMaterial 
                        color={currentColor} 
                        emissive={currentColor}
                        emissiveIntensity={isConnected ? 3 : 0}
                        roughness={0.2} 
                        metalness={0.8} 
                        transparent 
                        opacity={0.8}
                    />
                </Torus>

                {/* Optional: Central Glow Sprite/Sphere */}
                <Sphere args={[0.7, 32, 32]}>
                    <meshBasicMaterial 
                        color={currentColor} 
                        transparent 
                        opacity={isConnected ? 0.15 : 0.05} 
                        blending={THREE.AdditiveBlending} 
                    />
                </Sphere>

            </group>
        </Float>
    );
}

export default function Avatar3D({ volume, isConnected }: Avatar3DProps) {
    return (
        <div className="w-full h-full absolute inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="w-full h-full" gl={{ antialias: true, alpha: true }}>
                <ambientLight intensity={0.2} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} color={isConnected ? "#fef08a" : "#ffffff"} />
                <pointLight position={[-10, -10, -5]} intensity={1} color={isConnected ? "#ca8a04" : "#a1a1aa"} />
                
                {/* Core Hologram */}
                <HolographicCore volume={volume} isConnected={isConnected} />
                
                {/* Advanced Environment reflections mapping */}
                <Environment preset="night" />
            </Canvas>
        </div>
    );
}
