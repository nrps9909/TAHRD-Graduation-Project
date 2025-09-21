import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

interface TreeProps {
  position: [number, number, number]
  variant?: 'normal' | 'fruit' | 'pine' | 'cherry'
  scale?: number
}

export const Tree = ({ position, variant = 'normal', scale = 1 }: TreeProps) => {
  const treeRef = useRef<THREE.Group>(null)
  const leavesRef = useRef<THREE.Mesh>(null)
  const trunkRef = useRef<THREE.Mesh>(null)
  const { weather } = useTimeStore()

  // 根據風力強度計算搖擺幅度
  const getWindIntensity = (weather: string): number => {
    switch (weather) {
      case 'windy': return 1.5    // 大風天
      case 'storm': return 2.0    // 暴風雨
      case 'rain': return 0.8     // 雨天微風
      case 'drizzle': return 0.5  // 細雨微風
      case 'clear': return 0.3    // 晴天微風
      case 'cloudy': return 0.4   // 多雲微風
      default: return 0.2         // 其他天氣微風
    }
  }

  // 樹木風吹搖動動畫
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const windIntensity = getWindIntensity(weather)
    const baseFrequency = 1.2 // 基礎搖擺頻率
    const treeOffset = position[0] * 0.1 + position[2] * 0.1 // 每棵樹的偏移
    
    if (leavesRef.current) {
      // 樹葉主要搖動 - 根據風力調整
      const leafSwayX = Math.sin(time * baseFrequency + treeOffset) * windIntensity * 0.08
      const leafSwayZ = Math.sin(time * baseFrequency * 0.7 + treeOffset * 1.3) * windIntensity * 0.06
      const leafTwist = Math.sin(time * baseFrequency * 1.5 + treeOffset * 0.8) * windIntensity * 0.04
      
      leavesRef.current.rotation.x = leafSwayX
      leavesRef.current.rotation.z = leafSwayZ + leafTwist
      
      // 強風時的額外晃動
      if (windIntensity > 1.0) {
        const gustX = Math.sin(time * 3.0 + treeOffset * 2) * (windIntensity - 1.0) * 0.05
        const gustZ = Math.cos(time * 2.5 + treeOffset * 1.5) * (windIntensity - 1.0) * 0.04
        leavesRef.current.rotation.x += gustX
        leavesRef.current.rotation.z += gustZ
      }
    }
    
    if (trunkRef.current) {
      // 樹幹輕微搖動 - 模擬整棵樹的重心移動
      const trunkSwayX = Math.sin(time * baseFrequency * 0.8 + treeOffset) * windIntensity * 0.015
      const trunkSwayZ = Math.sin(time * baseFrequency * 0.6 + treeOffset * 1.2) * windIntensity * 0.012
      
      trunkRef.current.rotation.x = trunkSwayX
      trunkRef.current.rotation.z = trunkSwayZ
      
      // 強風時樹幹更明顯的彎曲
      if (windIntensity > 1.0) {
        const trunkBendX = Math.sin(time * 1.8 + treeOffset) * (windIntensity - 1.0) * 0.025
        const trunkBendZ = Math.cos(time * 1.6 + treeOffset * 0.8) * (windIntensity - 1.0) * 0.02
        trunkRef.current.rotation.x += trunkBendX
        trunkRef.current.rotation.z += trunkBendZ
      }
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
  const trunkHeight = treeHeight * 0.6 // 增加樹幹高度
  const rootDepth = treeHeight * 3.0 // 大幅增加根部深度 (10倍以上)
  const leavesHeight = treeHeight * 0.7

  return (
    <group ref={treeRef} position={position}>
      {/* 樹幹 - 延伸到地面以下 */}
      <mesh ref={trunkRef} castShadow receiveShadow position={[0, (trunkHeight - rootDepth) / 2, 0]}>
        <cylinderGeometry 
          args={[
            0.15 * scale, // 頂部較細
            0.4 * scale,  // 底部更粗，模擬根部擴張
            trunkHeight, 
            8
          ]} 
        />
        <meshLambertMaterial color={colors.trunk} />
      </mesh>

      {/* 主根系統 - 分多段延伸到地下深處 */}
      {Array.from({ length: 5 }, (_, segment) => {
        const segmentHeight = rootDepth / 5
        const segmentY = -segmentHeight * (segment + 0.5)
        const topRadius = 0.4 * scale * Math.pow(0.85, segment) // 逐段變細
        const bottomRadius = 0.4 * scale * Math.pow(0.85, segment + 1)
        const colorIntensity = Math.max(0.3, 0.8 - segment * 0.1) // 越深越暗
        
        return (
          <mesh key={`root-segment-${segment}`} castShadow receiveShadow position={[0, segmentY, 0]}>
            <cylinderGeometry 
              args={[
                topRadius,
                bottomRadius,
                segmentHeight, 
                8
              ]} 
            />
            <meshLambertMaterial color={new THREE.Color(colors.trunk).multiplyScalar(colorIntensity)} />
          </mesh>
        )
      })}

      {/* 側根系統 - 從主根延伸出的分支根系 */}
      {Array.from({ length: 12 }, (_, i) => {
        const depth = Math.random() * rootDepth * 0.8 + rootDepth * 0.2 // 在根部深度範圍內隨機分布
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5
        const radius = Math.random() * 2 + 1
        const rootLength = Math.random() * 3 + 2
        const rootThickness = 0.05 + Math.random() * 0.03
        const bendAngle = (Math.random() - 0.5) * Math.PI * 0.3 // 彎曲角度
        
        return (
          <mesh 
            key={`side-root-${i}`}
            castShadow 
            receiveShadow 
            position={[
              Math.cos(angle) * radius * 0.3 * scale,
              -depth,
              Math.sin(angle) * radius * 0.3 * scale
            ]}
            rotation={[
              Math.PI / 2 + bendAngle,
              angle,
              (Math.random() - 0.5) * 0.4
            ]}
          >
            <cylinderGeometry 
              args={[
                rootThickness * scale, 
                (rootThickness * 0.3) * scale, 
                rootLength * scale, 
                6
              ]} 
            />
            <meshLambertMaterial color={new THREE.Color(colors.trunk).multiplyScalar(0.6)} />
          </mesh>
        )
      })}

      {/* 細根網絡 - 深層的毛細根系 */}
      {Array.from({ length: 20 }, (_, i) => {
        const depth = Math.random() * rootDepth * 0.6 + rootDepth * 0.4 // 主要在深層
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * 1.5 + 0.5
        const rootLength = Math.random() * 1.5 + 0.8
        const rootThickness = 0.02 + Math.random() * 0.015
        
        return (
          <mesh 
            key={`fine-root-${i}`}
            castShadow 
            receiveShadow 
            position={[
              Math.cos(angle) * radius * scale,
              -depth,
              Math.sin(angle) * radius * scale
            ]}
            rotation={[
              Math.random() * Math.PI * 2,
              angle,
              Math.random() * Math.PI * 2
            ]}
          >
            <cylinderGeometry 
              args={[
                rootThickness * scale, 
                (rootThickness * 0.2) * scale, 
                rootLength * scale, 
                4
              ]} 
            />
            <meshLambertMaterial color={new THREE.Color(colors.trunk).multiplyScalar(0.4)} />
          </mesh>
        )
      })}

      {/* 露出地面的樹根 */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const rootLength = 0.8 + Math.random() * 0.4
        const rootThickness = 0.08 + Math.random() * 0.04
        return (
          <mesh 
            key={i} 
            castShadow 
            receiveShadow 
            position={[
              Math.cos(angle) * 0.3 * scale,
              -0.1 * scale,
              Math.sin(angle) * 0.3 * scale
            ]}
            rotation={[
              Math.PI / 2 + (Math.random() - 0.5) * 0.3,
              angle,
              (Math.random() - 0.5) * 0.2
            ]}
          >
            <cylinderGeometry 
              args={[
                rootThickness * scale, 
                (rootThickness * 0.5) * scale, 
                rootLength * scale, 
                6
              ]} 
            />
            <meshLambertMaterial color={new THREE.Color(colors.trunk).multiplyScalar(0.9)} />
          </mesh>
        )
      })}

      {/* 樹葉主體 */}
      <group ref={leavesRef} position={[0, (trunkHeight - rootDepth) + leavesHeight * 0.3, 0]}>
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
          <mesh castShadow position={[0.8 * scale, (trunkHeight - rootDepth) + 0.5 * scale, 0.3 * scale]}>
            <sphereGeometry args={[0.15 * scale, 8, 8]} />
            <meshLambertMaterial color="#FF6347" />
          </mesh>
          <mesh castShadow position={[-0.6 * scale, (trunkHeight - rootDepth) + 0.8 * scale, -0.4 * scale]}>
            <sphereGeometry args={[0.15 * scale, 8, 8]} />
            <meshLambertMaterial color="#FF6347" />
          </mesh>
          <mesh castShadow position={[0.2 * scale, (trunkHeight - rootDepth) + 1.2 * scale, 0.7 * scale]}>
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
                  (trunkHeight - rootDepth) + leavesHeight * 0.3 + Math.random() * 0.5,
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