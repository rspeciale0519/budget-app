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
  rotation,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  rotation: [number, number, number];
}) {
  return (
    <Float speed={1.8} rotationIntensity={1.1} floatIntensity={1.2}>
      <mesh position={position} scale={scale} rotation={rotation}>
        <cylinderGeometry args={[0.7, 0.7, 0.22, 48]} />
        <meshStandardMaterial
          color={color}
          metalness={0.55}
          roughness={0.28}
          emissive={color}
          emissiveIntensity={0.08}
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
        { position: [-3, 1.3, -0.5] as [number, number, number], color: "#e8b73d", scale: 0.95, rotation: [1.1, 0.5, 0.3] as [number, number, number] },
        { position: [3, 0.6, -1.5] as [number, number, number], color: "#6366f1", scale: 0.8, rotation: [0.8, -0.4, -0.2] as [number, number, number] },
        { position: [0.6, -1.6, 0] as [number, number, number], color: "#22b07d", scale: 0.9, rotation: [1.3, 0.2, 0.5] as [number, number, number] },
        { position: [-1.9, -1, -1.5] as [number, number, number], color: "#14b8a6", scale: 0.6, rotation: [0.6, 0.8, 0.1] as [number, number, number] },
        { position: [2.2, 2, -0.5] as [number, number, number], color: "#e8b73d", scale: 0.5, rotation: [1.0, -0.6, 0.4] as [number, number, number] },
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
      camera={{ position: [0, 0, 8], fov: 45 }}
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
