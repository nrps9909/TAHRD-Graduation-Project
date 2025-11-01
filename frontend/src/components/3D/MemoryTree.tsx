/**
 * MemoryTree - 記憶樹組件（養成遊戲版）
 * 每個記憶在島上表現為一棵樹
 * - 樹的大小和外觀與知識內容關聯
 * - 成長等級系統：幼苗 → 小樹 → 大樹 → 巨樹
 * - 視覺特徵反映知識的豐富程度
 */

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Memory } from '../../types/island'
import { Group } from 'three'

interface MemoryTreeProps {
  memory: Memory
  islandColor: string // 島嶼主題色
  position: [number, number, number] // 樹在島上的位置
  seed: number // 隨機種子，用於生成不同的樹
  onClick?: (memory: Memory) => void // 點擊回調
}

/**
 * 成長階段定義
 */
const GROWTH_STAGES = {
  SEEDLING: { name: '幼苗', emoji: '🌱', minContent: 0, maxContent: 50, sizeMultiplier: 0.5 },
  SMALL: { name: '小樹', emoji: '🌿', minContent: 50, maxContent: 200, sizeMultiplier: 0.75 },
  MEDIUM: { name: '大樹', emoji: '🌳', minContent: 200, maxContent: 500, sizeMultiplier: 1.0 },
  LARGE: { name: '巨樹', emoji: '🌲', minContent: 500, maxContent: Infinity, sizeMultiplier: 1.3 }
}

/**
 * 計算樹的成長階段（基於知識內容長度）
 */
function calculateGrowthStage(memory: Memory) {
  const contentLength = (memory.content || '').length

  if (contentLength < 50) return GROWTH_STAGES.SEEDLING
  if (contentLength < 200) return GROWTH_STAGES.SMALL
  if (contentLength < 500) return GROWTH_STAGES.MEDIUM
  return GROWTH_STAGES.LARGE
}

/**
 * 根據島嶼顏色和成長階段計算樹的顏色
 */
function calculateTreeColor(islandColor: string, growthStage: typeof GROWTH_STAGES.SEEDLING): string {
  const baseColor = new THREE.Color(islandColor)
  const hsl = { h: 0, s: 0, l: 0 }
  baseColor.getHSL(hsl)

  // 成長階段越高，顏色越鮮艷
  const saturation = 0.5 + (growthStage.sizeMultiplier - 0.5) * 0.4 // 0.5 到 0.9

  // 向綠色偏移
  const hueShift = -0.05
  const newHue = (hsl.h + hueShift + 1) % 1

  // 成長階段越高，亮度越高
  const newLightness = Math.max(0.3, Math.min(0.6, hsl.l * 0.8 + growthStage.sizeMultiplier * 0.1))

  const treeColor = new THREE.Color().setHSL(newHue, saturation, newLightness)
  return '#' + treeColor.getHexString()
}

/**
 * 生成樹的參數（基於知識內容和成長階段）
 * @param seed 隨機種子
 * @param memory 記憶對象
 * @param growthStage 成長階段
 */
function generateTreeParams(
  seed: number,
  memory: Memory,
  growthStage: typeof GROWTH_STAGES.SEEDLING
) {
  // 使用種子生成偽隨機數
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000
    seed += 1.123
    return min + (x - Math.floor(x)) * (max - min)
  }

  // 標籤數量影響樹冠繁茂度
  const tagCount = memory.tags?.length || 0
  const lushnessFactor = Math.min(1 + tagCount * 0.15, 2.0) // 1.0 到 2.0

  // 成長階段的基礎尺寸
  const sizeMultiplier = growthStage.sizeMultiplier

  return {
    // 樹幹（隨成長階段變大）
    trunkHeight: random(1.5, 2.5) * sizeMultiplier,
    trunkRadius: random(0.15, 0.25) * sizeMultiplier,
    trunkTaper: random(0.7, 0.9),

    // 樹冠（受標籤數量和成長階段影響）
    canopyType: Math.floor(random(0, 3)), // 0: 球形, 1: 圓錐形, 2: 不規則形
    canopySize: random(0.8, 1.2) * sizeMultiplier * lushnessFactor,
    canopyHeight: random(1.0, 1.8) * sizeMultiplier,
    canopyLayers: Math.floor(random(2, 4) + tagCount * 0.3), // 標籤越多層數越多

    // 傾斜和旋轉
    lean: random(-0.08, 0.08),
    rotation: random(0, Math.PI * 2),

    // 養成遊戲特有屬性
    lushness: lushnessFactor, // 繁茂度
    growthStage: growthStage.name
  }
}

