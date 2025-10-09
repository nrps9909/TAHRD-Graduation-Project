/**
 * 天體系統組件 - 太陽與月亮
 *
 * 功能：
 * - 根據遊戲時間動態計算太陽和月亮位置
 * - 太陽：中午12:00在正上方，提供主要光照
 * - 月亮：午夜12:00在正上方，提供柔和月光
 * - 平滑的日夜光照過渡
 */

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEnvironmentStore } from '../../stores/environmentStore'
import * as THREE from 'three'

/**
 * 太陽組件
 */
export function Sun() {
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const sunMeshRef = useRef<THREE.Mesh>(null)
  const { sunPosition } = useEnvironmentStore()

  // 更新太陽位置和屬性
  useFrame(() => {
    if (!sunRef.current || !sunMeshRef.current) return

    const { position, intensity, color } = sunPosition

    // 更新光源位置
    sunRef.current.position.copy(position)
    sunRef.current.target.position.set(0, 0, 0)
    sunRef.current.target.updateMatrixWorld()

    // 更新光源強度和顏色
    sunRef.current.intensity = intensity
    sunRef.current.color.set(color)

    // 更新太陽視覺效果（如果在地平線上方才顯示）
    if (position.y > 0) {
      sunMeshRef.current.position.copy(position)
      sunMeshRef.current.visible = true

      // 太陽發光效果
      const material = sunMeshRef.current.material as THREE.MeshBasicMaterial
      material.color.set(color)
      material.opacity = Math.min(1, intensity / 1.2)
    } else {
      sunMeshRef.current.visible = false
    }
  })

  return (
    <>
      {/* 太陽光源 */}
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001}
      />

      {/* 太陽視覺效果 */}
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[10, 32, 32]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={1}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

/**
 * 月亮組件
 */
export function Moon() {
  const moonRef = useRef<THREE.DirectionalLight>(null)
  const moonMeshRef = useRef<THREE.Mesh>(null)
  const moonGlowRef = useRef<THREE.Mesh>(null)
  const { moonPosition } = useEnvironmentStore()

  // 更新月亮位置和屬性
  useFrame(() => {
    if (!moonRef.current || !moonMeshRef.current || !moonGlowRef.current) return

    const { position, intensity, color } = moonPosition

    // 更新光源位置
    moonRef.current.position.copy(position)
    moonRef.current.target.position.set(0, 0, 0)
    moonRef.current.target.updateMatrixWorld()

    // 更新光源強度和顏色
    moonRef.current.intensity = intensity
    moonRef.current.color.set(color)

    // 更新月亮視覺效果
    // 月亮在夜晚時顯示，即使在地平線下方也顯示（因為可能在黃昏/黎明時可見）
    const shouldShow = position.y > -20 // 稍微降低門檻，讓月亮在黃昏和黎明時也能看到

    if (shouldShow) {
      moonMeshRef.current.position.copy(position)
      moonGlowRef.current.position.copy(position)
      moonMeshRef.current.visible = true
      moonGlowRef.current.visible = true

      // 月亮發光效果 - 根據高度調整透明度
      const material = moonMeshRef.current.material as THREE.MeshBasicMaterial
      const glowMaterial = moonGlowRef.current.material as THREE.MeshBasicMaterial
      const heightFactor = Math.max(0, (position.y + 20) / 100) // 0-1 based on height
      material.opacity = Math.min(1, heightFactor * 0.95)
      glowMaterial.opacity = Math.min(0.2, heightFactor * 0.15)
    } else {
      moonMeshRef.current.visible = false
      moonGlowRef.current.visible = false
    }
  })

  return (
    <>
      {/* 月光光源 */}
      <directionalLight
        ref={moonRef}
        castShadow={false} // 月光不投射陰影
      />

      {/* 月亮視覺效果 - 使用更大的球體和發光材質 */}
      <mesh ref={moonMeshRef}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial
          color="#e8f4f8"
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>

      {/* 月暈效果 - 讓月亮更明顯 */}
      <mesh ref={moonGlowRef}>
        <sphereGeometry args={[18, 32, 32]} />
        <meshBasicMaterial
          color="#b0c4de"
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

/**
 * 環境光照組件 - 根據時間調整整體環境亮度
 */
export function DynamicAmbientLight() {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const { sunPosition } = useEnvironmentStore()

  useFrame(() => {
    if (!ambientRef.current) return

    // 白天和夜晚的環境光強度
    const dayIntensity = 0.7
    const nightIntensity = 0.2

    // 根據太陽位置平滑過渡
    const transitionFactor = Math.max(0, sunPosition.intensity / 1.2)
    const targetIntensity = nightIntensity + (dayIntensity - nightIntensity) * transitionFactor

    // 平滑過渡
    ambientRef.current.intensity = THREE.MathUtils.lerp(
      ambientRef.current.intensity,
      targetIntensity,
      0.01
    )

    // 顏色也隨時間變化
    const dayColor = new THREE.Color('#FFF8E7')
    const nightColor = new THREE.Color('#4a5568')
    ambientRef.current.color.lerpColors(nightColor, dayColor, transitionFactor)
  })

  return <ambientLight ref={ambientRef} intensity={0.7} color="#FFF8E7" />
}

/**
 * 半球光照組件 - 模擬天空和地面的反射光
 */
export function DynamicHemisphereLight() {
  const hemisphereRef = useRef<THREE.HemisphereLight>(null)
  const { sunPosition } = useEnvironmentStore()

  useFrame(() => {
    if (!hemisphereRef.current) return

    // 白天和夜晚的強度
    const dayIntensity = 0.8
    const nightIntensity = 0.1

    // 根據太陽位置調整
    const transitionFactor = Math.max(0, sunPosition.intensity / 1.2)
    const targetIntensity = nightIntensity + (dayIntensity - nightIntensity) * transitionFactor

    // 平滑過渡
    hemisphereRef.current.intensity = THREE.MathUtils.lerp(
      hemisphereRef.current.intensity,
      targetIntensity,
      0.01
    )

    // 天空顏色變化
    const daySkyColor = new THREE.Color('#FFE5CD')
    const nightSkyColor = new THREE.Color('#1a202c')
    const skyColor = new THREE.Color().lerpColors(nightSkyColor, daySkyColor, transitionFactor)
    hemisphereRef.current.color.copy(skyColor)

    // 地面顏色變化
    const dayGroundColor = new THREE.Color('#FFE5F0')
    const nightGroundColor = new THREE.Color('#2d3748')
    const groundColor = new THREE.Color().lerpColors(nightGroundColor, dayGroundColor, transitionFactor)
    hemisphereRef.current.groundColor.copy(groundColor)
  })

  return (
    <hemisphereLight
      ref={hemisphereRef}
      intensity={0.8}
      color="#FFE5CD"
      groundColor="#FFE5F0"
    />
  )
}

/**
 * 完整天體系統 - 包含所有光照組件
 */
export function CelestialSystem() {
  const { initialize } = useEnvironmentStore()

  // 初始化環境系統
  useEffect(() => {
    const cleanup = initialize()
    return cleanup
  }, [initialize])

  return (
    <group name="celestial-system">
      <Sun />
      <Moon />
      <DynamicAmbientLight />
      <DynamicHemisphereLight />
    </group>
  )
}
