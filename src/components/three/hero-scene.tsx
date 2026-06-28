"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Group } from "three";

/** A single floating coin (flat cylinder) tinted with a brand color. */
function Coin({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  return (
    <Float speed={2.2} rotationIntensity={1.6} floatIntensity={1.4}>
      <mesh position={position} scale={scale} rotation={[Math.PI / 2.4, 0.4, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.16, 48]} />
        <meshStandardMaterial
          color={color}
          metalness={0.45}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
    </Float>
  );
}

function Coins() {
  const group = useRef<Group>(null);
  const coins = useMemo(
    () =>
      [
        { position: [-2.2, 1.1, 0] as [number, number, number], color: "#f5c542", scale: 1.1 },
        { position: [2.1, 0.4, -1] as [number, number, number], color: "#4f46e5", scale: 0.9 },
        { position: [0.2, -1.2, 0.5] as [number, number, number], color: "#16a34a", scale: 1 },
        { position: [-1.4, -0.8, -1.2] as [number, number, number], color: "#0d9488", scale: 0.7 },
        { position: [1.6, 1.6, 0.4] as [number, number, number], color: "#f5c542", scale: 0.6 },
      ],
    [],
  );

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.3;
    }
  });

  return (
    <group ref={group}>
      {coins.map((c, i) => (
        <Coin key={i} {...c} />
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={1.6} />
      <pointLight position={[-4, -3, 2]} intensity={0.7} color="#4f46e5" />
      <pointLight position={[0, 2, 5]} intensity={0.9} color="#fbbf24" />
      <Coins />
    </Canvas>
  );
}