export function MemoryTree({ memory, islandColor, position, seed, onClick }: MemoryTreeProps) {
  const groupRef = useRef<Group>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  // 計算成長階段
  const growthStage = useMemo(() => calculateGrowthStage(memory), [memory])

  // 計算樹的顏色
  const treeColor = useMemo(
    () => calculateTreeColor(islandColor, growthStage),
    [islandColor, growthStage]
  )

  // 生成樹的參數（基於知識內容）
  const treeParams = useMemo(
    () => generateTreeParams(seed, memory, growthStage),
    [seed, memory, growthStage]
  )

  // 樹冠顏色（比基礎色稍亮，懸停時更亮）
  const canopyColor = useMemo(() => {
    const color = new THREE.Color(treeColor)
    const hsl = { h: 0, s: 0, l: 0 }
    color.getHSL(hsl)
    const lightnessFactor = isHovered ? 1.5 : 1.3
    color.setHSL(hsl.h, Math.min(1, hsl.s * 1.1), Math.min(0.7, hsl.l * lightnessFactor))
    return '#' + color.getHexString()
  }, [treeColor, isHovered])

  // 樹幹顏色（深棕色，成長階段越高越深）
  const trunkColor = useMemo(() => {
    const baseLightness = 0.2 - (growthStage.sizeMultiplier - 0.5) * 0.05
    return new THREE.Color().setHSL(0.08, 0.6, baseLightness)
  }, [growthStage])

  // 搖曳動畫 + 懸停放大 + 點擊彈跳
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime()
      const sway = Math.sin(time * 0.5 + seed) * 0.02

      // 基礎搖曳
      groupRef.current.rotation.z = treeParams.lean + sway

      // 懸停時放大
      const targetScale = isHovered ? 1.1 : 1.0
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      )

      // 點擊時彈跳動畫
      if (isClicked) {
        const bounce = Math.abs(Math.sin(time * 10)) * 0.1
        groupRef.current.position.y = position[1] + bounce
      } else {
        groupRef.current.position.y = position[1]
      }
    }
  })

  // 點擊處理
  const handleClick = (e: any) => {
    e.stopPropagation()
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 500) // 彈跳動畫持續 0.5 秒
    onClick?.(memory)
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, treeParams.rotation, treeParams.lean]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setIsHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setIsHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      {/* 懸停時的發光環效果 */}
      {isHovered && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[treeParams.canopySize * 0.8, treeParams.canopySize * 1.2, 32]} />
          <meshBasicMaterial
            color={canopyColor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 樹幹 */}
      <mesh
        position={[0, treeParams.trunkHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[
            treeParams.trunkRadius * treeParams.trunkTaper, // 頂部半徑
            treeParams.trunkRadius, // 底部半徑
            treeParams.trunkHeight,
            8
          ]}
        />
        <meshStandardMaterial
          color={trunkColor}
          roughness={0.9}
          metalness={0}
          emissive={isHovered ? canopyColor : '#000000'}
          emissiveIntensity={isHovered ? 0.2 : 0}
        />
      </mesh>

      {/* 樹冠 - 根據類型渲染不同形狀（帶發光效果） */}
      {treeParams.canopyType === 0 && (
        // 球形樹冠
        <mesh
          position={[0, treeParams.trunkHeight + treeParams.canopySize * 0.5, 0]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[treeParams.canopySize, 16, 16]} />
          <meshStandardMaterial
            color={canopyColor}
            roughness={0.7}
            metalness={0}
            emissive={canopyColor}
            emissiveIntensity={isHovered ? 0.4 : 0.1}
          />
        </mesh>
      )}

      {treeParams.canopyType === 1 && (
        // 圓錐形樹冠
        <mesh
          position={[0, treeParams.trunkHeight + treeParams.canopyHeight * 0.4, 0]}
          castShadow
          receiveShadow
        >
          <coneGeometry
            args={[treeParams.canopySize, treeParams.canopyHeight, 12]}
          />
          <meshStandardMaterial
            color={canopyColor}
            roughness={0.7}
            metalness={0}
            emissive={canopyColor}
            emissiveIntensity={isHovered ? 0.4 : 0.1}
          />
        </mesh>
      )}

      {treeParams.canopyType === 2 && (
        // 多層不規則樹冠（標籤越多層數越多）
        <>
          {Array.from({ length: treeParams.canopyLayers }).map((_, i) => {
            const layerY = treeParams.trunkHeight + (i * 0.5)
            const layerSize = treeParams.canopySize * (1 - i * 0.15)
            return (
              <mesh
                key={i}
                position={[0, layerY, 0]}
                castShadow
                receiveShadow
              >
                <sphereGeometry args={[layerSize, 10, 10]} />
                <meshStandardMaterial
                  color={canopyColor}
                  roughness={0.7}
                  metalness={0}
                  emissive={canopyColor}
                  emissiveIntensity={isHovered ? 0.4 - i * 0.05 : 0.1 - i * 0.02}
                />
              </mesh>
            )
          })}
        </>
      )}

      {/* 成長階段指示器（懸停時顯示） */}
      {isHovered && (
        <group position={[0, treeParams.trunkHeight + treeParams.canopyHeight + 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color="#FFF" transparent opacity={0.8} />
          </mesh>
          {/* 這裡可以添加 HTML 標籤顯示成長階段和標籤數量 */}
        </group>
      )}
    </group>
  )
}
