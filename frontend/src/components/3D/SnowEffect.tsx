import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'
import { collisionSystem } from '@/utils/collision'

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
  isLanded: boolean
  landedTime: number
  landedSurface?: number
  isDissolving: boolean
  dissolveStartTime: number
  dissolveOpacity: number
  showHexEffect: boolean
  hexEffectStartTime: number
  hexTriggerTime: number // 触发六边形特效的时间阈值
}

// 六边形特效数据接口
interface HexagonEffect {
  position: THREE.Vector3
  startTime: number
  rotationSpeed: number
  scale: number
  opacity: number
  isActive: boolean
}


// 可愛的雪花效果組件
export const SnowEffect = () => {
  const { weather } = useTimeStore()
  const snowInstanceRef = useRef<THREE.InstancedMesh>(null)
  const hexInstanceRef = useRef<THREE.InstancedMesh>(null)
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])
  const [hexEffects, setHexEffects] = useState<HexagonEffect[]>([])
  
  // 雪花參數
  const SNOWFLAKE_COUNT = 80 // 少量自然的雪花數量
  const HEX_EFFECT_COUNT = 20 // 六边形特效数量
  const AREA_SIZE = 400 // 飄雪區域大小
  const FALL_HEIGHT = 120 // 開始飄落的高度 (从200降低到120)
  const GROUND_HEIGHT = -5 // 地面高度
  
  // 創建雪花粒子系統
  const snowGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), [])
  
  // 创建六边形几何体
  const hexGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const radius = 1
    // 绘制六边形
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    }
    return new THREE.ShapeGeometry(shape)
  }, [])
  
  // 太陽雪特效材質 - 能夠反射金光的雪花
  const snowMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.9,
    metalness: 0.1, // 輕微的金屬反射
    roughness: 0.3, // 適度的粗糙度讓光線散射
    emissive: '#000000', // 預設無自發光
    emissiveIntensity: 0,
  }), [])
  
  // 六边形特效材质 - 金色光芒冰晶效果
  const hexMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F0F8FF', // 纯白基色
    transparent: true,
    opacity: 0.9,
    metalness: 0.6, // 增加金属感
    roughness: 0.05, // 极光滑，强反射
    emissive: '#FFD700', // 金色发光
    emissiveIntensity: 0.5, // 基础发光强度
    side: THREE.DoubleSide, // 双面材质
  }), [])
  
  // 初始化雪花粒子
  useEffect(() => {
    const newSnowflakes: Snowflake[] = []
    
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      const size = 0.6 + Math.random() * 1.0 // 0.6-1.6 更小更自然的大小
      const x = (Math.random() - 0.5) * AREA_SIZE
      const y = FALL_HEIGHT + Math.random() * 30 // 减少随机高度范围 (从50降到30)
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
        fallTime: Math.random() * 1000, // 隨機初始時間偏移
        isLanded: false,
        landedTime: 0,
        isDissolving: false,
        dissolveStartTime: 0,
        dissolveOpacity: 1.0,
        showHexEffect: false,
        hexEffectStartTime: 0,
        hexTriggerTime: 5 + Math.random() * 3 // 5-8秒后触发，让雪花飞得更低
      })
    }
    
    setSnowflakes(newSnowflakes)
    
    // 初始化六边形特效池
    const newHexEffects: HexagonEffect[] = []
    for (let i = 0; i < HEX_EFFECT_COUNT; i++) {
      newHexEffects.push({
        position: new THREE.Vector3(0, 0, 0),
        startTime: 0,
        rotationSpeed: 2 + Math.random() * 3, // 2-5 的旋转速度
        scale: 0,
        opacity: 0,
        isActive: false
      })
    }
    setHexEffects(newHexEffects)
  }, [])
  
  // 触发六边形特效的函数
  const triggerHexEffect = (position: THREE.Vector3, time: number) => {
    setHexEffects(prev => {
      const updatedEffects = [...prev]
      // 找到第一个非活跃的特效
      const inactiveIndex = updatedEffects.findIndex(effect => !effect.isActive)
      
      if (inactiveIndex !== -1) {
        updatedEffects[inactiveIndex] = {
          position: position.clone(),
          startTime: time,
          rotationSpeed: 3 + Math.random() * 4, // 随机旋转速度
          scale: 2 + Math.random() * 1, // 随机大小
          opacity: 1,
          isActive: true
        }
        console.log(`❄️ 触发六边形特效 at [${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}]`)
      }
      
      return updatedEffects
    })
  }
  
  // 更新雪花位置和動畫
  useFrame((state) => {
    if (!snowInstanceRef.current || weather !== 'snow') return
    
    const time = state.clock.elapsedTime
    const tempMatrix = new THREE.Matrix4()
    const tempPosition = new THREE.Vector3()
    const tempScale = new THREE.Vector3()
    const tempQuaternion = new THREE.Quaternion()
    
    // 太陽雪特效 - 讓部分雪花閃爍金光
    const sparkleIntensity = Math.sin(time * 3.0) * 0.5 + 0.5 // 0-1 閃爍
    const goldEmission = new THREE.Color('#FFD700').multiplyScalar(sparkleIntensity * 0.3)
    
    snowflakes.forEach((snowflake, i) => {
      // 使用更大的時間步長，讓雪花飄落更快
      const snowDeltaTime = 1/15 // 相當於15fps的時間步，讓雪花移動更快
      
      // 更新飄落時間
      snowflake.fallTime += snowDeltaTime
      
      // 左右搖擺效果
      const swayOffset = Math.sin(time * snowflake.swaySpeed + i * 0.1) * snowflake.swayAmount
      snowflake.position.x = snowflake.originalX + swayOffset
      
      // 深度搖擺 - 基於原始Z位置
      const depthSway = Math.sin(time * snowflake.swaySpeed * 0.5 + i * 0.2) * 0.8
      snowflake.position.z = snowflake.originalZ + depthSway
      
      // 雪花状态管理 - 半空中触发六边形特效
      if (!snowflake.isDissolving) {
        // 垂直飄落 - 溫和的雪花飄落
        const speedMultiplier = 1.0
        const newY = snowflake.position.y + snowflake.velocity.y * snowDeltaTime * speedMultiplier
        
        // 检查是否到达触发六边形特效的时间（基于下落时间）
        const currentFallTime = snowflake.fallTime * snowDeltaTime
        if (currentFallTime >= snowflake.hexTriggerTime && !snowflake.showHexEffect) {
          snowflake.showHexEffect = true
          snowflake.hexEffectStartTime = time
          // 在雪花当前位置生成六边形特效
          triggerHexEffect(new THREE.Vector3(snowflake.position.x, newY, snowflake.position.z), time)
          // 同时开始消失动画
          snowflake.isDissolving = true
          snowflake.dissolveStartTime = time
          console.log(`❄️ 雪花在半空中触发六边形特效并开始消失 (高度: ${newY.toFixed(1)})`)
        }
        
        // 如果还没触发特效，继续正常下落
        if (!snowflake.isDissolving) {
          snowflake.position.y = newY
          snowflake.fallTime += 1 // 增加下落时间计数器
          
          // 安全网：如果落到地面还没触发特效，强制触发
          if (snowflake.position.y < GROUND_HEIGHT) {
            if (!snowflake.showHexEffect) {
              triggerHexEffect(new THREE.Vector3(snowflake.position.x, GROUND_HEIGHT + 2, snowflake.position.z), time)
            }
            snowflake.isDissolving = true
            snowflake.dissolveStartTime = time
            console.log(`❄️ 雪花到达地面，强制触发六边形特效`)
          }
        }
      } else if (snowflake.isDissolving) {
        // 处理消失动画
        const dissolveDuration = time - snowflake.dissolveStartTime
        const dissolveTime = 1.5 // 1.5秒消失动画
        
        if (dissolveDuration < dissolveTime) {
          // 消失过程：轻微上升 + 快速缩小直到消失
          const progress = dissolveDuration / dissolveTime
          snowflake.dissolveOpacity = 1 - progress
          
          // 向上飘散效果 + 左右飘动
          snowflake.position.y += 1.0 * snowDeltaTime
          snowflake.position.x += Math.sin(time * 2 + i) * 0.02
          
          // 快速缩小到消失
          const shrinkFactor = Math.max(0, 1 - progress * 1.2) // 更快速的缩小
          tempScale.setScalar(snowflake.size * shrinkFactor)
        } else {
          // 消失动画完成，重新生成雪花
          snowflake.position.y = FALL_HEIGHT + Math.random() * 20 // 减少重置高度的随机范围
          const newX = (Math.random() - 0.5) * AREA_SIZE
          const newZ = (Math.random() - 0.5) * AREA_SIZE
          snowflake.originalX = newX
          snowflake.originalZ = newZ
          snowflake.position.x = newX
          snowflake.position.z = newZ
          snowflake.fallTime = 0
          snowflake.isLanded = false
          snowflake.landedTime = 0
          snowflake.landedSurface = undefined
          snowflake.isDissolving = false
          snowflake.dissolveStartTime = 0
          snowflake.dissolveOpacity = 1.0
          snowflake.showHexEffect = false
          snowflake.hexEffectStartTime = 0
          snowflake.hexTriggerTime = 5 + Math.random() * 3 // 重新随机设置触发时间，让雪花飞得更低
        }
      }
      
      // 設置實例矩陣
      tempPosition.copy(snowflake.position)
      
      // 根据雪花状态设置缩放
      if (snowflake.isDissolving) {
        // 消失状态下的缩放已在上面设置
        // tempScale 已被设置为缩小效果
      } else {
        // 正常状态下的缩放
        tempScale.setScalar(snowflake.size)
      }
      
      tempQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), 
        time * snowflake.rotationSpeed + i * 0.1
      )
      
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      snowInstanceRef.current.setMatrixAt(i, tempMatrix)
    })
    
    snowInstanceRef.current.instanceMatrix.needsUpdate = true
    
    // 更新雪花材質的金色閃爍效果
    if (snowInstanceRef.current.material instanceof THREE.MeshStandardMaterial) {
      // 隨機讓一些雪花閃爍金光
      const shouldSparkle = Math.sin(time * 2.0) > 0.3 // 70%的時間有閃爍
      if (shouldSparkle) {
        snowInstanceRef.current.material.emissive.copy(goldEmission)
        snowInstanceRef.current.material.emissiveIntensity = sparkleIntensity * 0.4
      } else {
        snowInstanceRef.current.material.emissive.setHex(0x000000)
        snowInstanceRef.current.material.emissiveIntensity = 0
      }
      snowInstanceRef.current.material.needsUpdate = true
    }
    
    // 更新六边形特效
    if (hexInstanceRef.current && hexEffects.length > 0) {
      const hexTempMatrix = new THREE.Matrix4()
      const hexTempPosition = new THREE.Vector3()
      const hexTempScale = new THREE.Vector3()
      const hexTempQuaternion = new THREE.Quaternion()
      
      hexEffects.forEach((hexEffect, i) => {
        if (!hexEffect.isActive) {
          // 非活跃特效缩放为0
          hexTempScale.setScalar(0)
          hexTempMatrix.compose(
            new THREE.Vector3(0, -1000, 0), // 移到看不见的地方
            hexTempQuaternion,
            hexTempScale
          )
        } else {
          const hexDuration = time - hexEffect.startTime
          const hexLifetime = 1.2 // 六边形特效生存时间
          
          if (hexDuration < hexLifetime) {
            // 特效动画过程
            const progress = hexDuration / hexLifetime
            
            // 先放大后缩小的效果
            let scale
            if (progress < 0.3) {
              // 前30%时间快速放大
              scale = (progress / 0.3) * hexEffect.scale
            } else {
              // 后70%时间缓慢缩小并消失
              scale = hexEffect.scale * (1 - (progress - 0.3) / 0.7)
            }
            
            // 透明度渐变
            const opacity = 1 - progress
            
            // 旋转效果
            const rotation = time * hexEffect.rotationSpeed
            
            hexTempPosition.copy(hexEffect.position)
            hexTempScale.setScalar(scale)
            hexTempQuaternion.setFromAxisAngle(
              new THREE.Vector3(0, 0, 1), // 绕Z轴旋转，让六边形在XY平面旋转
              rotation
            )
            
            hexTempMatrix.compose(hexTempPosition, hexTempQuaternion, hexTempScale)
            
            // 更新材质透明度
            if (hexInstanceRef.current.material instanceof THREE.MeshStandardMaterial) {
              hexInstanceRef.current.material.opacity = Math.max(0.2, opacity * 0.9)
            }
          } else {
            // 特效结束，标记为非活跃
            hexEffect.isActive = false
            scale = 0
            hexTempScale.setScalar(0)
            hexTempMatrix.compose(
              new THREE.Vector3(0, -1000, 0),
              hexTempQuaternion,
              hexTempScale
            )
          }
        }
        
        hexInstanceRef.current.setMatrixAt(i, hexTempMatrix)
      })
      
      hexInstanceRef.current.instanceMatrix.needsUpdate = true
      
      // 全局金色光芒效果 - 根据活跃特效数量动态调整
      if (hexInstanceRef.current.material instanceof THREE.MeshStandardMaterial) {
        const activeEffects = hexEffects.filter(effect => effect.isActive)
        
        if (activeEffects.length > 0) {
          // 计算所有活跃特效的平均光芒强度
          let totalIntensity = 0
          let bloomingCount = 0 // 正在绽放的特效数量
          
          activeEffects.forEach(effect => {
            const duration = time - effect.startTime
            const progress = duration / 1.2 // 1.2秒生命周期
            
            let glowIntensity = 0
            if (progress < 0.15) {
              // 前15%时间：爆发式金色光芒
              glowIntensity = (progress / 0.15) * 3.0 // 强烈爆发
              bloomingCount++
            } else if (progress < 0.4) {
              // 15%-40%时间：维持强光芒
              glowIntensity = 3.0 - ((progress - 0.15) / 0.25) * 2.0 // 从3.0降到1.0
            } else if (progress < 1.0) {
              // 后60%时间：逐渐减弱
              glowIntensity = 1.0 * (1 - (progress - 0.4) / 0.6)
            }
            
            totalIntensity += glowIntensity
          })
          
          // 设置材质发光强度
          const avgIntensity = totalIntensity / Math.max(activeEffects.length, 1)
          
          // 绽放瞬间的脉动效果
          let finalIntensity = avgIntensity
          if (bloomingCount > 0) {
            const pulse = Math.sin(time * 20) * 0.4 + 1 // 快速脉动
            finalIntensity *= pulse
          }
          
          hexInstanceRef.current.material.emissiveIntensity = Math.min(finalIntensity, 4.0) // 限制最大强度
          
          // 确保发光颜色是金色
          hexInstanceRef.current.material.emissive.setHex(0xFFD700)
        } else {
          // 没有活跃特效时，降低发光强度
          hexInstanceRef.current.material.emissiveIntensity = 0.1
        }
        
        hexInstanceRef.current.material.needsUpdate = true
      }
    }
  })
  
  // 只在下雪天顯示
  if (weather !== 'snow') {
    return null
  }
  
  return (
    <group>
      {/* 雪花粒子 */}
      <instancedMesh
        ref={snowInstanceRef}
        args={[snowGeometry, snowMaterial, SNOWFLAKE_COUNT]}
        frustumCulled={false}
      />
      
      {/* 六边形特效 */}
      <instancedMesh
        ref={hexInstanceRef}
        args={[hexGeometry, hexMaterial, HEX_EFFECT_COUNT]}
        frustumCulled={false}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  )
}

