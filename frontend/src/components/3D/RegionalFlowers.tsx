/**
 * RegionalFlowers - 不同区域的特色花朵
 * 每个区域有独特的花朵样式和颜色
 */

import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { getTerrainHeight } from './TerrainIsland/terrainUtils'

export interface RegionalFlowerData {
  id: string
  title: string
  emoji: string
  importance: number
  position: [number, number, number]
  createdAt: Date
  tags?: string[]
  island?: {
    name: string
    color: string
    secondaryColor?: string
    shape?: string
  }
}

interface RegionalFlowerProps {
  flower: RegionalFlowerData
  onClick?: (flower: RegionalFlowerData) => void
  isActive?: boolean
}

export function RegionalFlower({ flower, onClick, isActive = false }: RegionalFlowerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // 使用島嶼信息或默認值
  const config = flower.island || {
    name: '未分類',
    color: '#999',
    secondaryColor: '#bbb',
    shape: 'sakura'
  }
  const scale = 0.4 + (flower.importance / 10) * 0.5

  // 根据地形计算正确的 Y 坐标
  const x = flower.position[0]
  const z = flower.position[2]
  const terrainY = getTerrainHeight(x, z)
  const baseY = terrainY - 1 // 与 group position 对齐

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      const breathe = 1 + Math.sin(time * 2) * 0.08
      const float = Math.sin(time * 0.5 + flower.position[0]) * 0.15

      groupRef.current.scale.setScalar(scale * breathe)
      groupRef.current.position.y = baseY + float
      groupRef.current.rotation.y = Math.sin(time * 0.4) * 0.3
    }
  })

  // 光标由 cursor.css 统一管理，不需要动态设置
  // useEffect(() => {
  //   document.body.style.cursor = hovered ? 'pointer' : 'auto'
  // }, [hovered])

  return (
    <group
      ref={groupRef}
      position={[x, baseY, z]}
      onClick={() => onClick?.(flower)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 花茎 */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#50C878" />
      </mesh>

      {/* 根据形状渲染不同的花朵（默認使用櫻花） */}
      {config.shape === 'book' ? (
        <BookFlower config={config} hovered={hovered} isActive={isActive} />
      ) : config.shape === 'bulb' ? (
        <BulbFlower config={config} hovered={hovered} isActive={isActive} />
      ) : config.shape === 'gear' ? (
        <GearFlower config={config} hovered={hovered} isActive={isActive} />
      ) : config.shape === 'heart' ? (
        <HeartFlower config={config} hovered={hovered} isActive={isActive} />
      ) : config.shape === 'arrow' ? (
        <ArrowFlower config={config} hovered={hovered} isActive={isActive} />
      ) : config.shape === 'chest' ? (
        <ChestFlower config={config} hovered={hovered} isActive={isActive} />
      ) : (
        <SakuraFlower config={config} hovered={hovered} isActive={isActive} />
      )}

      {/* Hover 信息 */}
      {hovered && (
        <Html position={[0, 1.2, 0]} center>
          <div
            className="px-4 py-3 rounded-2xl shadow-2xl whitespace-nowrap max-w-xs backdrop-blur-md"
            style={{
              background: `linear-gradient(135deg, ${config.color}20, ${config.secondaryColor}40)`,
              border: `3px solid ${config.color}`,
              pointerEvents: 'none'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{flower.emoji}</span>
              <span className="font-bold" style={{ color: config.color }}>
                {flower.title}
              </span>
            </div>
            <div className="text-xs" style={{ color: config.color }}>
              <div>🏝️ {config.name}</div>
              <div>⭐ 重要度: {flower.importance}/10</div>
              {flower.tags && flower.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {flower.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: config.secondaryColor || '#bbb',
                        color: 'white'
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

      {/* 光源 */}
      <pointLight
        position={[0, 0.3, 0]}
        intensity={isActive || hovered ? 1.2 : 0.5}
        distance={3}
        color={config.color}
      />
    </group>
  )
}

// ===== 各种花朵形状组件 =====

interface FlowerProps {
  config: {
    name: string
    color: string
    secondaryColor?: string
    shape?: string
  }
  hovered: boolean
  isActive: boolean
}

function BookFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 书本中心 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.2]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.5 : 0.2}
        />
      </mesh>
      {/* 书页 */}
      {[0, 0.05, 0.1].map((offset, i) => (
        <mesh key={i} position={[0.15, offset - 0.05, 0]}>
          <boxGeometry args={[0.02, 0.35, 0.18]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </>
  )
}

function BulbFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 灯泡主体 */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* 灯泡底座 */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.15, 8]} />
        <meshStandardMaterial color={config.secondaryColor || '#bbb'} />
      </mesh>
    </>
  )
}

function GearFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 齿轮中心 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 8]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.5 : 0.2}
        />
      </mesh>
      {/* 齿轮齿 */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2]}
          >
            <boxGeometry args={[0.08, 0.1, 0.08]} />
            <meshStandardMaterial color={config.secondaryColor || '#bbb'} />
          </mesh>
        )
      })}
    </>
  )
}

function HeartFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 心形（用两个球体组合） */}
      <mesh position={[-0.1, 0.1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.6 : 0.2}
        />
      </mesh>
      <mesh position={[0.1, 0.1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.6 : 0.2}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.2, 0.2, 0.15]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.6 : 0.2}
        />
      </mesh>
    </>
  )
}

function SakuraFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 樱花中心 */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#FFFACD" emissive="#FFFACD" emissiveIntensity={0.5} />
      </mesh>
      {/* 5片花瓣 */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2
        const x = Math.cos(angle) * 0.18
        const z = Math.sin(angle) * 0.18
        return (
          <mesh
            key={i}
            position={[x, 0, z]}
            rotation={[Math.PI / 3, angle, 0]}
          >
            <sphereGeometry args={[0.15, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={config.color}
              transparent
              opacity={0.85}
              emissive={config.color}
              emissiveIntensity={isActive || hovered ? 0.4 : 0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </>
  )
}

function ArrowFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 箭头杆 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.5 : 0.2}
        />
      </mesh>
      {/* 箭头头部 */}
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.12, 0.2, 8]} />
        <meshStandardMaterial
          color={config.secondaryColor || '#bbb'}
          emissive={config.secondaryColor || '#bbb'}
          emissiveIntensity={isActive || hovered ? 0.6 : 0.3}
        />
      </mesh>
      {/* 箭尾 */}
      <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.08, 0.1, 3]} />
        <meshStandardMaterial color={config.color} />
      </mesh>
    </>
  )
}

function ChestFlower({ config, hovered, isActive }: FlowerProps) {
  return (
    <>
      {/* 宝箱主体 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.25, 0.25]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isActive || hovered ? 0.5 : 0.2}
        />
      </mesh>
      {/* 宝箱盖子 */}
      <mesh position={[0, 0.15, 0]} rotation={[hovered ? -0.3 : 0, 0, 0]}>
        <boxGeometry args={[0.32, 0.1, 0.27]} />
        <meshStandardMaterial color={config.secondaryColor || '#bbb'} />
      </mesh>
      {/* 锁扣 */}
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[0.08, 0.1, 0.02]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    </>
  )
}
