'use client'

import {
  Center,
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  Sparkles,
  useGLTF,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

type Props = { modelUrl?: string | null; accent: string; variant?: 'character' | 'weapon' }

/** A glTF/GLB figure, centred on the stage and scaled to ~1.8 units tall. */
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const prepared = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const scale = size.y > 0 ? 1.8 / size.y : 1
    clone.scale.setScalar(scale)
    return clone
  }, [scene])
  return (
    <Center top>
      <primitive object={prepared} />
    </Center>
  )
}

/**
 * Holographic stand-in while a character's figure is still in production:
 * an abstract operator silhouette in wireframe with a scanning ring.
 */
function Hologram({ accent }: { accent: string }) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const color = useMemo(() => new THREE.Color(accent), [accent])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (group.current) group.current.position.y = Math.sin(t * 0.8) * 0.03
    if (ring.current) {
      ring.current.position.y = 0.1 + ((t * 0.45) % 1.9)
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.9 - ((t * 0.45) % 1.9) / 2.4
    }
  })

  const wire = (
    <meshStandardMaterial
      color={color}
      wireframe
      emissive={color}
      emissiveIntensity={0.6}
      transparent
      opacity={0.55}
    />
  )

  return (
    <group ref={group}>
      {/* head */}
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.16, 14, 10]} />
        {wire}
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.24, 0.5, 4, 10]} />
        {wire}
      </mesh>
      {/* arms */}
      <mesh position={[-0.36, 1.12, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.07, 0.55, 3, 8]} />
        {wire}
      </mesh>
      <mesh position={[0.36, 1.12, 0]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.07, 0.55, 3, 8]} />
        {wire}
      </mesh>
      {/* legs */}
      <mesh position={[-0.13, 0.42, 0]}>
        <capsuleGeometry args={[0.09, 0.62, 3, 8]} />
        {wire}
      </mesh>
      <mesh position={[0.13, 0.42, 0]}>
        <capsuleGeometry args={[0.09, 0.62, 3, 8]} />
        {wire}
      </mesh>
      {/* scanning ring */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.46, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <Sparkles
        count={40}
        scale={[1.6, 2.2, 1.6]}
        position={[0, 1, 0]}
        size={2}
        speed={0.4}
        color={color}
        opacity={0.6}
      />
    </group>
  )
}

/** Abstract wireframe firearm, floating and slowly rolling, for weapons without a model yet. */
function WeaponHologram({ accent }: { accent: string }) {
  const group = useRef<THREE.Group>(null)
  const color = useMemo(() => new THREE.Color(accent), [accent])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (group.current) {
      group.current.position.y = 1.05 + Math.sin(t * 0.9) * 0.04
      group.current.rotation.z = Math.sin(t * 0.5) * 0.06
    }
  })
  const wire = (
    <meshStandardMaterial
      color={color}
      wireframe
      emissive={color}
      emissiveIntensity={0.6}
      transparent
      opacity={0.6}
    />
  )
  return (
    <group ref={group} rotation={[0, 0.35, 0]}>
      {/* receiver */}
      <mesh>
        <boxGeometry args={[1.3, 0.22, 0.14, 6, 2, 1]} />
        {wire}
      </mesh>
      {/* barrel */}
      <mesh position={[1.05, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 10, 3]} />
        {wire}
      </mesh>
      {/* magazine */}
      <mesh position={[0.1, -0.3, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.18, 0.42, 0.12, 2, 3, 1]} />
        {wire}
      </mesh>
      {/* grip */}
      <mesh position={[-0.35, -0.26, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.14, 0.32, 0.12, 2, 2, 1]} />
        {wire}
      </mesh>
      {/* stock */}
      <mesh position={[-0.95, -0.02, 0]}>
        <boxGeometry args={[0.6, 0.18, 0.1, 4, 2, 1]} />
        {wire}
      </mesh>
      {/* sight */}
      <mesh position={[0.25, 0.2, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.08, 2, 1, 1]} />
        {wire}
      </mesh>
      <Sparkles count={30} scale={[2.6, 1.2, 1]} size={2} speed={0.4} color={color} opacity={0.6} />
    </group>
  )
}

function Stage({ accent }: { accent: string }) {
  const color = useMemo(() => new THREE.Color(accent), [accent])
  return (
    <group>
      <mesh position={[0, -0.09, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.18, 8]} />
        <meshStandardMaterial color="#15181d" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.61, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <gridHelper args={[3.2, 16, '#2b313a', '#1f242b']} position={[0, 0.002, 0]} />
    </group>
  )
}

export default function FigureScene({ modelUrl, accent, variant = 'character' }: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.25, 3.4], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      shadows
    >
      <ambientLight intensity={0.25} />
      <spotLight
        position={[0, 4.5, 2.5]}
        angle={0.45}
        penumbra={0.8}
        intensity={60}
        color="#fff2df"
        castShadow
      />
      <spotLight position={[-3, 3, -2]} angle={0.5} penumbra={1} intensity={25} color={accent} />
      <pointLight position={[3, 1.5, -2.5]} intensity={12} color="#3f8cff" />

      <Suspense fallback={null}>
        {modelUrl ? (
          <Model url={modelUrl} />
        ) : variant === 'weapon' ? (
          <WeaponHologram accent={accent} />
        ) : (
          <Hologram accent={accent} />
        )}
        <Environment resolution={128}>
          <Lightformer intensity={2} position={[0, 4, -4]} scale={[8, 2, 1]} color="#fff2df" />
          <Lightformer intensity={1} position={[-4, 2, 2]} scale={[2, 4, 1]} color={accent} />
        </Environment>
      </Suspense>

      <Stage accent={accent} />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.7}
        scale={4}
        blur={2.2}
        far={2}
        color="#000"
      />
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.9}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.2}
        maxDistance={5}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.95, 0]}
      />
    </Canvas>
  )
}
