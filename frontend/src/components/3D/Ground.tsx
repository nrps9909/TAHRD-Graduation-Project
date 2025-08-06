import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { collisionSystem } from '@/utils/collision'
import { Tree } from './Tree'
import { Flower } from './Flower'
import { Fence } from './Fence'

export const Ground = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const waterRef = useRef<THREE.Mesh>(null)

  // 初始化碰撞系統
  useEffect(() => {
    // 清除舊的碰撞物體
    collisionSystem.clear()
    
    // 添加建築物碰撞
    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(10, 0, 15),
      radius: 3,
      type: 'building',
      id: 'cafe'
    })
    
    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(-20, 0, -10),
      radius: 4,
      type: 'building',
      id: 'library'
    })
    
    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(0, 0, -25),
      radius: 4,
      type: 'building',
      id: 'lighthouse'
    })
    
    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(30, 0, 0),
      radius: 3.5,
      type: 'building',
      id: 'garden-house'
    })
    
    // 添加湖泊碰撞
    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(0, 0, 30),
      radius: 10,
      type: 'water',
      id: 'lake'
    })
    
    // 添加樹木碰撞
    const trees = [
      { x: 15, z: -10 }, { x: -15, z: 5 }, { x: 25, z: 10 },
      { x: -30, z: -20 }, { x: 35, z: -15 }, { x: -10, z: 25 },
      { x: 20, z: -20 }, { x: -25, z: 15 }, { x: 10, z: 35 },
      { x: -35, z: 0 }, { x: 40, z: 5 }, { x: -5, z: -30 }
    ]
    
    trees.forEach((tree, index) => {
      collisionSystem.addCollisionObject({
        position: new THREE.Vector3(tree.x, 0, tree.z),
        radius: 1,
        type: 'tree',
        id: `tree-${index}`
      })
    })
    
    return () => {
      collisionSystem.clear()
    }
  }, [])

  // 讓湖水輕輕波動
  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = 0.02 + Math.sin(state.clock.elapsedTime * 0.5) * 0.03
    }
  })

  // 樹木配置 - 使用 useMemo 確保穩定性
  const trees = useMemo(() => [
    { position: [15, 0, -10], variant: 'normal', scale: 1 },
    { position: [-15, 0, 5], variant: 'fruit', scale: 1.2 },
    { position: [25, 0, 10], variant: 'cherry', scale: 0.9 },
    { position: [-30, 0, -20], variant: 'pine', scale: 1.3 },
    { position: [35, 0, -15], variant: 'normal', scale: 1.1 },
    { position: [-10, 0, 25], variant: 'fruit', scale: 1 },
    { position: [20, 0, -20], variant: 'cherry', scale: 1.2 },
    { position: [-25, 0, 15], variant: 'pine', scale: 1 },
    { position: [10, 0, 35], variant: 'normal', scale: 0.8 },
    { position: [-35, 0, 0], variant: 'fruit', scale: 1.1 },
    { position: [40, 0, 5], variant: 'cherry', scale: 1 },
    { position: [-5, 0, -30], variant: 'pine', scale: 1.2 }
  ], [])

  // 花朵配置 - 使用 useMemo 固定隨機 scale
  const flowers = useMemo(() => [
    { position: [5, 0, 8], variant: 'rose', color: '#FF69B4', scale: 0.8 + Math.random() * 0.4 },
    { position: [-8, 0, 3], variant: 'tulip', color: '#FF1493', scale: 0.8 + Math.random() * 0.4 },
    { position: [12, 0, -5], variant: 'sunflower', scale: 0.8 + Math.random() * 0.4 },
    { position: [-3, 0, 12], variant: 'daisy', scale: 0.8 + Math.random() * 0.4 },
    { position: [18, 0, 6], variant: 'rose', color: '#FFB6C1', scale: 0.8 + Math.random() * 0.4 },
    { position: [-12, 0, -8], variant: 'tulip', color: '#FF6347', scale: 0.8 + Math.random() * 0.4 },
    { position: [8, 0, -12], variant: 'daisy', scale: 0.8 + Math.random() * 0.4 },
    { position: [-18, 0, 10], variant: 'sunflower', scale: 0.8 + Math.random() * 0.4 },
    { position: [22, 0, -3], variant: 'rose', color: '#FF1493', scale: 0.8 + Math.random() * 0.4 },
    { position: [-6, 0, 18], variant: 'tulip', color: '#FFB6C1', scale: 0.8 + Math.random() * 0.4 }
  ], [])
  
  // 使用 useMemo 固定蘑菇位置
  const mushrooms = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2
      const radius = 15 + Math.random() * 25
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      return { id: i, position: [x, 0, z] }
    })
  }, [])
  
  // 使用 useMemo 固定草叢位置
  const grassPatches = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2
      const radius = 5 + Math.random() * 45
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const hue = 120
      const saturation = 40 + Math.random() * 20
      const lightness = 40 + Math.random() * 20
      return { 
        id: i, 
        position: [x, 0.1, z],
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`
      }
    })
  }, [])
  
  // 使用 useMemo 固定湖邊石頭位置
  const lakeStones = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2
      const radius = 11 + Math.random() * 2
      const x = Math.cos(angle) * radius
      const z = 30 + Math.sin(angle) * radius
      const scale = 0.3 + Math.random() * 0.3
      return { id: i, position: [x, scale * 0.3, z], scale }
    })
  }, [])
  
  // 使用 useMemo 固定小石子位置
  const pebbles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const angle = (i / 15) * Math.PI * 2
      const radius = 20 + Math.random() * 30
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const rotation = [Math.random() * Math.PI, Math.random() * Math.PI, 0]
      const scale = 0.3 + Math.random() * 0.4
      const color = `hsl(30, 20%, ${40 + Math.random() * 20}%)`
      return { id: i, position: [x, 0.05, z], rotation, scale, color }
    })
  }, [])
  
  // 使用 useMemo 固定葉片位置
  const leaves = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      const rotation = Math.random() * Math.PI * 2
      const scale = 0.5 + Math.random() * 0.5
      const color = `hsl(${80 + Math.random() * 40}, 60%, ${30 + Math.random() * 20}%)`
      return { id: i, position: [x, 0.02, z], rotation, scale, color }
    })
  }, [])

  return (
    <>
      {/* 主島嶼地面 - 增強草地材質 */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[100, 128]} />
        <meshStandardMaterial 
          color="#7ec850"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* 草地紋理層 - 使用程序化紋理 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[120, 120, 64, 64]} />
        <meshStandardMaterial 
          color="#6ab540"
          transparent
          opacity={0.4}
          roughness={1}
          metalness={0}
        />
      </mesh>
      
      {/* 草地紋理變化 - 更自然的色彩 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, -0.09, -10]} receiveShadow>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial 
          color="#8fbc8f"
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, -0.09, 15]} receiveShadow>
        <circleGeometry args={[20, 64]} />
        <meshStandardMaterial 
          color="#90ee90"
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.09, 5]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial 
          color="#7cfc00"
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      
      {/* 沙灘邊緣 - 更細緻的沙地 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <ringGeometry args={[55, 60, 128]} />
        <meshStandardMaterial 
          color="#f4e4c1"
          roughness={1}
          metalness={0}
        />
      </mesh>
      
      {/* 沙灘細節層 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <ringGeometry args={[56, 59, 64]} />
        <meshStandardMaterial 
          color="#faebd7"
          transparent
          opacity={0.5}
          roughness={1}
        />
      </mesh>
      
      {/* 石板路徑 */}
      <group>
        {/* 中央廣場 - 石磚材質 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[8, 64]} />
          <meshStandardMaterial 
            color="#deb887"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        
        {/* 廣場裝飾環 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]} receiveShadow>
          <ringGeometry args={[7.5, 8, 64]} />
          <meshStandardMaterial 
            color="#d2b48c"
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>
        
        {/* 石板小徑 */}
        {Array.from({ length: 10 }, (_, i) => (
          <mesh 
            key={`path-stone-${i}`}
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0.01, 9 + i * 2]} 
            receiveShadow
          >
            <circleGeometry args={[1, 16]} />
            <meshLambertMaterial color="#D2B48C" />
          </mesh>
        ))}
        
        {/* 到咖啡館的路 */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh 
            key={`cafe-stone-${i}`}
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[1.5 + i * 1.2, 0.01, 2 + i * 1.5]} 
            receiveShadow
          >
            <circleGeometry args={[0.8, 16]} />
            <meshLambertMaterial color="#DEB887" />
          </mesh>
        ))}
        
        {/* 到圖書館的路 */}
        {Array.from({ length: 10 }, (_, i) => (
          <mesh 
            key={`library-stone-${i}`}
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[-2 - i * 1.8, 0.01, -1 - i * 0.9]} 
            receiveShadow
          >
            <circleGeometry args={[0.8, 16]} />
            <meshLambertMaterial color="#D2B48C" />
          </mesh>
        ))}
      </group>
      
      {/* 湖泊 - 更真實的水面 */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 30]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial 
          color="#4682b4"
          transparent 
          opacity={0.85}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      
      {/* 水面反光層 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 30]} receiveShadow>
        <circleGeometry args={[9.8, 32]} />
        <meshStandardMaterial 
          color="#87ceeb"
          transparent 
          opacity={0.3}
          roughness={0}
          metalness={1}
        />
      </mesh>
      
      {/* 湖泊邊緣裝飾 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 30]} receiveShadow>
        <ringGeometry args={[9, 11, 32]} />
        <meshLambertMaterial color="#8FBC8F" />
      </mesh>
      
      {/* 湖邊小石頭 */}
      {lakeStones.map((stone) => (
        <mesh 
          key={`lake-stone-${stone.id}`} 
          position={stone.position as [number, number, number]} 
          castShadow 
          receiveShadow
        >
          <sphereGeometry args={[stone.scale, 8, 6]} />
          <meshLambertMaterial color="#A9A9A9" />
        </mesh>
      ))}
      
      {/* 樹木 */}
      {trees.map((tree, index) => (
        <Tree 
          key={`tree-${index}`}
          position={tree.position as [number, number, number]}
          variant={tree.variant as 'normal' | 'fruit' | 'pine' | 'cherry'}
          scale={tree.scale}
        />
      ))}
      
      {/* 花朵 */}
      {flowers.map((flower, index) => (
        <Flower 
          key={`flower-${index}`}
          position={flower.position as [number, number, number]}
          variant={flower.variant as 'rose' | 'tulip' | 'sunflower' | 'daisy'}
          color={flower.color}
          scale={flower.scale}
        />
      ))}
      
      {/* 圍欄 */}
      <Fence start={[20, 0, -5]} end={[20, 0, 5]} />
      <Fence start={[20, 0, 5]} end={[25, 0, 10]} />
      <Fence start={[-10, 0, -15]} end={[-10, 0, -25]} />
      <Fence start={[-10, 0, -25]} end={[-20, 0, -25]} />
      
      {/* 裝飾性的蘑菇 */}
      {mushrooms.map((mushroom) => (
        <group key={`mushroom-${mushroom.id}`} position={mushroom.position as [number, number, number]}>
          <mesh castShadow position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 0.3, 8]} />
            <meshLambertMaterial color="#F5DEB3" />
          </mesh>
          <mesh castShadow position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshLambertMaterial color="#DC143C" />
          </mesh>
          {/* 蘑菇點點 */}
          <mesh position={[0.1, 0.4, 0.1]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[-0.08, 0.42, -0.08]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
      
      {/* 小草叢 - 更豐富的草地細節 */}
      {grassPatches.map((grass) => (
        <group key={`grass-${grass.id}`} position={grass.position as [number, number, number]}>
          <mesh receiveShadow>
            <coneGeometry args={[0.15, 0.4, 6]} />
            <meshStandardMaterial 
              color={grass.color}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
          {/* 額外的草葉 */}
          <mesh position={[0.1, 0, 0.1]} receiveShadow>
            <coneGeometry args={[0.1, 0.3, 4]} />
            <meshStandardMaterial 
              color={grass.color}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}
      
      {/* 額外的地面裝飾 - 小石子 */}
      {pebbles.map((pebble) => (
        <mesh 
          key={`pebble-${pebble.id}`}
          position={pebble.position as [number, number, number]}
          rotation={pebble.rotation as [number, number, number]}
          scale={pebble.scale}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.5]} />
          <meshStandardMaterial 
            color={pebble.color}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
      
      {/* 裝飾性葉片 */}
      {leaves.map((leaf) => (
        <mesh
          key={`leaf-${leaf.id}`}
          position={leaf.position as [number, number, number]}
          rotation={[-Math.PI / 2, 0, leaf.rotation]}
          scale={leaf.scale}
          receiveShadow
        >
          <planeGeometry args={[0.5, 0.8]} />
          <meshStandardMaterial 
            color={leaf.color}
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
            roughness={0.8}
          />
        </mesh>
      ))}
    </>
  )
}