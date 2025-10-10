import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { IslandArchipelago } from './IslandArchipelago'
import { TororoCat } from './TororoCat'
import { HijikiCat } from './HijikiCat'
import { CentralIsland } from './CentralIsland'
import { CameraController } from './CameraController'
import { RealisticOcean } from './RealisticOcean'
import { AnimalCrossingClouds } from './AnimalCrossingClouds'
import { FallbackOcean } from './FallbackOcean'
import { MemoryDetailModal } from '../MemoryDetailModal'
import { CelestialSystem } from './CelestialBodies'
import { WeatherSystem, WeatherInfo } from './WeatherEffects'
import { NaturalSky } from './NaturalSky'
import { Suspense, useState, useEffect } from 'react'
import { useIslandStore } from '../../stores/islandStore'
import { Memory as IslandMemory } from '../../types/island'

interface IslandSceneProps {
  onTororoClick?: () => void
  onHijikiClick?: () => void
  hideLabels?: boolean
}

/**
 * 計算肉球島嶼位置（與 IslandArchipelago 相同的算法）
 * 圓形排列
 */
function getIslandPosition(
  index: number,
  total: number
): [number, number, number] {
  if (total === 1) {
    return [0, 0, 0]
  }

  const radius = 70
  const angleStep = (Math.PI * 2) / total
  const angle = angleStep * index - Math.PI / 2

  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return [x, 0, z]
}

export function IslandScene({
  onTororoClick,
  onHijikiClick,
  hideLabels = false
}: IslandSceneProps) {
  const { islands, switchIsland, currentIslandId } = useIslandStore()
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<IslandMemory | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 判斷當前是否為總覽視角
  const isOverviewMode = currentIslandId === 'overview'


  // 監聽 currentIslandId 變化，自動移動相機
  useEffect(() => {
    if (currentIslandId === 'overview') {
      // 回到總覽視角 - 從更高處俯視圓形排列
      setCameraTarget([0, 120, 0.1])
    } else if (currentIslandId) {
      const index = islands.findIndex(island => island.id === currentIslandId)
      if (index !== -1) {
        const [x, y, z] = getIslandPosition(index, islands.length)
        // 因為群島縮放了 1.125 倍，所以位置也要乘以 1.125
        setCameraTarget([x * 1.125, y * 1.125 + 10, z * 1.125])
      }
    }
  }, [currentIslandId, islands])

  const handleIslandClick = (islandId: string) => {
    switchIsland(islandId)
  }

  const handleMemoryClick = (memory: IslandMemory) => {
    setSelectedMemory(memory)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // 延遲清除選中的記憶，等動畫完成
    setTimeout(() => setSelectedMemory(null), 300)
  }

  // 視覺效果設定（固定值，不使用調試面板）
  const bloomIntensity = 0.2      // 降低發光強度
  const bloomThreshold = 0.95     // 提高閾值，只有更亮的物體才發光
  const chromaticOffset = 0.0008  // 稍微降低色差效果

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 120, 0.1], fov: 60 }}
        className="w-full h-full"
        style={{ pointerEvents: hideLabels ? 'none' : 'auto' }}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: false,
          stencil: false,
          depth: true,
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        frameloop="always"
      >
      <Suspense fallback={null}>
        {/* 🌟 動態天體系統 - 太陽、月亮與自動光照 */}
        <CelestialSystem />

        {/* 柔和環境光 - 簡約氛圍 */}
        <ambientLight intensity={0.25} color="#E8F4F8" />
        <pointLight position={[0, 40, 0]} intensity={0.08} color="#FFF8E1" />

        {/* 🌤️ 自然天空系統 - 深邃的藍天 */}
        <NaturalSky />

        {/* 🌧️ 天氣效果系統 */}
        <WeatherSystem />

        {/* ☁️ 動物森友會風格雲朵 - 覆蓋整個場景 */}
        <Suspense fallback={null}>
          <AnimalCrossingClouds count={40} />
        </Suspense>

        {/* Ocean - 真实海洋（带 fallback） */}
        <Suspense fallback={<FallbackOcean />}>
          <RealisticOcean />
        </Suspense>

        {/* 環形群島系統 - 所有知識庫 (縮小為原來的一半：1.125 倍) */}
        <group scale={1.125}>
          <IslandArchipelago
            onIslandClick={handleIslandClick}
            onMemoryClick={handleMemoryClick}
            hideLabels={hideLabels}
          />
        </group>

        {/* 中央島嶼 - 資料庫入口 (放大 1.95 倍) */}
        <group scale={1.95}>
          <CentralIsland position={[0, 0, 0]} />
        </group>

        {/* Tororo - 知識園丁（小白）- 守護肉球左側 */}
        {/* 總覽視角顯示標籤，聚焦島嶼時隱藏 */}
        <TororoCat position={[-25, 3, -8]} scale={12} onClick={onTororoClick} hideLabel={hideLabels || !isOverviewMode} />

        {/* Hijiki - 知識管理員（小黑）- 守護肉球右側 */}
        {/* 總覽視角顯示標籤，聚焦島嶼時隱藏 */}
        <HijikiCat position={[25, 5, -8]} scale={12} onClick={onHijikiClick} hideLabel={hideLabels || !isOverviewMode} />

        {/* Camera controls - 智能攝影機控制，點擊島嶼自動飛過去 */}
        <CameraController targetPosition={cameraTarget} />

        {/* 🌟 后处理视觉效果 - 让画面更梦幻 */}
        <EffectComposer>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={bloomThreshold}
            luminanceSmoothing={0.9}
            mipmapBlur
            blendFunction={BlendFunction.ADD}
          />
          <ChromaticAberration
            offset={[chromaticOffset, chromaticOffset] as any}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0}
          />
          {/* 景深效果暫時停用，因為會影響性能 */}
          {/* <DepthOfField
            focusDistance={focusDistance}
            focalLength={focalLength}
            bokehScale={1}
            height={480}
          /> */}
        </EffectComposer>
      </Suspense>
    </Canvas>

    {/* 記憶詳情彈窗 */}
    <MemoryDetailModal
      memory={selectedMemory}
      isOpen={isModalOpen}
      onClose={handleCloseModal}
    />

    {/* 天氣資訊顯示 */}
    <WeatherInfo />
    </>
  )
}
