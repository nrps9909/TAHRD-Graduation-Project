/**
 * IslandLabel - 島嶼上方的漂浮標識招牌
 * 顯示知識庫名稱、emoji 和記憶數量
 */

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group } from 'three'
import { Island } from '../../types/island'

interface IslandLabelProps {
  island: Island
  position: [number, number, number] // 島嶼中心位置
  onClick?: () => void
  onHover?: (isHovered: boolean) => void
}

export function IslandLabel({ island, position, onClick, onHover }: IslandLabelProps) {
  const groupRef = useRef<Group>(null)
  const [isHovered, setIsHovered] = useState(false)

  // 上下浮動動畫
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const floatOffset = Math.sin(clock.getElapsedTime() * 0.8 + position[0]) * 0.3
      groupRef.current.position.y = position[1] + 8 + floatOffset
    }
  })

  const handlePointerEnter = () => {
    setIsHovered(true)
    onHover?.(true)
  }

  const handlePointerLeave = () => {
    setIsHovered(false)
    onHover?.(false)
  }

  return (
    <group ref={groupRef} position={[position[0], position[1] + 8, position[2]]}>
      {/* HTML 標籤卡片 - 簡潔版本 */}
      <Html
        center
        distanceFactor={12}
        zIndexRange={[15, 0]}
        style={{
          transition: 'transform 0.1s ease-out',
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
          pointerEvents: 'auto',
          willChange: 'transform'
        }}
      >
        <div
          className={`
            relative backdrop-blur-xl
            transition-all duration-100 cursor-pointer
            ${isHovered ? 'shadow-2xl' : 'shadow-lg'}
          `}
          style={{
            background: isHovered
              ? `linear-gradient(135deg, ${island.color}dd, ${island.color}bb)`
              : `linear-gradient(135deg, ${island.color}aa, ${island.color}88)`,
            border: `6px solid ${island.color}`,
            padding: '36px 48px',
            borderRadius: '36px',
            boxShadow: isHovered
              ? `0 30px 90px ${island.color}66, 0 0 60px ${island.color}44`
              : `0 15px 45px ${island.color}44`,
            willChange: 'background, box-shadow'
          }}
          onClick={onClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {/* Emoji 圖標 */}
          <div className="text-center" style={{ marginBottom: '18px' }}>
            <span
              className="inline-block transition-transform duration-150"
              style={{
                fontSize: '10rem',
                transform: isHovered ? 'scale(1.2) rotateY(360deg)' : 'scale(1)',
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.2))',
                willChange: 'transform'
              }}
            >
              {island.emoji}
            </span>
          </div>

          {/* 知識庫名稱 */}
          <h2
            className="font-black text-center text-white whitespace-nowrap"
            style={{
              fontSize: '6rem',
              textShadow: '0 3px 12px rgba(0,0,0,0.3)',
              letterSpacing: '0.05em'
            }}
          >
            {island.nameChinese}
          </h2>

          {/* Hover 提示 */}
          {isHovered && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2
                         text-white font-bold whitespace-nowrap
                         animate-bounce-gentle"
              style={{
                bottom: '-72px',
                padding: '12px 24px',
                borderRadius: '18px',
                fontSize: '2rem',
                background: `linear-gradient(135deg, ${island.color}, ${island.color}dd)`,
                boxShadow: `0 6px 18px ${island.color}88`
              }}
            >
              點擊進入 👆
            </div>
          )}
        </div>
      </Html>

      {/* 裝飾性光環 */}
      {isHovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[2, 2.5, 32]} />
          <meshBasicMaterial
            color={island.color}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
