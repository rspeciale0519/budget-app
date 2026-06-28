"use client";

import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";

/**
 * A friendly floating "savings jar": a translucent glass cylinder with a
 * couple of coins inside and a lid. Purely decorative for empty states.
 */
function Jar() {
  return (
    <Float speed={2.4} rotationIntensity={0.5} floatIntensity={1.1}>
      <group scale={1.1}>
        {/* glass body */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.9, 0.85, 1.6, 48, 1, true]} />
          <meshStandardMaterial
            color="#9fd6ff"
            roughness={0.15}
            metalness={0.1}
            transparent
            opacity={0.45}
          />
        </mesh>
        {/* lid */}
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.95, 0.95, 0.18, 48]} />
          <meshStandardMaterial color="#4f46e5" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* coins inside */}
        <mesh position={[0.18, -0.5, 0]} rotation={[Math.PI / 2.6, 0.3, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.12, 32]} />
          <meshStandardMaterial color="#f5c542" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[-0.2, -0.62, 0.1]} rotation={[Math.PI / 2.2, -0.2, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.12, 32]} />
          <meshStandardMaterial color="#16a34a" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

export default function MascotScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.4], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 3]} intensity={1.3} />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#4f46e5" />
      <pointLight position={[2, 1, 4]} intensity={0.7} color="#fbbf24" />
      <Jar />
    </Canvas>
  );
}
