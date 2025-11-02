/**
 * MemoryFlower - 记忆花 3D 模型组件
 *
 * 视觉表现：
 * - 颜色：代表情感（温暖黄、柔粉、天蓝等）
 * - 大小：表示重要性/影响力
 * - 位置：显示时间关系
 * - 发光：活跃/最近的记忆更亮
 */

import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'

export interface MemoryFlowerData {
  id: string
  title: string
  emoji: string
  importance: number // 1-10
  color: string
  position: [number, number, number]
  createdAt: Date
  tags?: string[]
}

interface MemoryFlowerProps {
  memory: MemoryFlowerData
  onClick?: (memory: MemoryFlowerData) => void
  isActive?: boolean
}

export function MemoryFlower({ memory, onClick, isActive = false }: MemoryFlowerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // 根据重要性计算大小
  const scale = 0.3 + (memory.importance / 10) * 0.4 // 0.3 - 0.7

  // 呼吸动画 + 漂浮
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      const breathe = 1 + Math.sin(time * 2) * 0.05
      const float = Math.sin(time * 0.5 + memory.position[0]) * 0.1

      groupRef.current.scale.setScalar(scale * breathe)
      groupRef.current.position.y = memory.position[1] + float

      // 微妙旋转
      groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.2
    }
  })

  // 光标由 cursor.css 统一管理，不需要动态设置
  // useEffect(() => {
  //   document.body.style.cursor = hovered ? 'pointer' : 'auto'
  // }, [hovered])

  return (
    <group
      ref={groupRef}
      position={memory.position}
      onClick={() => onClick?.(memory)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 花茎 */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.6, 8]} />
        <meshStandardMaterial color="#50C878" />
      </mesh>

      {/* 花朵底部 - 中心 */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={memory.color}
          emissive={memory.color}
          emissiveIntensity={isActive || hovered ? 0.5 : 0.2}
        />
      </mesh>

      {/* 花瓣 - 6片围绕中心 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const x = Math.cos(angle) * 0.2
        const z = Math.sin(angle) * 0.2

        return (
          <mesh
            key={i}
            position={[x, 0, z]}
            rotation={[Math.PI / 6, angle, 0]}
          >
            <sphereGeometry args={[0.12, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={memory.color}
              transparent
              opacity={0.8}
              emissive={memory.color}
              emissiveIntensity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* 外层花瓣 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6 + 0.5 / 6) * Math.PI * 2
        const x = Math.cos(angle) * 0.3
        const z = Math.sin(angle) * 0.3

        return (
          <mesh
            key={`outer-${i}`}
            position={[x, -0.05, z]}
            rotation={[Math.PI / 4, angle, 0]}
          >
            <sphereGeometry args={[0.1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={memory.color}
              transparent
              opacity={0.6}
              emissive={memory.color}
              emissiveIntensity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* 花蕊 - 小光球 */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial
          color="#FFFACD"
          emissive="#FFFACD"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* 点光源 */}
      <pointLight
        position={[0, 0.15, 0]}
        intensity={isActive || hovered ? 0.8 : 0.3}
        distance={2}
        color={memory.color}
      />

      {/* Hover 显示信息 */}
      {hovered && (
        <Html position={[0, 0.8, 0]} center>
          <div
            className="px-4 py-3 rounded-2xl shadow-2xl whitespace-nowrap max-w-xs"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,248,240,0.95))',
              border: `3px solid ${memory.color}`,
              pointerEvents: 'none'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{memory.emoji}</span>
              <span className="font-bold text-gray-800">{memory.title}</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>⭐ 重要度: {memory.importance}/10</div>
              <div>📅 {memory.createdAt.toLocaleDateString('zh-TW')}</div>
              {memory.tags && memory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {memory.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: `${memory.color}40`,
                        color: memory.color
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Html>
      )}

      {/* 光环效果（仅活跃状态） */}
      {(isActive || hovered) && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 32]} />
          <meshStandardMaterial
            color={memory.color}
            transparent
            opacity={0.4}
            emissive={memory.color}
            emissiveIntensity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

/**
 * MemoryFlowerField - 记忆花田组件
 * 用于显示一组记忆花
 */
interface MemoryFlowerFieldProps {
  memories: MemoryFlowerData[]
  onFlowerClick?: (memory: MemoryFlowerData) => void
  activeMemoryId?: string
}

export function MemoryFlowerField({
  memories,
  onFlowerClick,
  activeMemoryId
}: MemoryFlowerFieldProps) {
  return (
    <group>
      {memories.map((memory) => (
        <MemoryFlower
          key={memory.id}
          memory={memory}
          onClick={onFlowerClick}
          isActive={memory.id === activeMemoryId}
        />
      ))}
    </group>
  )
}
