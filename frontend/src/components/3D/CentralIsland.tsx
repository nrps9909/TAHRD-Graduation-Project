import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '../../stores/onboardingStore'

interface CentralIslandProps {
  position?: [number, number, number]
  disableInteraction?: boolean // 新增：是否禁用互動
}

export function CentralIsland({ position = [0, 0, 0], disableInteraction = false }: CentralIslandProps) {
  const navigate = useNavigate()
  const islandRef = useRef<THREE.Group>(null)
  const crystalRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // Onboarding store
  const { recordAction, isOnboardingActive, setIsInMainView } = useOnboardingStore()

  // 水晶球旋轉動畫
  useFrame((state) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += 0.01
      // 上下浮動效果 - 放大後調整高度
      crystalRef.current.position.y = 5 + Math.sin(state.clock.elapsedTime) * 0.9
    }
  })

  const handleClick = () => {
    // 記錄教學操作
    if (isOnboardingActive) {
      recordAction('databaseClicked')
      setIsInMainView(false) // 離開主畫面
    }
    navigate('/database')
  }

  return (
    <group ref={islandRef} position={position}>
      {/* 島嶼底座 - 圓形岩石平台 */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[8, 10, 2, 32]} />
        <meshStandardMaterial
          color="#8B7355"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* 草地表面 */}
      <mesh position={[0, 1.05, 0]} receiveShadow>
        <cylinderGeometry args={[8.2, 8.2, 0.1, 32]} />
        <meshStandardMaterial
          color="#90EE90"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 中央石柱基座 */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[1.5, 2, 2, 16]} />
        <meshStandardMaterial
          color="#D3D3D3"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* 資料庫水晶球 - 可點擊 - 放大 3 倍 */}
      <group
        ref={crystalRef}
        position={[0, 5, 0]}
        onClick={disableInteraction ? undefined : handleClick}
        onPointerOver={disableInteraction ? undefined : () => setHovered(true)}
        onPointerOut={disableInteraction ? undefined : () => setHovered(false)}
      >
        {/* 外層發光球體 - 放大 3 倍 */}
        <mesh castShadow>
          <sphereGeometry args={[4.5, 32, 32]} />
          <meshStandardMaterial
            color={hovered ? "#FFD700" : "#87CEEB"}
            transparent
            opacity={0.6}
            roughness={0.1}
            metalness={0.9}
            emissive={hovered ? "#FFD700" : "#87CEEB"}
            emissiveIntensity={hovered ? 0.8 : 0.5}
          />
        </mesh>

        {/* 內層核心 - 放大 3 倍 */}
        <mesh castShadow>
          <sphereGeometry args={[2.4, 32, 32]} />
          <meshStandardMaterial
            color={hovered ? "#FFA500" : "#4169E1"}
            emissive={hovered ? "#FFA500" : "#4169E1"}
            emissiveIntensity={1}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* 資料庫圖標 - 書本形狀 - 放大 3 倍 */}
        <group position={[0, 0, 4.8]} rotation={[0, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.8, 2.4, 0.6]} />
            <meshStandardMaterial
              color="#8B4513"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
          {/* 書頁 */}
          <mesh position={[0, 0, 0.33]} castShadow>
            <boxGeometry args={[1.5, 2.1, 0.06]} />
            <meshStandardMaterial
              color="#FFFACD"
              roughness={0.9}
            />
          </mesh>
        </group>

        {/* 發光粒子效果環 - 放大範圍 */}
        <pointLight
          position={[0, 0, 0]}
          color={hovered ? "#FFD700" : "#87CEEB"}
          intensity={hovered ? 6 : 3}
          distance={24}
        />
      </group>

      {/* 懸浮文字標籤 - 放大並調整位置 */}
      <Text
        position={[0, 11, 0]}
        fontSize={1.5}
        color={hovered ? "#FFD700" : "#FFFFFF"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.15}
        outlineColor="#000000"
      >
        📚 知識寶庫
      </Text>

      {/* 裝飾花朵 - 圍繞島嶼 */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const radius = 6
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const colors = ['#FF69B4', '#FFB6C1', '#FFC0CB', '#FFFFE0']
        const color = colors[i % colors.length]

        return (
          <group key={i} position={[x, 1.2, z]}>
            {/* 花莖 */}
            <mesh position={[0, -0.3, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
            {/* 花朵 */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        )
      })}

      {/* 環境光增強 */}
      <pointLight
        position={[0, 5, 0]}
        color="#FFFACD"
        intensity={0.5}
        distance={15}
      />
    </group>
  )
}
