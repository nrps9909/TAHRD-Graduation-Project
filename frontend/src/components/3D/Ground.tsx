import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export const Ground = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const waterRef = useRef<THREE.Mesh>(null)

  // 讓湖水輕輕波動
  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = 0.02 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    }
  })

  return (
    <>
      {/* 主島嶼地面 - 更大更圓潤 */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshLambertMaterial color="#7FDF7F" />
      </mesh>
      
      {/* 沙灘邊緣 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <ringGeometry args={[55, 60, 64]} />
        <meshLambertMaterial color="#F4E4C1" />
      </mesh>
      
      {/* 小徑 */}
      <group>
        {/* 中央廣場到咖啡館的路 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0, 7.5]} receiveShadow>
          <planeGeometry args={[2, 15]} />
          <meshLambertMaterial color="#D2B48C" />
        </mesh>
        
        {/* 中央廣場到圖書館的路 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0, -5]} receiveShadow>
          <planeGeometry args={[2, 10]} />
          <meshLambertMaterial color="#D2B48C" />
        </mesh>
        
        {/* 中央廣場到湖邊的路 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 12.5]} receiveShadow>
          <planeGeometry args={[2, 25]} />
          <meshLambertMaterial color="#D2B48C" />
        </mesh>
        
        {/* 中央廣場 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[8, 32]} />
          <meshLambertMaterial color="#F5DEB3" />
        </mesh>
      </group>
      
      {/* 中央湖泊 */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 20]} receiveShadow>
        <circleGeometry args={[8, 32]} />
        <meshLambertMaterial color="#87CEEB" transparent opacity={0.7} />
      </mesh>
      
      {/* 湖泊周圍的裝飾 */}
      <group>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const radius = 10
          const x = Math.cos(angle) * radius
          const z = 20 + Math.sin(angle) * radius
          return (
            <mesh key={i} position={[x, 0.1, z]} receiveShadow>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshLambertMaterial color="#98FB98" />
            </mesh>
          )
        })}
      </group>
      
      {/* 花園區域 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, 0.01, -5]} receiveShadow>
        <circleGeometry args={[10, 32]} />
        <meshLambertMaterial color="#98FB98" />
      </mesh>
      
      {/* 森林區域 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, 0.01, 15]} receiveShadow>
        <circleGeometry args={[12, 32]} />
        <meshLambertMaterial color="#6B8E23" />
      </mesh>
      
      {/* 隨機散佈的小裝飾 */}
      <group>
        {/* 石頭 */}
        {Array.from({ length: 15 }, (_, i) => {
          const angle = Math.random() * Math.PI * 2
          const radius = 20 + Math.random() * 30
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const scale = 0.5 + Math.random() * 0.5
          return (
            <mesh key={`rock-${i}`} position={[x, scale * 0.3, z]} receiveShadow>
              <sphereGeometry args={[scale, 6, 6]} />
              <meshLambertMaterial color="#696969" />
            </mesh>
          )
        })}
        
        {/* 小花叢 */}
        {Array.from({ length: 20 }, (_, i) => {
          const angle = Math.random() * Math.PI * 2
          const radius = 10 + Math.random() * 40
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          return (
            <mesh key={`flower-${i}`} position={[x, 0.2, z]} receiveShadow>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshLambertMaterial color={`hsl(${Math.random() * 360}, 70%, 80%)`} />
            </mesh>
          )
        })}
      </group>
    </>
  )
}