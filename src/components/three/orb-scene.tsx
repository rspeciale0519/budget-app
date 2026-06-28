"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

/**
 * Reactive "safe-to-spend" orb. `health` (0..1) shifts the color from
 * red (over budget) through amber to green (healthy) and modulates the
 * distortion so a tight budget looks more turbulent.
 */
function Orb({ health }: { health: number }) {
  const mesh = useRef<Mesh>(null);

  // Interpolate hue: 0 -> red(0deg), 0.5 -> amber(40deg), 1 -> green(140deg)
  const hue = 0 + health * 140;
  const color = `hsl(${hue}, 70%, 55%)`;
  const distort = 0.45 - health * 0.25;

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = state.clock.elapsedTime * 0.25;
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={mesh} scale={1.6}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={2.2}
          roughness={0.25}
          metalness={0.2}
          emissive={color}
          emissiveIntensity={0.18}
        />
      </mesh>
    </Float>
  );
}

export default function OrbScene({ health }: { health: number }) {
  const clamped = Math.max(0, Math.min(1, health));
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 3, 3]} intensity={1.4} />
      <pointLight position={[-3, -2, -2]} intensity={0.6} />
      <pointLight position={[2, 1, 4]} intensity={0.8} color="#a5b4fc" />
      <Orb health={clamped} />
    </Canvas>
  );
}
