import { Canvas } from '@react-three/fiber'
import { Sky, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Suspense, useMemo, lazy } from 'react'
import { motion } from 'framer-motion'
import { useIslandStore } from '../stores/islandStore'

// Lazy load 重量級 3D 組件
const IslandArchipelago = lazy(() => import('./3D/IslandArchipelago').then(m => ({ default: m.IslandArchipelago })))
const CentralIsland = lazy(() => import('./3D/CentralIsland').then(m => ({ default: m.CentralIsland })))
const RealisticOcean = lazy(() => import('./3D/RealisticOcean').then(m => ({ default: m.RealisticOcean })))
const RealisticClouds = lazy(() => import('./3D/RealisticClouds').then(m => ({ default: m.RealisticClouds })))
const FallbackOcean = lazy(() => import('./3D/FallbackOcean').then(m => ({ default: m.FallbackOcean })))
const MemoryTree = lazy(() => import('./3D/MemoryTree').then(m => ({ default: m.MemoryTree })))
const RegionalFlower = lazy(() => import('./3D/RegionalFlowers').then(m => ({ default: m.RegionalFlower })))

/**
 * 計算環形布局位置（與主場景相同）
 */
function getCircularPosition(
  index: number,
  total: number,
  radius: number = 45
): [number, number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return [x, 0, z]
}

/**
 * 認證頁面的島嶼場景 - 完全仿照主畫面島嶼
 * 包含自動旋轉、半透明遮罩、預覽式展示
 * 【後期效果】島上長滿記憶樹和花朵
 */
