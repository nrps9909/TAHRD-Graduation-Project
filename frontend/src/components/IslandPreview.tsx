import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'

// 茂盛的島嶼組件
function LushIsland({ position, scale, color, delay }: {
  position: [number, number, number]
  scale: number
  color: string
  delay: number
}) {
  return (
    <Float
      speed={1.5}
      rotationIntensity={0.3}
      floatIntensity={0.5}
      floatingRange={[-0.5, 0.5]}
    >
      <group position={position} scale={scale}>
        {/* 主島嶼 */}
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <coneGeometry args={[2, 1.5, 8]} />
          <meshStandardMaterial
            color={color}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>

        {/* 茂密的樹木群 */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const radius = 0.8 + Math.random() * 0.6
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const height = 0.4 + Math.random() * 0.6

          return (
            <group key={i} position={[x, 0.2 + height / 2, z]}>
              {/* 樹幹 */}
              <mesh castShadow>
                <cylinderGeometry args={[0.08, 0.1, height, 6]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              {/* 樹冠 - 多層 */}
              <mesh position={[0, height * 0.5, 0]} castShadow>
                <coneGeometry args={[0.35, 0.6, 8]} />
                <meshStandardMaterial
                  color="#2d5016"
                  roughness={0.9}
                />
              </mesh>
              <mesh position={[0, height * 0.3, 0]} castShadow>
                <coneGeometry args={[0.4, 0.5, 8]} />
                <meshStandardMaterial
                  color="#3a6b1f"
                  roughness={0.9}
                />
              </mesh>
              <mesh position={[0, height * 0.1, 0]} castShadow>
                <coneGeometry args={[0.45, 0.5, 8]} />
                <meshStandardMaterial
                  color="#4a8228"
                  roughness={0.9}
                />
              </mesh>
            </group>
          )
        })}

        {/* 花朵裝飾 */}
        {[...Array(20)].map((_, i) => {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * 1.5
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius

          return (
            <mesh key={`flower-${i}`} position={[x, 0.3, z]} castShadow>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial
                color={['#FFB3D9', '#FFEAA7', '#B3D9FF', '#FFD9B3'][Math.floor(Math.random() * 4)]}
                emissive={['#FFB3D9', '#FFEAA7', '#B3D9FF', '#FFD9B3'][Math.floor(Math.random() * 4)]}
                emissiveIntensity={0.3}
              />
            </mesh>
          )
        })}

        {/* 草叢 */}
        {[...Array(30)].map((_, i) => {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * 1.8
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius

          return (
            <mesh key={`grass-${i}`} position={[x, 0.05, z]} rotation={[0, Math.random() * Math.PI, 0]}>
              <coneGeometry args={[0.05, 0.15, 4]} />
              <meshStandardMaterial
                color="#5a9a2a"
                roughness={1}
              />
            </mesh>
          )
        })}
      </group>
    </Float>
  )
}

// 飄浮的雲朵
function FloatingCloud({ position }: { position: [number, number, number] }) {
  return (
    <Float
      speed={2}
      rotationIntensity={0.1}
      floatIntensity={0.3}
    >
      <group position={position}>
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            roughness={1}
          />
        </mesh>
        <mesh position={[0.4, 0, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            roughness={1}
          />
        </mesh>
        <mesh position={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            roughness={1}
          />
        </mesh>
      </group>
    </Float>
  )
}

// 海洋
function Ocean() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color="#4A90E2"
        transparent
        opacity={0.7}
        roughness={0.1}
        metalness={0.8}
      />
    </mesh>
  )
}

// 3D 場景
function IslandScene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={50} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* 環境光照 */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#FFB3D9" />
      <pointLight position={[10, 5, 10]} intensity={0.5} color="#FFEAA7" />

      {/* 環境貼圖 */}
      <Environment preset="sunset" />

      {/* 多個茂盛的島嶼 */}
      <LushIsland position={[0, 0, 0]} scale={1.2} color="#8FBC8F" delay={0} />
      <LushIsland position={[-4, -0.5, -2]} scale={0.8} color="#98D98E" delay={0.2} />
      <LushIsland position={[4, -0.3, -1]} scale={0.9} color="#7FB069" delay={0.4} />
      <LushIsland position={[-2, -0.8, 3]} scale={0.7} color="#A8D5BA" delay={0.6} />
      <LushIsland position={[3, -0.6, 4]} scale={0.75} color="#90C695" delay={0.8} />

      {/* 飄浮的雲朵 */}
      <FloatingCloud position={[-3, 2, 2]} />
      <FloatingCloud position={[4, 2.5, -1]} />
      <FloatingCloud position={[1, 3, -3]} />
      <FloatingCloud position={[-2, 2.8, -4]} />

      {/* 海洋 */}
      <Ocean />

      {/* 霧效 */}
      <fog attach="fog" args={['#FFE5F1', 5, 20]} />
    </>
  )
}

// 主組件
export default function IslandPreview() {
  return (
    <div className="relative w-full h-full">
      {/* 半透明遮罩層 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/30 via-transparent to-yellow-100/30 pointer-events-none z-10" />

      {/* 3D Canvas */}
      <Canvas
        shadows
        className="w-full h-full"
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <Suspense fallback={null}>
          <IslandScene />
        </Suspense>
      </Canvas>

      {/* 底部漸層遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-pink-50/80 to-transparent pointer-events-none z-10" />

      {/* 裝飾性文字 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-0 right-0 text-center z-20"
      >
        <p className="text-gray-600 font-medium text-sm backdrop-blur-sm bg-white/30 py-2 px-4 rounded-full inline-block">
          探索你的療癒島嶼世界 🏝️✨
        </p>
      </motion.div>
    </div>
  )
}
