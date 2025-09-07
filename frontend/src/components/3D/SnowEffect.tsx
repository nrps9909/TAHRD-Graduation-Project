import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 雪花粒子數據接口
interface Snowflake {
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  rotationSpeed: number
  swaySpeed: number
  swayAmount: number
  originalX: number
  originalZ: number
  fallTime: number
}

// 可愛的雪花效果組件
export const SnowEffect = () => {
  const { weather } = useTimeStore()
  const snowInstanceRef = useRef<THREE.InstancedMesh>(null)
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])
  
  // 雪花參數
  const SNOWFLAKE_COUNT = 80 // 少量自然的雪花數量
  const AREA_SIZE = 400 // 飄雪區域大小
  const FALL_HEIGHT = 200 // 開始飄落的高度
  const GROUND_HEIGHT = -5 // 地面高度
  
  // 創建雪花粒子系統
  const snowGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), [])
  const snowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.9,
  }), [])
  
  // 初始化雪花粒子
  useEffect(() => {
    const newSnowflakes: Snowflake[] = []
    
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      const size = 0.6 + Math.random() * 1.0 // 0.6-1.6 更小更自然的大小
      const x = (Math.random() - 0.5) * AREA_SIZE
      const y = FALL_HEIGHT + Math.random() * 50
      const z = (Math.random() - 0.5) * AREA_SIZE
      
      newSnowflakes.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, -(3.0 + Math.random() * 2.0), 0), // 最快飄落速度 (-3.0 到 -5.0)
        size: size,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        swaySpeed: 0.3 + Math.random() * 0.7, // 減少搖擺頻率
        swayAmount: 1.0 + Math.random() * 2.0, // 搖擺幅度
        originalX: x,
        originalZ: z,
        fallTime: Math.random() * 1000 // 隨機初始時間偏移
      })
    }
    
    setSnowflakes(newSnowflakes)
  }, [])
  
  // 更新雪花位置和動畫
  useFrame((state) => {
    if (!snowInstanceRef.current || weather !== 'snow') return
    
    const time = state.clock.elapsedTime
    const tempMatrix = new THREE.Matrix4()
    const tempPosition = new THREE.Vector3()
    const tempScale = new THREE.Vector3()
    const tempQuaternion = new THREE.Quaternion()
    
    snowflakes.forEach((snowflake, i) => {
      // 使用更大的時間步長，讓雪花飄落更快
      const snowDeltaTime = 1/15 // 相當於15fps的時間步，讓雪花移動更快
      
      // 更新飄落時間
      snowflake.fallTime += snowDeltaTime
      
      // 左右搖擺效果
      const swayOffset = Math.sin(time * snowflake.swaySpeed + i * 0.1) * snowflake.swayAmount
      snowflake.position.x = snowflake.originalX + swayOffset
      
      // 垂直飄落 - 使用更大的時間步和速度倍數讓雪花快速飄落
      const speedMultiplier = 2.0 // 額外的速度倍數
      snowflake.position.y += snowflake.velocity.y * snowDeltaTime * speedMultiplier
      
      // 深度搖擺 - 基於原始Z位置
      const depthSway = Math.sin(time * snowflake.swaySpeed * 0.5 + i * 0.2) * 0.8
      snowflake.position.z = snowflake.originalZ + depthSway
      
      // 重置到頂部當雪花落到地面
      if (snowflake.position.y < GROUND_HEIGHT) {
        snowflake.position.y = FALL_HEIGHT + Math.random() * 30
        const newX = (Math.random() - 0.5) * AREA_SIZE
        const newZ = (Math.random() - 0.5) * AREA_SIZE
        snowflake.originalX = newX
        snowflake.originalZ = newZ
        snowflake.position.x = newX
        snowflake.position.z = newZ
        snowflake.fallTime = 0
      }
      
      // 設置實例矩陣
      tempPosition.copy(snowflake.position)
      tempScale.setScalar(snowflake.size)
      tempQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), 
        time * snowflake.rotationSpeed + i * 0.1
      )
      
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      snowInstanceRef.current.setMatrixAt(i, tempMatrix)
    })
    
    snowInstanceRef.current.instanceMatrix.needsUpdate = true
  })
  
  // 只在下雪天顯示
  if (weather !== 'snow') {
    return null
  }
  
  return (
    <instancedMesh
      ref={snowInstanceRef}
      args={[snowGeometry, snowMaterial, SNOWFLAKE_COUNT]}
      frustumCulled={false}
    />
  )
}

// 地面積雪效果組件
export const SnowAccumulation = () => {
  const { weather } = useTimeStore()
  const accumulationRef = useRef<THREE.InstancedMesh>(null)
  const [snowPiles, setSnowPiles] = useState<THREE.Vector3[]>([])
  const [accumulationLevel, setAccumulationLevel] = useState(0)
  
  // 積雪參數
  const ACCUMULATION_POINTS = 60 // 少量自然的積雪點
  const AREA_SIZE = 300
  
  // 積雪幾何和材質
  const pileGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 6, 4), [])
  const pileMaterial = useMemo(() => new THREE.MeshLambertMaterial({
    color: '#F0F8FF', // 淡藍白色
    transparent: true,
    opacity: 0.8,
  }), [])
  
  // 初始化積雪點
  useEffect(() => {
    const newPiles: THREE.Vector3[] = []
    
    for (let i = 0; i < ACCUMULATION_POINTS; i++) {
      const x = (Math.random() - 0.5) * AREA_SIZE
      const z = (Math.random() - 0.5) * AREA_SIZE
      const y = -4 + Math.random() * 0.5 // 略高於地面
      
      newPiles.push(new THREE.Vector3(x, y, z))
    }
    
    setSnowPiles(newPiles)
  }, [])
  
  // 積雪累積邏輯
  useFrame(() => {
    if (!accumulationRef.current) return
    
    if (weather === 'snow') {
      // 下雪時積雪慢慢增加
      setAccumulationLevel(prev => Math.min(prev + 0.001, 1))
    } else {
      // 不下雪時積雪慢慢融化
      setAccumulationLevel(prev => Math.max(prev - 0.0005, 0))
    }
    
    // 更新積雪顯示
    const tempMatrix = new THREE.Matrix4()
    const tempScale = new THREE.Vector3()
    
    snowPiles.forEach((pile, i) => {
      const scale = accumulationLevel * (0.5 + Math.random() * 0.5)
      tempScale.setScalar(scale)
      
      tempMatrix.compose(
        pile,
        new THREE.Quaternion(),
        tempScale
      )
      
      accumulationRef.current.setMatrixAt(i, tempMatrix)
    })
    
    accumulationRef.current.instanceMatrix.needsUpdate = true
    accumulationRef.current.visible = accumulationLevel > 0.01
  })
  
  return (
    <instancedMesh
      ref={accumulationRef}
      args={[pileGeometry, pileMaterial, ACCUMULATION_POINTS]}
      receiveShadow
      frustumCulled={false}
    />
  )
}