/**
 * MemoryTree - 記憶樹組件
 * 每個記憶在島上表現為一棵樹
 * - 顏色色調跟隨島嶼色調
 * - 彩度根據重要性（1-10）調整
 * - 每棵樹隨機生成，外觀不同
 */

import { useMemo, useRef } from 'react'
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
 * 根據島嶼顏色計算樹的顏色（不再使用 importance）
 * @param islandColor 島嶼主題色
 */
function calculateTreeColor(islandColor: string): string {
  const baseColor = new THREE.Color(islandColor)

  // 轉換到 HSL 色彩空間
  const hsl = { h: 0, s: 0, l: 0 }
  baseColor.getHSL(hsl)

  // 彩度固定為 70%（適中的彩度）
  const saturation = 0.7

  // 稍微調整色調，讓樹看起來更自然（偏綠）
  const hueShift = -0.05 // 向綠色偏移
  const newHue = (hsl.h + hueShift + 1) % 1

  // 亮度稍微降低，讓樹看起來更深
  const newLightness = Math.max(0.25, hsl.l * 0.8)

  const treeColor = new THREE.Color().setHSL(newHue, saturation, newLightness)
  return '#' + treeColor.getHexString()
}

/**
 * 生成隨機樹的參數
 * @param seed 隨機種子
 */
function generateTreeParams(seed: number) {
  // 使用種子生成偽隨機數
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000
    seed += 1.123
    return min + (x - Math.floor(x)) * (max - min)
  }

  return {
    // 樹幹
    trunkHeight: random(2.0, 3.5),
    trunkRadius: random(0.2, 0.35),
    trunkTaper: random(0.7, 0.9), // 樹幹頂部與底部的半徑比

    // 樹冠
    canopyType: Math.floor(random(0, 3)), // 0: 球形, 1: 圓錐形, 2: 不規則形
    canopySize: random(1.2, 2.0),
    canopyHeight: random(1.5, 2.5),
    canopyLayers: Math.floor(random(2, 4)), // 樹冠層數

    // 傾斜和旋轉
    lean: random(-0.1, 0.1), // 樹的傾斜
    rotation: random(0, Math.PI * 2)
  }
}

export function MemoryTree({ memory, islandColor, position, seed, onClick }: MemoryTreeProps) {
  const groupRef = useRef<Group>(null)

  // 計算樹的顏色（使用 islandColor）
  const treeColor = useMemo(
    () => calculateTreeColor(islandColor),
    [islandColor]
  )

  // 生成樹的隨機參數
  const treeParams = useMemo(() => generateTreeParams(seed), [seed])

  // 樹冠顏色（比樹幹稍亮）
  const canopyColor = useMemo(() => {
    const color = new THREE.Color(treeColor)
    const hsl = { h: 0, s: 0, l: 0 }
    color.getHSL(hsl)
    color.setHSL(hsl.h, hsl.s, Math.min(0.6, hsl.l * 1.3))
    return '#' + color.getHexString()
  }, [treeColor])

  // 樹幹顏色（深棕色）
  const trunkColor = '#5D4037'

  // 輕微搖曳動畫
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const sway = Math.sin(clock.getElapsedTime() * 0.5 + seed) * 0.02
      groupRef.current.rotation.z = treeParams.lean + sway
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, treeParams.rotation, treeParams.lean]}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(memory)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
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
        />
      </mesh>

      {/* 樹冠 - 根據類型渲染不同形狀 */}
      {treeParams.canopyType === 0 && (
        // 球形樹冠
        <mesh
          position={[0, treeParams.trunkHeight + treeParams.canopySize * 0.5, 0]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[treeParams.canopySize, 12, 12]} />
          <meshStandardMaterial
            color={canopyColor}
            roughness={0.8}
            metalness={0}
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
            args={[treeParams.canopySize, treeParams.canopyHeight, 8]}
          />
          <meshStandardMaterial
            color={canopyColor}
            roughness={0.8}
            metalness={0}
          />
        </mesh>
      )}

      {treeParams.canopyType === 2 && (
        // 多層不規則樹冠
        <>
          {Array.from({ length: treeParams.canopyLayers }).map((_, i) => {
            const layerY = treeParams.trunkHeight + (i * 0.6)
            const layerSize = treeParams.canopySize * (1 - i * 0.2)
            return (
              <mesh
                key={i}
                position={[0, layerY, 0]}
                castShadow
                receiveShadow
              >
                <sphereGeometry args={[layerSize, 8, 8]} />
                <meshStandardMaterial
                  color={canopyColor}
                  roughness={0.8}
                  metalness={0}
                />
              </mesh>
            )
          })}
        </>
      )}

    </group>
  )
}