// 简单的地面积雪組件
export const SnowAccumulation = () => {
  const { weather } = useTimeStore()
  const accumulationRef = useRef<THREE.InstancedMesh>(null)
  const [snowPiles, setSnowPiles] = useState<THREE.Vector3[]>([])
  
  // 简化的積雪參數
  const ACCUMULATION_POINTS = 60 // 增加一些积雪点让效果更明显
  const AREA_SIZE = 200 // 缩小范围让积雪更集中
  
  // 更大更明显的积雪几何体和材质
  const pileGeometry = useMemo(() => new THREE.SphereGeometry(1.2, 8, 6), []) // 增大积雪
  const pileMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF', // 纯白色更明显
    transparent: true,
    opacity: 0.9, // 增加不透明度
    metalness: 0.1,
    roughness: 0.3,
    emissive: '#000000',
    emissiveIntensity: 0,
  }), [])
  
  // 初始化简单的地面积雪 - 使用碰撞系统获取真实地面高度
  useEffect(() => {
    const newPiles: THREE.Vector3[] = []
    
    // 延迟生成积雪，等待地形加载完成
    const generateSnow = () => {
      for (let i = 0; i < ACCUMULATION_POINTS; i++) {
        const x = (Math.random() - 0.5) * AREA_SIZE
        const z = (Math.random() - 0.5) * AREA_SIZE
        
        // 使用碰撞系统获取真实的地面高度
        const testPosition = new THREE.Vector3(x, 0, z)
        const groundHeight = collisionSystem.getGroundHeight(testPosition)
        
        // 如果没有找到地形高度，使用默认值
        const actualGroundHeight = groundHeight > -10 ? groundHeight : 5
        const y = actualGroundHeight + 0.3 + Math.random() * 0.2 // 在地面上方0.3-0.5
        
        newPiles.push(new THREE.Vector3(x, y, z))
      }
      
      setSnowPiles(newPiles)
      console.log(`❄️ 已生成 ${newPiles.length} 个地面积雪点，高度范围: ${Math.min(...newPiles.map(p => p.y)).toFixed(1)} - ${Math.max(...newPiles.map(p => p.y)).toFixed(1)}`)
    }
    
    // 延迟2秒等待地形和碰撞系统初始化
    const timer = setTimeout(generateSnow, 2000)
    return () => clearTimeout(timer)
  }, [])
  
  // 简单的静态积雪显示逻辑
  useFrame((state) => {
    if (!accumulationRef.current) return
    
    const time = state.clock.elapsedTime
    
    // 只在下雪天显示积雪
    const isSnowing = weather === 'snow'
    accumulationRef.current.visible = isSnowing
    
    if (!isSnowing) return
    
    // 静态积雪的简单矩阵更新
    const tempMatrix = new THREE.Matrix4()
    const tempScale = new THREE.Vector3()
    
    snowPiles.forEach((pile, i) => {
      const scale = 1.5 + Math.sin(time * 0.1 + i * 0.1) * 0.2 // 更大的积雪，轻微变化
      tempScale.setScalar(scale)
      
      tempMatrix.compose(
        pile,
        new THREE.Quaternion(),
        tempScale
      )
      
      accumulationRef.current.setMatrixAt(i, tempMatrix)
    })
    
    accumulationRef.current.instanceMatrix.needsUpdate = true
    
    // 太阳雪光暈效果
    if (accumulationRef.current.material instanceof THREE.MeshStandardMaterial) {
      const haloIntensity = Math.sin(time * 2.5) * 0.3 + 0.7
      const goldHalo = new THREE.Color('#FFF8DC').multiplyScalar(haloIntensity * 0.25)
      const shouldGlow = Math.sin(time * 1.8 + 0.5) > 0.0
      
      if (shouldGlow) {
        accumulationRef.current.material.emissive.copy(goldHalo)
        accumulationRef.current.material.emissiveIntensity = haloIntensity * 0.3
      } else {
        accumulationRef.current.material.emissive.setHex(0x000000)
        accumulationRef.current.material.emissiveIntensity = 0
      }
      
      accumulationRef.current.material.needsUpdate = true
    }
  })
  
  // 调试信息
  useEffect(() => {
    console.log(`🔍 积雪调试信息:`)
    console.log(`  天气状态: ${weather}`)
    console.log(`  积雪点数量: ${snowPiles.length}`)
    console.log(`  是否应该显示: ${weather === 'snow'}`)
    if (snowPiles.length > 0) {
      console.log(`  积雪位置示例: [${snowPiles[0].x.toFixed(1)}, ${snowPiles[0].y.toFixed(1)}, ${snowPiles[0].z.toFixed(1)}]`)
    }
  }, [weather, snowPiles])

  return (
    <instancedMesh
      ref={accumulationRef}
      args={[pileGeometry, pileMaterial, ACCUMULATION_POINTS]}
      receiveShadow
      castShadow // 让积雪投射阴影增加可见性
      frustumCulled={false}
      visible={weather === 'snow'} // 只在下雪天显示
    />
  )
}