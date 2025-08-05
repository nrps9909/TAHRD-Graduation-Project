import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TreeProps {
  position: [number, number, number]
  variant?: 'normal' | 'fruit' | 'pine' | 'cherry'
  scale?: number
}

export const Tree = ({ position, variant = 'normal', scale = 1 }: TreeProps) => {
  const treeRef = useRef<THREE.Group>(null)
  const leavesRef = useRef<THREE.Mesh>(null)

  // 樹葉輕微搖動動畫
  useFrame((state) => {
    if (leavesRef.current) {
      leavesRef.current.rotation.z = Math.sin(state.clock.elapsedTime + position[0]) * 0.02
      leavesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + position[2]) * 0.01
    }
  })

  const getTreeColors = () => {
    switch (variant) {
      case 'fruit':
        return { trunk: '#8B4513', leaves: '#228B22', accent: '#FF6347' }
      case 'pine':
        return { trunk: '#654321', leaves: '#0F4C0F', accent: '#2F4F2F' }
      case 'cherry':
        return { trunk: '#8B4513', leaves: '#FFB6C1', accent: '#FF1493' }
      default:
        return { trunk: '#8B4513', leaves: '#32CD32', accent: '#228B22' }
    }
  }

  const colors = getTreeColors()
  const treeHeight = 3 * scale
  const trunkHeight = treeHeight * 0.4
  const leavesHeight = treeHeight * 0.7

  return (
    <group ref={treeRef} position={position}>
      {/* 樹幹 */}
      <mesh castShadow receiveShadow position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.2 * scale, 0.3 * scale, trunkHeight, 8]} />
        <meshLambertMaterial color={colors.trunk} />
      </mesh>

      {/* 樹葉主體 */}
      <group ref={leavesRef} position={[0, trunkHeight + leavesHeight * 0.3, 0]}>
        {variant === 'pine' ? (
          // 松樹 - 錐形層疊
          <>
            <mesh castShadow position={[0, 0, 0]}>
              <coneGeometry args={[1.5 * scale, leavesHeight * 0.5, 8]} />
              <meshLambertMaterial color={colors.leaves} />
            </mesh>
            <mesh castShadow position={[0, leavesHeight * 0.3, 0]}>
              <coneGeometry args={[1.2 * scale, leavesHeight * 0.4, 8]} />
              <meshLambertMaterial color={colors.leaves} />
            </mesh>
            <mesh castShadow position={[0, leavesHeight * 0.5, 0]}>
              <coneGeometry args={[0.8 * scale, leavesHeight * 0.3, 8]} />
              <meshLambertMaterial color={colors.leaves} />
            </mesh>
          </>
        ) : (
          // 圓形樹冠
          <>
            <mesh castShadow>
              <sphereGeometry args={[1.5 * scale, 16, 16]} />
              <meshLambertMaterial color={colors.leaves} />
            </mesh>
            {/* 樹冠細節 */}
            <mesh castShadow position={[0.5 * scale, 0.3 * scale, 0.5 * scale]}>
              <sphereGeometry args={[0.8 * scale, 12, 12]} />
              <meshLambertMaterial color={colors.accent} />
            </mesh>
            <mesh castShadow position={[-0.4 * scale, -0.2 * scale, 0.6 * scale]}>
              <sphereGeometry args={[0.6 * scale, 12, 12]} />
              <meshLambertMaterial color={colors.accent} />
            </mesh>
          </>
        )}
      </group>

      {/* 水果（如果是果樹） */}
      {variant === 'fruit' && (
        <>
          <mesh castShadow position={[0.8 * scale, trunkHeight + 0.5 * scale, 0.3 * scale]}>
            <sphereGeometry args={[0.15 * scale, 8, 8]} />
            <meshLambertMaterial color="#FF6347" />
          </mesh>
          <mesh castShadow position={[-0.6 * scale, trunkHeight + 0.8 * scale, -0.4 * scale]}>
            <sphereGeometry args={[0.15 * scale, 8, 8]} />
            <meshLambertMaterial color="#FF6347" />
          </mesh>
          <mesh castShadow position={[0.2 * scale, trunkHeight + 1.2 * scale, 0.7 * scale]}>
            <sphereGeometry args={[0.15 * scale, 8, 8]} />
            <meshLambertMaterial color="#FFA500" />
          </mesh>
        </>
      )}

      {/* 櫻花花瓣（如果是櫻花樹） */}
      {variant === 'cherry' && (
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2
            const radius = 1.2 * scale
            return (
              <mesh
                key={i}
                castShadow
                position={[
                  Math.cos(angle) * radius,
                  trunkHeight + leavesHeight * 0.3 + Math.random() * 0.5,
                  Math.sin(angle) * radius
                ]}
              >
                <sphereGeometry args={[0.1 * scale, 6, 6]} />
                <meshLambertMaterial color="#FFB6C1" />
              </mesh>
            )
          })}
        </>
      )}

      {/* 樹影 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[1.8 * scale, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}