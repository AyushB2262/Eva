import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sphere, Cylinder } from '@react-three/drei';

import * as THREE from 'three';

import HologramWidget from './HologramWidget';
import DataProjector from './DataProjector';


interface Avatar3DProps {
  volume: number;
  isConnected: boolean;
  facePosition?: { x: number, y: number } | null;
  activeTask?: { id: string, message: string } | null;
  mood?: 'neutral' | 'happy' | 'sad' | 'stressed' | 'surprised';
  handPosition?: { x: number, y: number, z: number } | null;
  gesture: 'none' | 'pinch' | 'swipe_left' | 'swipe_right' | 'point';
  projectionData: { values: number[], type: 'bar' | 'pulse' } | null;
  clearProjection?: () => void;
}


interface HolographicCoreProps {
  volume: number;
  isConnected: boolean;
  facePosition?: { x: number, y: number } | null;
  mood?: 'neutral' | 'happy' | 'sad' | 'stressed' | 'surprised';
}







// Custom Shader for the internal "Circular Code" patterns
const CodeRingsShader = {
  uniforms: {
    uTime: { value: 0 },
    uVolume: { value: 0 },
    uColor: { value: new THREE.Color("#eab308") },
    uInactiveColor: { value: new THREE.Color("#422006") },
    uIsConnected: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uVolume;
    uniform vec3 uColor;
    uniform vec3 uInactiveColor;
    uniform float uIsConnected;
    varying vec2 vUv;
    varying vec3 vPosition;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vec2 center = vec2(0.5);
      float dist = distance(vUv, center);
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      
      float ringId = floor(dist * 20.0);
      float speed = (random(vec2(ringId)) - 0.5) * 2.0;
      
      float code = step(0.6, sin(angle * 40.0 + uTime * speed * 5.0 + random(vec2(ringId)) * 6.28));
      code *= step(0.2, fract(dist * 20.0));
      
      float burst = uVolume * 2.5 * step(0.92, random(vec2(floor(uTime * 15.0), ringId)));
      float alpha = code * smoothstep(0.48, 0.1, dist) * (0.5 + burst);
      
      // Dynamic mood color mapping
      vec3 glow = uColor * (1.8 + uVolume * 4.0);
      vec3 baseColor = mix(uInactiveColor, glow, uIsConnected);
      
      gl_FragColor = vec4(baseColor, alpha * (uIsConnected * 0.8 + 0.2) + 0.05);
    }
  `
};


function HolographicCore({ volume, isConnected, facePosition, mood = 'neutral' }: HolographicCoreProps) {


  const coreRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const mechRef = useRef<THREE.Group>(null);
  const planetsRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);

  // Dynamic colors based on mood
  const moodColors = useMemo(() => ({
    neutral: { main: '#eab308', glow: '#ca8a04', inner: '#422006' }, // Gold/Yellow
    happy: { main: '#fde047', glow: '#facc15', inner: '#713f12' },   // Bright Gold
    sad: { main: '#3b82f6', glow: '#1d4ed8', inner: '#1e3a8a' },    // Deep Blue
    stressed: { main: '#ef4444', glow: '#b91c1c', inner: '#7f1d1d' }, // Pulsing Red
    surprised: { main: '#06b6d4', glow: '#0891b2', inner: '#164e63' } // Cyan
  }), []);

  const colors = moodColors[mood as keyof typeof moodColors] || moodColors.neutral;



  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += delta;
      shaderRef.current.uniforms.uVolume.value = THREE.MathUtils.lerp(shaderRef.current.uniforms.uVolume.value, volume, 0.2);
      shaderRef.current.uniforms.uIsConnected.value = THREE.MathUtils.lerp(shaderRef.current.uniforms.uIsConnected.value, isConnected ? 1 : 0, 0.1);
      shaderRef.current.uniforms.uColor.value.lerp(new THREE.Color(colors.main), 0.1);
      shaderRef.current.uniforms.uInactiveColor.value.lerp(new THREE.Color(colors.inner), 0.1);
    }


    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.15;
      const scale = 1.0 + (volume * 0.15);
      coreRef.current.scale.set(scale, scale, scale);
    }

    if (mechRef.current) {
      mechRef.current.rotation.y -= delta * 0.08;
      mechRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }

    if (planetsRef.current) {
      planetsRef.current.children.forEach((obj, i) => {
        const speed = 0.5 + (i * 0.2);
        obj.rotation.y += delta * speed;
        // Pulse planet glow
        const mat = (obj.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.3;
      });
    }

    if (glowRef.current) {
      const glowScale = 1.6 + (volume * 1.2);
      glowRef.current.scale.lerp(new THREE.Vector3(glowScale, glowScale, glowScale), 0.1);
    }

    if (tiltGroupRef.current) {
      const targetX = facePosition?.y ? facePosition.y * 0.4 : 0; // Tilt pitch
      const targetY = facePosition?.x ? facePosition.x * 0.4 : 0; // Tilt yaw

      tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.x, targetX, 5 * delta);
      tiltGroupRef.current.rotation.y = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.y, targetY, 5 * delta);
    }
  });


  const activeColor = "#eab308";
  const amberColor = "#422006";

  const planets = [
    { radius: 1.4, size: 0.06, speed: 0.8 },
    { radius: 1.8, size: 0.04, speed: 0.5 },
    { radius: 2.2, size: 0.05, speed: 1.1 }
  ];

  return (
    <group ref={tiltGroupRef} scale={0.7}>
      
      {/* 1. Internal Core with Code Shader */}

      <group ref={coreRef}>
        <Sphere args={[0.7, 32, 32]}>
          <shaderMaterial
            ref={shaderRef}
            attach="material"
            {...CodeRingsShader}
            transparent={true}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>
        
        {/* Refractive Glass Shell */}
        <Sphere args={[0.82, 32, 32]}>
          <meshPhysicalMaterial
            color={colors.main}
            transmission={1}
            thickness={2.5}
            roughness={0.0}
            ior={2.4}
            reflectivity={1}
            envMapIntensity={5}
            clearcoat={1}
            transparent={true}
            opacity={0.8}
          />
        </Sphere>

      </group>

      {/* 2. Solar System Planets / Data Nodes */}
      <group ref={planetsRef}>
        {planets.map((p, i) => (
          <group key={i}>
            {/* Orbit Path - Unified color and enhanced glow */}
            <Torus args={[p.radius, 0.005, 8, 64]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial 
                color={colors.main} 
                emissive={colors.main} 
                emissiveIntensity={isConnected ? 8 : 1} 
                transparent 
                opacity={0.3} 
              />
            </Torus>


            {/* Planet / Node */}
            <group rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
              <Sphere args={[p.size, 12, 12]} position={[p.radius, 0, 0]}>
                <meshBasicMaterial color={colors.main} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
                {/* Planet Aura */}
                <Sphere args={[p.size * 2, 12, 12]}>
                   <meshBasicMaterial color={colors.main} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
                </Sphere>
              </Sphere>
            </group>

          </group>
        ))}
      </group>


      {/* 2. Cyberpunk Mech Cage / Surrounding Structure */}
      <group ref={mechRef}>
        {/* Vertical Brackets */}
        {[0, 120, 240].map((rot) => (
          <group key={rot} rotation={[0, THREE.MathUtils.degToRad(rot), 0]}>
            {/* Main Curved Arm */}
            <Torus args={[1.05, 0.04, 8, 32, Math.PI * 0.6]} rotation={[Math.PI / 2, Math.PI / 5, 0]}>
              <meshStandardMaterial color="#18181b" roughness={0.1} metalness={1} />
            </Torus>
            {/* Note: Industrial Joints (Black Balls) removed per user request for optimization */}
            
            {/* Glowing Cables looping through arms - Intensified Glow */}
            <Torus args={[1.1, 0.01, 6, 48, Math.PI * 0.6]} rotation={[Math.PI / 2, Math.PI / 5, 0]} position={[0.02, 0.02, 0]}>
              <meshStandardMaterial 
                color={colors.main} 
                emissive={colors.main} 
                emissiveIntensity={isConnected ? 15 : 0.5} 
                transparent 
                opacity={1} 
              />
            </Torus>


          </group>
        ))}
      </group>

      {/* 3. Intense Central Glow */}
      <Sphere ref={glowRef} args={[0.4, 16, 16]}>
        <meshBasicMaterial
          color={colors.main}
          transparent={true}
          opacity={isConnected ? 0.35 : 0}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>


      {/* 4. Heavy Industrial Pedestal (Engine Mount) */}
      <group position={[0, -1.3, 0]}>
        {/* Multi-layered metallic base */}
        <Cylinder args={[1.1, 1.2, 0.2, 32]}>
          <meshStandardMaterial color="#09090b" roughness={0.1} metalness={1} />
        </Cylinder>
        <Cylinder args={[0.8, 1.1, 0.4, 16]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color="#18181b" roughness={0.2} metalness={0.9} />
        </Cylinder>
        
        {/* Rotating Internal Engine Ring */}
        <Torus args={[0.95, 0.03, 8, 64]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <meshStandardMaterial 
            color="#27272a" 
            roughness={0} 
            metalness={1}
          />
        </Torus>

        {/* Glowing Rim Conduits */}
        <Torus args={[1.0, 0.015, 8, 64]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <meshStandardMaterial 
            color={activeColor} 
            emissive={activeColor} 
            emissiveIntensity={isConnected ? 6 : 0.5} 
            transparent 
            opacity={0.9}
          />
        </Torus>

        {/* Small Data Hub / Indicator Lights */}
        {[0, 1.57, 3.14, 4.71].map((angle, i) => (
          <Sphere key={i} args={[0.04, 12, 12]} position={[Math.cos(angle) * 1.05, 0, Math.sin(angle) * 1.05]}>
            <meshBasicMaterial color={activeColor} transparent opacity={isConnected ? 0.8 : 0.2} />
          </Sphere>
        ))}
      </group>

      {isConnected && <EnergyParticles count={60} color={activeColor} />}
    </group>
  );
}




function EnergyParticles({ count, color }: { count: number; color: string }) {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.0 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.002;
      ref.current.rotation.x += 0.001;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function Torus({ args, ...props }: any) {
  return (
    <mesh {...props}>
      <torusGeometry args={args} />
    </mesh>
  );
}

export default function Avatar3D({ volume, isConnected, facePosition, activeTask, mood, handPosition, gesture, projectionData, clearProjection }: Avatar3DProps) {





  return (



    <div className="w-full h-full absolute inset-0 z-0 pointer-events-none">
      <Canvas 
        key="eva-main-canvas"
        camera={{ position: [0, 0, 4], fov: 40 }} 
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ReinhardToneMapping }}
        onCreated={() => console.log("[3D] Canvas Context Created Successfully")}
      >
        <React.Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <pointLight position={[5, 5, 5]} intensity={2} color="#fef08a" />
          <pointLight position={[-5, -5, -5]} intensity={1} color="#ca8a04" />
          
          {/* Center Panel: Orb */}
          <Float speed={isConnected ? 2 : 0.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <HolographicCore volume={volume} isConnected={isConnected} facePosition={facePosition} mood={mood} />
          </Float>


          {/* 3D Data Projector - Offset to the left */}
          {projectionData?.values && (
            <group position={[-1.2, 0.5, 0]}>
              <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                 <DataProjector 
                   data={projectionData.values} 
                   type={projectionData.type || 'bar'} 
                   color={mood === 'neutral' || mood === 'happy' ? "#eab308" : "#ffffff"} 
                   handPosition={handPosition}
                   gesture={gesture}
                   onDismiss={clearProjection}
                 />

              </Float>
            </group>
          )}



          {/* Reactive UI Widgets - Offset to the right */}
          <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.1}>
            <HologramWidget 
              task={activeTask} 
              handPosition={handPosition} 
              gesture={gesture} 
            />
          </Float>

          <Environment preset="city" />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </React.Suspense>
      </Canvas>
    </div>


  );
}
