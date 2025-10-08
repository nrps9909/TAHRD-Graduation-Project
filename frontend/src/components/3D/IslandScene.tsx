import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { IslandArchipelago } from './IslandArchipelago'
import { TororoCat } from './TororoCat'
import { HijikiCat } from './HijikiCat'
import { CentralIsland } from './CentralIsland'
import { CameraController } from './CameraController'
import { RealisticOcean } from './RealisticOcean'
import { RealisticClouds } from './RealisticClouds'
import { FallbackOcean } from './FallbackOcean'
import { Suspense, useState, useEffect } from 'react'
import { useIslandStore } from '../../stores/islandStore'

interface IslandSceneProps {
  onTororoClick?: () => void
  onHijikiClick?: () => void
  hideLabels?: boolean
}

/**
 * 計算環形布局位置（與 IslandArchipelago 相同的算法）
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

export function IslandScene({
  onTororoClick,
  onHijikiClick,
  hideLabels = false
}: IslandSceneProps) {
  const { islands, switchIsland, currentIslandId } = useIslandStore()
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null)

  // 判斷當前是否為總覽視角
  const isOverviewMode = currentIslandId === 'overview'


  // 監聽 currentIslandId 變化，自動移動相機
  useEffect(() => {
    if (currentIslandId === 'overview') {
      // 回到總覽視角 - 從中央上方俯視
      setCameraTarget([0, 90, 0.1])
    } else if (currentIslandId) {
      const index = islands.findIndex(island => island.id === currentIslandId)
      if (index !== -1) {
        const [x, y, z] = getCircularPosition(index, islands.length)
        // 因為群島縮放了 1.125 倍，所以位置也要乘以 1.125
        setCameraTarget([x * 1.125, y * 1.125, z * 1.125])
      }
    }
  }, [currentIslandId, islands])

  const handleIslandClick = (islandId: string) => {
    switchIsland(islandId)
  }

  // 視覺效果設定（固定值，不使用調試面板）
  const bloomIntensity = 0.3
  const bloomThreshold = 0.9
  const chromaticOffset = 0.001
  const ambientIntensity = 0.5
  const ambientColor = '#FFF8E7'

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 90, 0.1], fov: 60 }}
        className="w-full h-full"
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
        {/* Lighting - 温馨可爱的光照系统 */}
        <ambientLight intensity={0.7} color="#FFF8E7" />

        {/* 主太阳光 - 温暖柔和 */}
        <directionalLight
          position={[100, 80, 50]}
          intensity={0.3}
          color="#FFE5B4"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
          shadow-bias={-0.0001}
        />

        {/* 辅助光源 - 粉色温馨氛围 */}
        <pointLight position={[-50, 30, -50]} intensity={0.35} color="#FFE5F0" />
        <pointLight position={[50, 30, 50]} intensity={0.35} color="#FFFACD" />

        {/* 半球光 - 明亮温暖的天空 */}
        <hemisphereLight
          intensity={0.8}
          color="#FFE5CD"
          groundColor="#FFE5F0"
        />

        {/* Sky - 清晰温暖的晴朗天空 */}
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

        {/* Clouds - 真实云朵 */}
        <Suspense fallback={null}>
          <RealisticClouds />
        </Suspense>

        {/* Ocean - 真实海洋（带 fallback） */}
        <Suspense fallback={<FallbackOcean />}>
          <RealisticOcean />
        </Suspense>

        {/* 環形群島系統 - 所有知識庫 (縮小為原來的一半：1.125 倍) */}
        <group scale={1.125}>
          <IslandArchipelago onIslandClick={handleIslandClick} hideLabels={hideLabels} />
        </group>

        {/* 中央島嶼 - 資料庫入口 (放大 1.95 倍) */}
        <group scale={1.95}>
          <CentralIsland position={[0, 0, 0]} />
        </group>

        {/* Tororo - 知識園丁（小白）- 中央島嶼左側 */}
        {/* 總覽視角顯示標籤，聚焦島嶼時隱藏 */}
        <TororoCat position={[-12, 3, 7.5]} scale={12} onClick={onTororoClick} hideLabel={hideLabels || !isOverviewMode} />

        {/* Hijiki - 知識管理員（小黑）- 中央島嶼右側偏上 */}
        {/* 總覽視角顯示標籤，聚焦島嶼時隱藏 */}
        <HijikiCat position={[15, 5, 7.5]} scale={12} onClick={onHijikiClick} hideLabel={hideLabels || !isOverviewMode} />

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
    </>
  )
}
