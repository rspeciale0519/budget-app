"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, type Group, type Mesh, type MeshStandardMaterial } from "three";

const COLS = 26;
const ROWS = 3;
const SPACING = 0.46;

/**
 * An animated field of vertical bars that ripples with a traveling wave and
 * gently trends upward left-to-right — evoking a live cash-flow forecast.
 */
function BarField() {
  const group = useRef<Group>(null);
  const meshes = useRef<(Mesh | null)[]>([]);

  const bars = useMemo(() => {
    const arr: { x: number; z: number; phase: number; rowDim: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        arr.push({
          x: (c - (COLS - 1) / 2) * SPACING,
          z: (r - (ROWS - 1) / 2) * 0.95,
          phase: c * 0.42 + r * 0.7,
          // Back rows render dimmer for depth.
          rowDim: 1 - r * 0.26,
        });
      }
    }
    return arr;
  }, []);

  const lowColor = useMemo(() => new Color("#6366f1"), []); // indigo (low)
  const highColor = useMemo(() => new Color("#22b07d"), []); // green (growth)
  const scratch = useMemo(() => new Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < meshes.current.length; i++) {
      const mesh = meshes.current[i];
      const b = bars[i];
      if (!mesh || !b) continue;

      const wave = Math.sin(t * 1.05 + b.phase) * 0.5 + 0.5;
      const trend = b.x / (COLS * SPACING) + 0.5; // 0 (left) -> 1 (right)
      const height = 0.45 + wave * 2.1 + trend * 1.5;

      mesh.scale.y = height;
      mesh.position.y = height / 2 - 1.3;

      const mix = Math.min(1, height / 4.2);
      scratch.copy(lowColor).lerp(highColor, mix);
      const mat = mesh.material as MeshStandardMaterial;
      mat.color.copy(scratch);
      mat.emissive.copy(scratch);
      mat.emissiveIntensity = 0.18 * b.rowDim;
      mat.opacity = 0.55 + 0.4 * b.rowDim;
    }
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.1) * 0.14;
    }
  });

  return (
    <group ref={group} rotation={[0.22, -0.32, 0]}>
      {bars.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          position={[b.x, 0, b.z]}
        >
          <boxGeometry args={[0.2, 1, 0.2]} />
          <meshStandardMaterial
            metalness={0.25}
            roughness={0.45}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 9], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 4]} intensity={1.3} />
      <pointLight position={[-5, 2, 3]} intensity={0.6} color="#6366f1" />
      <pointLight position={[5, -1, 4]} intensity={0.5} color="#22b07d" />
      <BarField />
    </Canvas>
  );
}
