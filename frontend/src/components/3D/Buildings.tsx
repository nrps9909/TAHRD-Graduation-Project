import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const Buildings = () => {
  const groupRef = useRef<THREE.Group>(null)

  // 輕微的建築物呼吸效果
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        child.position.y = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.01
      })
    }
  })

  return (
    <group ref={groupRef}>
      {/* 咖啡館 - 動物森友會風格 */}
      <group position={[10, 0, 15]}>
        {/* 主建築 - 圓潤的形狀 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5, 3.5, 5]} />
          <meshLambertMaterial color="#FFE4B5" />
        </mesh>
        
        {/* 圓潤的屋頂 */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <sphereGeometry args={[3.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#CD853F" />
        </mesh>
        
        {/* 煙囪 */}
        <mesh position={[-1.5, 4, -1]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 1.5, 8]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 門 */}
        <mesh position={[0, -0.5, 2.6]} castShadow>
          <boxGeometry args={[1.2, 2.5, 0.2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 門把手 */}
        <mesh position={[0.4, -0.5, 2.8]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshLambertMaterial color="#FFD700" />
        </mesh>
        
        {/* 圓形窗戶 */}
        <mesh position={[-1.8, 0.8, 2.6]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
          <meshLambertMaterial color="#87CEEB" />
        </mesh>
        <mesh position={[1.8, 0.8, 2.6]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
          <meshLambertMaterial color="#87CEEB" />
        </mesh>
        
        {/* 可愛的招牌 */}
        <mesh position={[0, 3, 3]} castShadow>
          <boxGeometry args={[2.5, 0.8, 0.1]} />
          <meshLambertMaterial color="#FFF8DC" />
        </mesh>
        
        {/* 戶外座位區 */}
        <mesh position={[3, -1.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.8, 8]} />
          <meshLambertMaterial color="#DEB887" />
        </mesh>
        <mesh position={[3, -0.4, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 0.1, 16]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
      </group>

      {/* 圖書館 - 童話風格 */}
      <group position={[-20, 0, -10]}>
        {/* 主建築 - 不規則形狀 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 4, 6]} />
          <meshLambertMaterial color="#E6E6FA" />
        </mesh>
        
        {/* 塔樓 */}
        <mesh position={[2, 2, 0]} castShadow>
          <cylinderGeometry args={[1.5, 1.5, 3, 8]} />
          <meshLambertMaterial color="#DDA0DD" />
        </mesh>
        
        {/* 塔樓屋頂 */}
        <mesh position={[2, 4.5, 0]} castShadow>
          <coneGeometry args={[2, 2, 8]} />
          <meshLambertMaterial color="#9370DB" />
        </mesh>
        
        {/* 主屋頂 */}
        <mesh position={[-1, 3, 0]} castShadow>
          <boxGeometry args={[4, 1.5, 6]} />
          <meshLambertMaterial color="#9370DB" />
        </mesh>
        
        {/* 大門 */}
        <mesh position={[0, -1, 3.1]} castShadow>
          <boxGeometry args={[1.5, 3, 0.2]} />
          <meshLambertMaterial color="#4B0082" />
        </mesh>
        
        {/* 圓形大窗戶 */}
        <mesh position={[0, 1, 3.1]} castShadow>
          <cylinderGeometry args={[1, 1, 0.1, 16]} />
          <meshLambertMaterial color="#F0E68C" />
        </mesh>
        
        {/* 書本裝飾 */}
        <mesh position={[-2.5, -1.5, 2]} castShadow rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.3, 0.5, 0.8]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 戶外閱讀區 */}
        <mesh position={[-4, -1.3, -2]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.5, 1.5]} />
          <meshLambertMaterial color="#DEB887" />
        </mesh>
      </group>

      {/* 花園小屋 - 可愛溫馨 */}
      <group position={[30, 0, 0]}>
        {/* 主建築 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.5, 3, 4.5]} />
          <meshLambertMaterial color="#F0E68C" />
        </mesh>
        
        {/* 玻璃溫室部分 */}
        <mesh position={[0, 0, 2.5]} castShadow>
          <boxGeometry args={[3, 2.5, 1]} />
          <meshLambertMaterial color="#87CEEB" transparent opacity={0.5} />
        </mesh>
        
        {/* 尖頂屋頂 */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[3.2, 1.8, 4]} />
          <meshLambertMaterial color="#8FBC8F" />
        </mesh>
        
        {/* 花箱 */}
        <mesh position={[2.5, -0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.6, 2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        <mesh position={[-2.5, -0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.6, 2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 門 */}
        <mesh position={[0, -0.5, 2.3]} castShadow>
          <boxGeometry args={[1, 2, 0.2]} />
          <meshLambertMaterial color="#DEB887" />
        </mesh>
        
        {/* 圓窗 */}
        <mesh position={[0, 1.2, 2.3]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
          <meshLambertMaterial color="#FFE4B5" />
        </mesh>
      </group>

      {/* 燈塔 - 標誌性建築 */}
      <group position={[0, 0, -25]}>
        {/* 底座 */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[2.5, 3, 2, 8]} />
          <meshLambertMaterial color="#F5F5DC" />
        </mesh>
        
        {/* 塔身 */}
        <mesh position={[0, 3, 0]} castShadow>
          <cylinderGeometry args={[2, 2.5, 6, 8]} />
          <meshLambertMaterial color="#FFFAF0" />
        </mesh>
        
        {/* 紅色條紋 */}
        <mesh position={[0, 2, 0]} castShadow>
          <cylinderGeometry args={[2.1, 2.6, 1.5, 8]} />
          <meshLambertMaterial color="#DC143C" />
        </mesh>
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[2.1, 2.1, 1.5, 8]} />
          <meshLambertMaterial color="#DC143C" />
        </mesh>
        
        {/* 燈室 */}
        <mesh position={[0, 7, 0]} castShadow>
          <cylinderGeometry args={[1.5, 2, 2, 16]} />
          <meshLambertMaterial color="#FFD700" transparent opacity={0.8} />
        </mesh>
        
        {/* 屋頂 */}
        <mesh position={[0, 8.5, 0]} castShadow>
          <coneGeometry args={[2, 1.5, 16]} />
          <meshLambertMaterial color="#DC143C" />
        </mesh>
        
        {/* 門 */}
        <mesh position={[0, -0.5, 2.6]} castShadow>
          <boxGeometry args={[0.8, 1.5, 0.2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* 小窗戶 */}
        {[0, 2, 4].map((y, i) => (
          <mesh key={i} position={[0, 1 + y, 2.4]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 8]} />
            <meshLambertMaterial color="#87CEEB" />
          </mesh>
        ))}
      </group>

      {/* 音樂廣場涼亭 */}
      <group position={[0, 0, 25]}>
        {/* 平台 */}
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[5, 5, 0.4, 16]} />
          <meshLambertMaterial color="#DEB887" />
        </mesh>
        
        {/* 支柱 */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i / 6) * Math.PI * 2
          const x = Math.cos(angle) * 4
          const z = Math.sin(angle) * 4
          return (
            <mesh key={i} position={[x, 1.5, z]} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 3, 8]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          )
        })}
        
        {/* 圓頂 */}
        <mesh position={[0, 3.5, 0]} castShadow>
          <sphereGeometry args={[5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#FFE4B5" />
        </mesh>
        
        {/* 頂部裝飾 */}
        <mesh position={[0, 5.5, 0]} castShadow>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshLambertMaterial color="#FFD700" />
        </mesh>
        
        {/* 座椅 */}
        {Array.from({ length: 4 }, (_, i) => {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
          const x = Math.cos(angle) * 3
          const z = Math.sin(angle) * 3
          return (
            <mesh key={i} position={[x, 0.2, z]} castShadow>
              <boxGeometry args={[1, 0.4, 1]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}