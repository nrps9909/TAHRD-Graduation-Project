/**
 * AnimalCrossingClouds - 動物森友會風格的卡通雲
 * 隨機生成、自然飄動的半透明雲朵系統
 * 覆蓋整個遊戲場景（1000x1000 海洋）
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CloudConfig {
  position: THREE.Vector3
  speed: number
  scale: number
  opacity: number
  rotationSpeed: number
  textureVariant: number // 雲朵紋理變體
}

/**
 * 生成多種不同形狀的雲紋理
 */
function generateCloudTextures(count: number = 8): THREE.Texture[] {
  const textures: THREE.Texture[] = []

  for (let variant = 0; variant < count; variant++) {
    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, size, size)

    const centerX = size / 2
    const centerY = size / 2

    // 每個變體有不同的雲朵形狀
    const puffCount = 4 + Math.floor(Math.random() * 3) // 4-6 個圓球
    const cloudPuffs = []

    for (let i = 0; i < puffCount; i++) {
      const angle = (i / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const distance = 60 + Math.random() * 40
      const radius = 70 + Math.random() * 50
      const opacity = 0.8 + Math.random() * 0.2

      cloudPuffs.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance * 0.6, // 扁平一些
        radius,
        opacity
      })
    }

    // 添加中心球
    cloudPuffs.push({
      x: centerX,
      y: centerY,
      radius: 100 + Math.random() * 30,
      opacity: 1.0
    })

    // 繪製雲朵
    cloudPuffs.forEach(puff => {
      const gradient = ctx.createRadialGradient(
        puff.x, puff.y, 0,
        puff.x, puff.y, puff.radius
      )

      gradient.addColorStop(0, `rgba(255, 255, 255, ${puff.opacity})`)
      gradient.addColorStop(0.4, `rgba(255, 255, 255, ${puff.opacity * 0.7})`)
      gradient.addColorStop(0.7, `rgba(255, 255, 255, ${puff.opacity * 0.3})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    textures.push(texture)
  }

  return textures
}

/**
 * 生成隨機雲朵配置
 * 擴大範圍以覆蓋整個遊戲場景（海洋 1000x1000）
 */
function generateRandomCloud(xRange: [number, number], zRange: [number, number]): CloudConfig {
  const x = xRange[0] + Math.random() * (xRange[1] - xRange[0])
  const y = 30 + Math.random() * 35 // 30-65 的高度（更高的天空）
  const z = zRange[0] + Math.random() * (zRange[1] - zRange[0])

  return {
    position: new THREE.Vector3(x, y, z),
    speed: 0.15 + Math.random() * 0.4, // 0.15-0.55（稍慢一些，更自然）
    scale: 15 + Math.random() * 20, // 15-35（更大的雲朵）
    opacity: 0.4 + Math.random() * 0.45, // 0.4-0.85（更透明一些）
    rotationSpeed: (Math.random() - 0.5) * 0.002,
    textureVariant: Math.floor(Math.random() * 8) // 0-7
  }
}

/**
 * 單朵動態雲組件
 */
function DynamicCloud({
  initialConfig,
  textures,
  onReset
}: {
  initialConfig: CloudConfig
  textures: THREE.Texture[]
  onReset: (newConfig: CloudConfig) => void
}) {
  const spriteRef = useRef<THREE.Sprite>(null)
  const configRef = useRef<CloudConfig>(initialConfig)

  // 雲朵飄動與重生邏輯
  useFrame((state) => {
    if (!spriteRef.current) return

    const config = configRef.current

    // 持續水平飄動
    spriteRef.current.position.x += config.speed * 0.016

    // 檢查是否超出邊界，如果是則重新生成
    // 擴大邊界範圍以覆蓋整個海洋
    if (spriteRef.current.position.x > 500) {
      // 從左側重新生成，覆蓋整個 z 軸範圍
      const newConfig = generateRandomCloud([-500, -450], [-400, 400])
      configRef.current = newConfig

      spriteRef.current.position.copy(newConfig.position)
      spriteRef.current.scale.set(newConfig.scale, newConfig.scale * 0.6, 1)

      // 更新材質
      const material = spriteRef.current.material as THREE.SpriteMaterial
      material.opacity = newConfig.opacity
      material.map = textures[newConfig.textureVariant]
      material.needsUpdate = true

      onReset(newConfig)
    } else {
      // 自然的上下浮動
      const baseY = config.position.y
      const floatAmount = Math.sin(state.clock.elapsedTime * 0.3 + config.position.x * 0.05) * 2.0
      spriteRef.current.position.y = baseY + floatAmount

      // 保持 z 位置
      spriteRef.current.position.z = config.position.z

      // 輕微旋轉
      spriteRef.current.rotation.z += config.rotationSpeed
    }
  })

  const texture = textures[initialConfig.textureVariant] || textures[0]

  return (
    <sprite
      ref={spriteRef}
      position={initialConfig.position}
      scale={[initialConfig.scale, initialConfig.scale * 0.6, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={initialConfig.opacity}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </sprite>
  )
}

/**
 * 動物森友會風格雲層系統 - 隨機生成版
 * 覆蓋整個遊戲場景
 */
export function AnimalCrossingClouds({ count = 40 }: { count?: number }) {
  // 生成多種雲朵紋理（只生成一次）
  const cloudTextures = useMemo(() => generateCloudTextures(8), [])

  // 初始雲朵配置 - 分散在整個場景中
  // 海洋大小：1000x1000，所以範圍設為 -400 到 400
  const initialClouds = useMemo(() => {
    return Array.from({ length: count }, () =>
      generateRandomCloud([-400, 400], [-400, 400])
    )
  }, [count])

  const cloudsConfigRef = useRef(initialClouds)

  const handleCloudReset = (index: number) => (newConfig: CloudConfig) => {
    cloudsConfigRef.current[index] = newConfig
  }

  return (
    <group name="animal-crossing-clouds">
      {initialClouds.map((config, index) => (
        <DynamicCloud
          key={index}
          initialConfig={config}
          textures={cloudTextures}
          onReset={handleCloudReset(index)}
        />
      ))}
    </group>
  )
}
