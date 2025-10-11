import { Canvas } from '@react-three/fiber'
import { Sky, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Suspense, useMemo, lazy } from 'react'
import { motion } from 'framer-motion'

// Lazy load 重量級 3D 組件
const PawIsland = lazy(() => import('./3D/PawIsland').then(m => ({ default: m.PawIsland })))
const CentralIsland = lazy(() => import('./3D/CentralIsland').then(m => ({ default: m.CentralIsland })))
const RealisticOcean = lazy(() => import('./3D/RealisticOcean').then(m => ({ default: m.RealisticOcean })))
const AnimalCrossingClouds = lazy(() => import('./3D/AnimalCrossingClouds').then(m => ({ default: m.AnimalCrossingClouds })))
const FallbackOcean = lazy(() => import('./3D/FallbackOcean').then(m => ({ default: m.FallbackOcean })))
const MemoryTree = lazy(() => import('./3D/MemoryTree').then(m => ({ default: m.MemoryTree })))
const RegionalFlower = lazy(() => import('./3D/RegionalFlowers').then(m => ({ default: m.RegionalFlower })))
const IslandBeacon = lazy(() => import('./3D/IslandBeacon').then(m => ({ default: m.IslandBeacon })))

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

// 生成隨機示範島嶼（用於展示，不使用真實知識庫）
const generateDemoIslands = () => {
  const islandCount = 5
  const colors = ['#FF6B9D', '#FFA07A', '#FFD700', '#98D8C8', '#B19CD9']
  const names = ['靈感之島', '學習之島', '創意之島', '夢想之島', '探索之島']

  return Array.from({ length: islandCount }, (_, i) => ({
    id: `demo-island-${i}`,
    name: names[i],
    color: colors[i],
    description: '示範島嶼',
  }))
}

/**
 * 認證頁面的島嶼場景 - 展示隨機生成的示範島嶼
 * 包含自動旋轉、半透明遮罩、預覽式展示
 * 【示範效果】島上生長少量記憶樹和花朵
 */
export default function AuthIslandScene() {
  // 使用隨機生成的示範島嶼，而不是真實知識庫
  const demoIslands = useMemo(() => generateDemoIslands(), [])

  // 為每個島嶼生成少量記憶樹和花朵（優化性能）
  const islandDecorations = useMemo(() => {
    return demoIslands.map((island, islandIndex) => {
      const position = getCircularPosition(islandIndex, demoIslands.length)
      const [baseX, _baseY, baseZ] = position

      // 每個島嶼生成 2 棵記憶樹（減少以提升性能）
      const treeCount = 2
      const trees = Array.from({ length: treeCount }, (_, i) => {
        const angle = (i / treeCount) * Math.PI * 2
        const radius = 3 + Math.random() * 3
        const x = baseX + Math.cos(angle) * radius
        const z = baseZ + Math.sin(angle) * radius

        return {
          id: `tree-${island.id}-${i}`,
          memory: {
            id: `mem-${i}`,
            title: `記憶 ${i}`,
            content: '',
            category: 'LEARNING' as const,
            importance: 5 + Math.floor(Math.random() * 5),
            createdAt: new Date(),
            position: [x, 0.5, z] as [number, number, number],
            tags: [],
          },
          position: [x, 0.5, z] as [number, number, number],
          seed: i * 123 + islandIndex * 456
        }
      })

      // 每個島嶼生成 4 朵花（減少以提升性能）
      const flowerCount = 4
      const categories = ['learning', 'inspiration', 'work', 'social', 'life', 'goals', 'resources'] as const
      const flowers = Array.from({ length: flowerCount }, (_, i) => {
        const angle = Math.random() * Math.PI * 2
        const radius = 2 + Math.random() * 4
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
  }, [demoIslands])

  // 中央島嶼不種樹，保持乾淨

  return (
    <div className="relative w-full h-full">
      {/* 半透明遮罩層 - 營造預告片效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/20 via-transparent to-yellow-100/20 pointer-events-none z-10" />

      {/* 3D Canvas - 主島嶼場景 - 禁用互動 */}
      <Canvas
        shadows
        camera={{ position: [0, 65, 85], fov: 55 }}
        className="w-full h-full pointer-events-none"
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          alpha: true,
          stencil: false,
          depth: true,
          precision: 'lowp', // 降低精度加快渲染
        }}
        dpr={[0.7, 1]} // 進一步降低像素比，提升性能
        frameloop="demand"
        performance={{ min: 0.4 }} // 性能優先模式，更低的最小幀率
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
            shadow-mapSize={[256, 256]}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
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

          {/* Clouds - 動物森友會風格雲朵（減少數量提升性能） */}
          <Suspense fallback={null}>
            <AnimalCrossingClouds count={15} />
          </Suspense>

          {/* Ocean - 真實海洋（帶 fallback） */}
          <Suspense fallback={<FallbackOcean />}>
            <RealisticOcean />
          </Suspense>

          {/* 環形群島系統 - 隨機生成示範島嶼 */}
          <group scale={1.125}>
            {islandDecorations.map(({ island, trees, flowers, basePosition }) => (
              <group key={island.id}>
                {/* 島嶼本體 */}
                <PawIsland
                  position={basePosition}
                  color={island.color}
                  scale={1.8}
                  isActive={false}
                  memories={[]}
                  islandId={island.id}
                />

                {/* 識別光柱 */}
                <IslandBeacon
                  position={basePosition}
                  color={island.color}
                  height={12}
                  isHovered={false}
                />

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
            autoRotateSpeed={0.3}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.2}
          />

          {/* 🌟 後處理視覺效果 - 簡化以提升性能 */}
          <EffectComposer>
            <Bloom
              intensity={0.15}
              luminanceThreshold={0.98}
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
