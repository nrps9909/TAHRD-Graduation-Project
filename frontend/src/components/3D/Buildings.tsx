import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const Buildings = () => {
  const groupRef = useRef<THREE.Group>(null)

  // 輕微的建築物呼吸效果
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        child.position.y = Math.sin(state.clock.elapsedTime + index) * 0.02
      })
    }
  })

  return (
    <group ref={groupRef}>
      {/* 咖啡館 */}
      <group position={[10, 0, 15]}>
        {/* 主建築 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 3, 4]} />
          <meshLambertMaterial color="#DEB887" />
        </mesh>
        
        {/* 屋頂 */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <coneGeometry args={[3, 1.5, 4]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 門 */}
        <mesh position={[0, -0.5, 2.1]} castShadow>
          <boxGeometry args={[1, 2, 0.2]} />
          <meshLambertMaterial color="#654321" />
        </mesh>
        
        {/* 窗戶 */}
        <mesh position={[-1.5, 0.5, 2.1]} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.1]} />
          <meshBasicMaterial color="#87CEEB" />
        </mesh>
        <mesh position={[1.5, 0.5, 2.1]} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.1]} />
          <meshBasicMaterial color="#87CEEB" />
        </mesh>
        
        {/* 招牌 */}
        <mesh position={[0, 2, 2.5]} castShadow>
          <boxGeometry args={[2, 0.5, 0.1]} />
          <meshLambertMaterial color="#FF69B4" />
        </mesh>
      </group>

      {/* 圖書館 */}
      <group position={[-20, 0, -10]}>
        {/* 主建築 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5, 4, 5]} />
          <meshLambertMaterial color="#F5DEB3" />
        </mesh>
        
        {/* 屋頂 */}
        <mesh position={[0, 3, 0]} castShadow>
          <boxGeometry args={[5.5, 0.5, 5.5]} />
          <meshLambertMaterial color="#696969" />
        </mesh>
        
        {/* 柱子 */}
        {[-1.5, 0, 1.5].map((x, index) => (
          <mesh key={index} position={[x, 0, 2.6]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 4]} />
            <meshLambertMaterial color="#DCDCDC" />
          </mesh>
        ))}
        
        {/* 門 */}
        <mesh position={[0, -1, 2.6]} castShadow>
          <boxGeometry args={[2, 3, 0.2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
      </group>

      {/* 音樂台（月兒的地方） */}
      <group position={[0, 0, 25]}>
        {/* 圓形平台 */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3, 3, 1]} />
          <meshLambertMaterial color="#E6E6FA" />
        </mesh>
        
        {/* 小亭子屋頂 */}
        <mesh position={[0, 4, 0]} castShadow>
          <coneGeometry args={[4, 2, 8]} />
          <meshLambertMaterial color="#DDA0DD" />
        </mesh>
        
        {/* 支撐柱 */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i / 6) * Math.PI * 2
          const x = Math.cos(angle) * 2.5
          const z = Math.sin(angle) * 2.5
          return (
            <mesh key={i} position={[x, 2, z]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 3]} />
              <meshLambertMaterial color="#FFFFFF" />
            </mesh>
          )
        })}
      </group>

      {/* 小房子（給小晴） */}
      <group position={[-15, 0, 20]}>
        {/* 主建築 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 2.5, 3]} />
          <meshLambertMaterial color="#FFE4B5" />
        </mesh>
        
        {/* 屋頂 */}
        <mesh position={[0, 2, 0]} castShadow>
          <coneGeometry args={[2.5, 1.5, 4]} />
          <meshLambertMaterial color="#FF6347" />
        </mesh>
        
        {/* 門 */}
        <mesh position={[0, -0.25, 1.6]} castShadow>
          <boxGeometry args={[0.8, 1.5, 0.2]} />
          <meshLambertMaterial color="#32CD32" />
        </mesh>
        
        {/* 窗戶 */}
        <mesh position={[1, 0.25, 1.6]} castShadow>
          <boxGeometry args={[0.6, 0.6, 0.1]} />
          <meshBasicMaterial color="#87CEEB" />
        </mesh>
      </group>

      {/* 花園小屋（老張的工具房） */}
      <group position={[30, 0, 0]}>
        {/* 小屋 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 屋頂 */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[2.5, 0.5, 2.5]} />
          <meshLambertMaterial color="#A0522D" />
        </mesh>
        
        {/* 門 */}
        <mesh position={[0, -0.5, 1.1]} castShadow>
          <boxGeometry args={[0.8, 1, 0.2]} />
          <meshLambertMaterial color="#654321" />
        </mesh>
      </group>

      {/* 裝飾性樹木 */}
      {[
        [5, 0, 5],
        [-5, 0, 5],
        [15, 0, -5],
        [-10, 0, 15],
        [20, 0, 10],
      ].map((position, index) => (
        <group key={`tree-${index}`} position={position as [number, number, number]}>
          {/* 樹幹 */}
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.4, 3]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          
          {/* 樹冠 */}
          <mesh position={[0, 3, 0]} castShadow>
            <sphereGeometry args={[1.5, 8, 8]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>
        </group>
      ))}

      {/* 路燈 */}
      {[
        [0, 0, 8],
        [8, 0, 0],
        [-8, 0, 0],
        [0, 0, -8],
      ].map((position, index) => (
        <group key={`lamp-${index}`} position={position as [number, number, number]}>
          {/* 燈柱 */}
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 4]} />
            <meshLambertMaterial color="#696969" />
          </mesh>
          
          {/* 燈罩 */}
          <mesh position={[0, 2.5, 0]} castShadow>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color="#FFFFE0" />
          </mesh>
          
          {/* 燈光 */}
          <pointLight
            position={[0, 2.5, 0]}
            intensity={0.5}
            distance={10}
            color="#FFFFE0"
          />
        </group>
      ))}
    </group>
  )
}