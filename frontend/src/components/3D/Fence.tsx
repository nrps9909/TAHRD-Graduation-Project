import * as THREE from 'three'

interface FenceProps {
  start: [number, number, number]
  end: [number, number, number]
  height?: number
  color?: string
}

export const Fence = ({ start, end, height = 0.8, color = '#8B6969' }: FenceProps) => {
  // 計算柵欄的長度和方向
  const startVec = new THREE.Vector3(...start)
  const endVec = new THREE.Vector3(...end)
  const direction = new THREE.Vector3().subVectors(endVec, startVec)
  const length = direction.length()
  const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)
  
  // 計算旋轉角度
  const angle = Math.atan2(direction.z, direction.x)
  
  // 計算需要多少個柵欄段
  const segmentWidth = 1.2
  const numSegments = Math.floor(length / segmentWidth)
  
  return (
    <group position={[midpoint.x, midpoint.y, midpoint.z]} rotation={[0, -angle, 0]}>
      {Array.from({ length: numSegments }, (_, i) => {
        const offset = (i - (numSegments - 1) / 2) * segmentWidth
        return (
          <group key={i} position={[offset, 0, 0]}>
            {/* 垂直木板 */}
            <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
              <boxGeometry args={[0.1, height, 0.15]} />
              <meshLambertMaterial color={color} />
            </mesh>
            
            {/* 頂部裝飾 */}
            <mesh castShadow position={[0, height, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshLambertMaterial color={color} />
            </mesh>
            
            {/* 橫向連接板（每隔一個） */}
            {i % 2 === 0 && i < numSegments - 1 && (
              <mesh castShadow position={[segmentWidth / 2, height * 0.6, 0]}>
                <boxGeometry args={[segmentWidth, 0.08, 0.1]} />
                <meshLambertMaterial color={color} />
              </mesh>
            )}
          </group>
        )
      })}
      
      {/* 柵欄陰影 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[length, 0.3]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}