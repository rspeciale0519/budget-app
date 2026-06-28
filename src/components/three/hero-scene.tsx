"use client";

/**
 * Login hero — an ambient "cash-flow" data scene.
 *
 * Several smooth lines flow left-to-right across a receding, fading grid,
 * each undulating with a layered sine wave and trending gently upward. A
 * glowing marker rides the leading edge of every line. The motif mirrors the
 * app's cash-flow forecast chart, reading instantly as a finance product.
 *
 * Purely decorative and lazy-loaded; the reduced-motion fallback lives in the
 * `login-hero` wrapper.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Grid } from "@react-three/drei";
import { Vector3, type Mesh, type Group, type BufferGeometry } from "three";

/** Minimal shape of the Line2 instance drei forwards (avoids a three-stdlib type import). */
type FatLine = { geometry: BufferGeometry & { setPositions: (a: number[]) => void } };

const SEGMENTS = 140;
const X_MIN = -7;
const X_MAX = 7;
const SPAN = X_MAX - X_MIN;

type LineSpec = {
  color: string;
  /** vertical band the line trends through, left -> right */
  startY: number;
  endY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  z: number;
};

const LINES: LineSpec[] = [
  // The "growth" line — brightest, climbs the most.
  { color: "#22b07d", startY: -1.4, endY: 1.9, amplitude: 0.42, frequency: 0.9, speed: 0.55, phase: 0, z: 0.4 },
  { color: "#6366f1", startY: -0.6, endY: 1.1, amplitude: 0.55, frequency: 0.7, speed: 0.42, phase: 1.7, z: -0.6 },
  { color: "#14b8a6", startY: -1.9, endY: 0.4, amplitude: 0.34, frequency: 1.2, speed: 0.66, phase: 3.1, z: -1.6 },
];

/** Height of a line at normalized x (0..1) and time t. */
function sampleY(spec: LineSpec, xNorm: number, t: number): number {
  const trend = spec.startY + (spec.endY - spec.startY) * xNorm;
  const x = X_MIN + SPAN * xNorm;
  const wave =
    Math.sin(x * spec.frequency + t * spec.speed + spec.phase) * spec.amplitude +
    Math.sin(x * spec.frequency * 0.5 - t * spec.speed * 0.6) * spec.amplitude * 0.35;
  return trend + wave;
}

function FlowLine({ spec }: { spec: LineSpec }) {
  const lineRef = useRef<FatLine>(null);
  const dotRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  const initial = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const xNorm = i / SEGMENTS;
      pts.push(new Vector3(X_MIN + SPAN * xNorm, sampleY(spec, xNorm, 0), spec.z));
    }
    return pts;
  }, [spec]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flat: number[] = [];
    let tipY = 0;
    for (let i = 0; i <= SEGMENTS; i++) {
      const xNorm = i / SEGMENTS;
      const y = sampleY(spec, xNorm, t);
      if (i === SEGMENTS) tipY = y;
      flat.push(X_MIN + SPAN * xNorm, y, spec.z);
    }
    lineRef.current?.geometry.setPositions(flat);
    if (dotRef.current) dotRef.current.position.set(X_MAX, tipY, spec.z);
    if (glowRef.current) {
      glowRef.current.position.set(X_MAX, tipY, spec.z);
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2.4 + spec.phase) * 0.18);
    }
  });

  return (
    <group>
      <Line
        ref={lineRef as never}
        points={initial}
        color={spec.color}
        lineWidth={2.4}
        transparent
        opacity={0.92}
        frustumCulled={false}
      />
      {/* leading marker */}
      <mesh ref={dotRef} position={[X_MAX, spec.endY, spec.z]}>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshStandardMaterial color={spec.color} emissive={spec.color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* soft halo around the marker */}
      <mesh ref={glowRef} position={[X_MAX, spec.endY, spec.z]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.16} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Scene() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    // very slow parallax sway so the whole field feels alive
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 4, 6]} intensity={0.8} />
      <pointLight position={[-5, -2, 2]} intensity={0.5} color="#6366f1" />

      {/* receding data floor */}
      <group position={[0, -2.6, -1]}>
        <Grid
          args={[28, 22]}
          cellSize={0.7}
          cellThickness={0.6}
          cellColor="#6366f1"
          sectionSize={3.5}
          sectionThickness={1}
          sectionColor="#22b07d"
          fadeDistance={26}
          fadeStrength={2.4}
          infiniteGrid
        />
      </group>

      {LINES.map((spec, i) => (
        <FlowLine key={i} spec={spec} />
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
      <Scene />
    </Canvas>
  );
}