export default function AuthIslandScene() {
  const { islands } = useIslandStore()

  // 為每個島嶼生成大量記憶樹和花朵（後期玩家效果）
  const islandDecorations = useMemo(() => {
    return islands.map((island, islandIndex) => {
      const position = getCircularPosition(islandIndex, islands.length)
      const [baseX, baseY, baseZ] = position

      // 每個島嶼生成 3-4 棵記憶樹（精簡版，登入頁面用）
      const treeCount = 3 + Math.floor(Math.random() * 2)
      const trees = Array.from({ length: treeCount }, (_, i) => {
        const angle = (i / treeCount) * Math.PI * 2
        const radius = 3 + Math.random() * 4
        const x = baseX + Math.cos(angle) * radius
        const z = baseZ + Math.sin(angle) * radius

        return {
          id: `tree-${island.id}-${i}`,
          memory: {
            id: `mem-${i}`,
            title: `記憶 ${i}`,
            content: '',
            importance: 5 + Math.floor(Math.random() * 5),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          position: [x, 0.5, z] as [number, number, number],
          seed: i * 123 + islandIndex * 456
        }
      })

      // 每個島嶼生成 6-8 朵花（精簡版，登入頁面用）
      const flowerCount = 6 + Math.floor(Math.random() * 3)
      const categories = ['learning', 'inspiration', 'work', 'social', 'life', 'goals', 'resources'] as const
      const flowers = Array.from({ length: flowerCount }, (_, i) => {
        const angle = Math.random() * Math.PI * 2
        const radius = 2 + Math.random() * 5
        const x = baseX + Math.cos(angle) * radius
        const z = baseZ + Math.sin(angle) * radius

        return {
          id: `flower-${island.id}-${i}`,
          title: `花朵 ${i}`,
          emoji: ['💐', '🌸', '🌺', '🌻', '🌷', '🌹'][Math.floor(Math.random() * 6)],
          category: categories[Math.floor(Math.random() * categories.length)],
          importance: 5 + Math.floor(Math.random() * 5),
          position: [x, 0.3, z] as [number, number, number],
          createdAt: new Date()
        }
      })

      return { island, trees, flowers, basePosition: position }
    })
  }, [islands])

  // 中央島嶼不種樹，保持乾淨

  return (
    <div className="relative w-full h-full">
      {/* 半透明遮罩層 - 營造預告片效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/20 via-transparent to-yellow-100/20 pointer-events-none z-10" />

      {/* 3D Canvas - 主島嶼場景 - 禁用互動 */}
      <Canvas
        shadows
        camera={{ position: [0, 70, 80], fov: 60 }}
        className="w-full h-full pointer-events-none"
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          alpha: true,
          stencil: false,
          depth: true,
          precision: 'lowp', // 降低精度加快渲染
        }}
        dpr={[0.8, 1.2]} // 進一步降低像素比
        frameloop="demand"
        performance={{ min: 0.5 }} // 性能優先模式
      >
        <Suspense fallback={null}>
          {/* Lighting - 溫馨可愛的光照系統 */}
          <ambientLight intensity={0.7} color="#FFF8E7" />

          {/* 主太陽光 - 溫暖柔和 - 優化陰影性能 */}
          <directionalLight
            position={[100, 80, 50]}
            intensity={0.3}
            color="#FFE5B4"
            castShadow
            shadow-mapSize={[512, 512]}
            shadow-camera-left={-80}
            shadow-camera-right={80}
            shadow-camera-top={80}
            shadow-camera-bottom={-80}
            shadow-bias={-0.0001}
          />

          {/* 輔助光源 - 粉色溫馨氛圍 */}
          <pointLight position={[-50, 30, -50]} intensity={0.35} color="#FFE5F0" />
          <pointLight position={[50, 30, 50]} intensity={0.35} color="#FFFACD" />

          {/* 半球光 - 明亮溫暖的天空 */}
          <hemisphereLight
            intensity={0.8}
            color="#FFE5CD"
            groundColor="#FFE5F0"
          />

          {/* Sky - 清晰溫暖的晴朗天空 */}
          <Sky
            distance={450000}
            sunPosition={[50, 40, 100]}
            inclination={0.5}
            azimuth={0.15}
            mieCoefficient={0.003}
            mieDirectionalG={0.6}
            rayleigh={0.8}
            turbidity={2}
          />

          {/* Clouds - 真實雲朵 */}
          <Suspense fallback={null}>
            <RealisticClouds />
          </Suspense>

          {/* Ocean - 真實海洋（帶 fallback） */}
          <Suspense fallback={<FallbackOcean />}>
            <RealisticOcean />
          </Suspense>

          {/* 環形群島系統 - 所有知識庫 */}
          <group scale={1.125}>
            <IslandArchipelago hideLabels={true} />

            {/* 每個島嶼的記憶樹和花朵（後期玩家效果）*/}
            {islandDecorations.map(({ island, trees, flowers }) => (
              <group key={island.id}>
                {/* 記憶樹 */}
                {trees.map((tree) => (
                  <MemoryTree
                    key={tree.id}
                    memory={tree.memory}
                    islandColor={island.color}
                    position={tree.position}
                    seed={tree.seed}
                  />
                ))}

                {/* 區域花朵 */}
                {flowers.map((flower) => (
                  <RegionalFlower
                    key={flower.id}
                    flower={flower}
                  />
                ))}
              </group>
            ))}
          </group>

          {/* 中央島嶼 - 資料庫入口（不種樹，保持乾淨，禁用互動）*/}
          <group scale={1.95}>
            <CentralIsland position={[0, 0, 0]} disableInteraction={true} />
          </group>

          {/* 自動旋轉控制 - 禁用所有用戶操作 */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            autoRotate
            autoRotateSpeed={0.5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.2}
          />

          {/* 🌟 後處理視覺效果 - 簡化以提升性能 */}
          <EffectComposer>
            <Bloom
              intensity={0.2}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.9}
              blendFunction={BlendFunction.ADD}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* 底部漸層遮罩 - 與登入表單融合 */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-pink-50/80 to-transparent pointer-events-none z-10" />

      {/* AI 貓咪養成 + 知識庫介紹 - 精簡版 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-6 left-0 right-0 text-center z-20 px-6"
      >
        <div className="backdrop-blur-md bg-white/40 rounded-xl py-2.5 px-5 inline-block border border-white/50 shadow-lg">
          <p className="text-sm font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
            🐱 AI 貓咪陪伴 · 知識島嶼養成 ✨
          </p>
        </div>
      </motion.div>
    </div>
  )
}
