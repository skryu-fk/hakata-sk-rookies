"use client";

/**
 * ヒーローの本格3D（three.js / react-three-fiber）。
 * 回転する野球ボール＋グローする縫い目＋金/赤のパーティクル。
 * ブランド配色のみ使用。client-only（next/dynamic ssr:false 経由で読み込む）。
 */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** 球面に巻きつく波打つ縫い目カーブ（野球ボールのシーム風） */
function seamCurve(radius = 1.012, amp = 0.58, n = 320): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const theta = Math.PI / 2 + amp * Math.sin(2 * t); // 緯度を2回上下させる
    const phi = t;
    pts.push(new THREE.Vector3(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.cos(theta),
      radius * Math.sin(theta) * Math.sin(phi),
    ));
  }
  return new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
}

function Baseball() {
  const group = useRef<THREE.Group>(null);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const seamGeo = useMemo(() => new THREE.TubeGeometry(seamCurve(), 480, 0.02, 10, true), []);
  // 縫い目に沿った“ステッチ”の小片
  const stitches = useMemo(() => {
    const curve = seamCurve(1.02);
    const N = 120;
    const m: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const pos = curve.getPointAt(u);
      const tan = curve.getTangentAt(u).normalize();
      const normal = pos.clone().normalize();
      const binormal = new THREE.Vector3().crossVectors(tan, normal).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, binormal);
      m.push({ pos, quat });
    }
    return m;
  }, []);

  useFrame((state, delta) => {
    if (!group.current || reduced) return;
    group.current.rotation.y += delta * 0.35;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
    group.current.rotation.z = state.pointer.x * 0.12; // マウス追従の軽いパララックス
  });

  return (
    <group ref={group} rotation={[0.2, 0, 0.15]}>
      {/* ボール本体 */}
      <mesh castShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.5} metalness={0.08} />
      </mesh>
      {/* 縫い目（赤・発光） */}
      <mesh geometry={seamGeo}>
        <meshStandardMaterial color="#d10024" emissive="#d10024" emissiveIntensity={0.55} roughness={0.35} metalness={0.1} />
      </mesh>
      {/* ステッチ */}
      {stitches.map((s, i) => (
        <mesh key={i} position={s.pos} quaternion={s.quat}>
          <boxGeometry args={[0.07, 0.012, 0.012]} />
          <meshStandardMaterial color="#a80019" emissive="#d10024" emissiveIntensity={0.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const n = 320;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const gold = new THREE.Color("#d4a82a");
    const red = new THREE.Color("#d10024");
    for (let i = 0; i < n; i++) {
      const r = 2.2 + Math.random() * 3.2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = Math.random() > 0.5 ? gold : red;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += d * 0.04; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** 回転するホログラム風リング（近未来アクセント） */
function HoloRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => { if (ref.current) { ref.current.rotation.z += d * 0.15; ref.current.rotation.x = 1.2; } });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.7, 0.006, 8, 120]} />
      <meshBasicMaterial color="#d4a82a" transparent opacity={0.5} />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.5], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.7} color="#fff6e2" />
      <directionalLight position={[-4, -2, -3]} intensity={1.0} color="#d10024" />
      <pointLight position={[0, 1, 3]} intensity={0.7} color="#d4a82a" />
      <Baseball />
      <HoloRing />
      <Particles />
    </Canvas>
  );
}
