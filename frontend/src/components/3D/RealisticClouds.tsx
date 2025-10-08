/**
 * RealisticClouds - 可爱白云效果
 * 随机生成飘动的白云
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Cloud, Clouds as DreiClouds } from '@react-three/drei'
import * as THREE from 'three'

interface CloudConfig {
  position: [number, number, number]
  speed: number
  opacity: number
  scale: number
}

// 随机生成云朵配置
function generateRandomClouds(count: number): CloudConfig[] {
  const clouds: CloudConfig[] = []

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 160 // -80 到 80
    const y = 25 + Math.random() * 20 // 25 到 45
    const z = -20 - Math.random() * 80 // -20 到 -100
    const speed = 0.01 + Math.random() * 0.02 // 0.01 到 0.03
    const opacity = 0.7 + Math.random() * 0.3 // 0.7 到 1.0 (更不透明)
    const scale = 12 + Math.random() * 10 // 12 到 22

    clouds.push({
      position: [x, y, z],
      speed,
      opacity,
      scale
    })
  }

  return clouds
}

export function RealisticClouds() {
  const cloudsRef = useRef<THREE.Group>(null)

  // 随机生成 20 朵云
  const cloudConfigs = useMemo(() => generateRandomClouds(20), [])

  // 云朵飘动动画
  useFrame((state) => {
    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((cloud, index) => {
        const config = cloudConfigs[index]
        if (config) {
          // 水平飘动
          cloud.position.x += config.speed * 0.1

          // 循环回到起点
          if (cloud.position.x > 80) {
            cloud.position.x = -80
          }

          // 轻微上下浮动
          cloud.position.y = config.position[1] + Math.sin(state.clock.elapsedTime * 0.3 + index) * 1.0
        }
      })
    }
  })

  return (
    <group ref={cloudsRef}>
      <DreiClouds material={THREE.MeshBasicMaterial}>
        {cloudConfigs.map((config, index) => (
          <Cloud
            key={index}
            position={config.position}
            opacity={config.opacity}
            speed={config.speed}
            width={config.scale}
            depth={config.scale * 0.5}
            segments={30}
            color="#ffffff"
            fade={30}
          />
        ))}
      </DreiClouds>
    </group>
  )
}
