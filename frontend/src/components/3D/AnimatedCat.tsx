/**
 * AnimatedCat - 可變色的 3D 貓咪模型組件
 * 載入 GLB 模型並根據顏色參數調整材質
 *
 * 特性：
 * - 動態顏色變換
 * - 自動播放動畫
 * - Suspense 懶加載
 * - 互動效果
 */

import { useRef, useEffect, useState, Suspense } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import { LoadingCat } from './LoadingCat'
import { playMeowSound, playPurrSound } from '../../utils/soundManager'

interface AnimatedCatProps {
  position?: [number, number, number]
  scale?: number
  onClick?: () => void
  color?: string // 主要顏色（白色或黑色）
  name?: string // 貓咪名稱
  subtitle?: string // 副標題
  emoji?: string // 表情符號
  lightColor?: string // hover 光效顏色
  hideLabel?: boolean // 是否隱藏標籤
}

// 內部實際的貓咪組件
function AnimatedCatModel({
  position = [0, 0, 0],
  scale = 1.5,
  onClick,
  color = '#FFFFFF',
  name = '貓咪',
  subtitle = '',
  emoji = '🐱',
  lightColor = '#FFFFFF',
  hideLabel = false,
}: AnimatedCatProps) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [clonedScene, setClonedScene] = useState<THREE.Group | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // 載入 GLB 模型
  const { scene, animations } = useGLTF('/models/cats/animated-cat.glb')

  // 🌊 弹簧动画 - hover 时放大，click 时弹起
  const { springScale, springY } = useSpring({
    springScale: hovered ? scale * 1.2 : clicked ? scale * 0.9 : scale,
    springY: clicked ? position[1] + 0.5 : position[1],
    config: { tension: 300, friction: 10 },
  })

  // 克隆場景並修改模型顏色
  useEffect(() => {
    if (scene) {
      // 克隆整個場景以避免多個實例共享材質
      const sceneClone = scene.clone(true)

      sceneClone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 克隆材質以避免影響原始模型
          if (child.material) {
            const materials = child.material instanceof Array
              ? child.material
              : [child.material]

            const newMaterials = materials.map((mat) => {
              const clonedMat = mat.clone()

              const isWhite = color === '#FFFFFF' || color === 'white'
              const isBlack = color === '#000000' || color === 'black'

              // 設置基礎顏色
              if ('color' in clonedMat && clonedMat.color instanceof THREE.Color) {
                if (isWhite) {
                  // 白色貓咪：增強亮度
                  clonedMat.color.set(color)
                  clonedMat.color.multiplyScalar(1.5)
                } else if (isBlack) {
                  // 黑色貓咪：使用深灰色而非純黑，讓材質可見
                  clonedMat.color.set('#3A3A3A') // 深灰色
                } else {
                  clonedMat.color.set(color)
                }
              }

              // 保留纹理贴图以显示材质细节
              if ('map' in clonedMat && clonedMat.map) {
                if (isWhite && 'aoMapIntensity' in clonedMat) {
                  clonedMat.aoMapIntensity = 0.3 // 白色降低 AO
                }
                if (isBlack && 'aoMapIntensity' in clonedMat) {
                  clonedMat.aoMapIntensity = 0.5 // 黑色適度 AO，顯示細節
                }
              }

              // 調整材質屬性
              if ('roughness' in clonedMat) {
                clonedMat.roughness = isWhite ? 0.6 : isBlack ? 0.7 : 0.8
              }
              if ('metalness' in clonedMat) {
                clonedMat.metalness = isBlack ? 0.15 : 0.05 // 黑色稍微有金屬感，增加反光
              }

              // 自發光設定
              if ('emissive' in clonedMat && clonedMat.emissive instanceof THREE.Color) {
                if (isWhite) {
                  clonedMat.emissive.set('#FFFFFF')
                  if ('emissiveIntensity' in clonedMat) {
                    clonedMat.emissiveIntensity = 0.2
                  }
                } else if (isBlack) {
                  // 黑色貓咪：使用灰色自發光顯示輪廓和細節
                  clonedMat.emissive.set('#555555')
                  if ('emissiveIntensity' in clonedMat) {
                    clonedMat.emissiveIntensity = 0.15
                  }
                } else {
                  clonedMat.emissive.set(color)
                  if ('emissiveIntensity' in clonedMat) {
                    clonedMat.emissiveIntensity = 0.05
                  }
                }
              }

              clonedMat.needsUpdate = true
              return clonedMat
            })

            child.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials
            child.castShadow = true
            child.receiveShadow = true
          }
        }
      })

      setClonedScene(sceneClone)
    }
  }, [scene, color, name])

  // 設置動畫混合器和播放動畫
  useEffect(() => {
    if (clonedScene && animations.length > 0) {
      // 創建動畫混合器
      const mixer = new THREE.AnimationMixer(clonedScene)
      mixerRef.current = mixer

      // 播放所有動畫
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip)
        action.play()
      })

      // 清理函數
      return () => {
        mixer.stopAllAction()
        mixerRef.current = null
      }
    }
  }, [clonedScene, animations])

  // 更新動畫混合器（移除漂浮動畫，固定在島上）
  useFrame((_, delta) => {
    // 更新骨骼動畫
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
    // 貓咪固定在島上，不再漂浮
  })

  // 光标由 cursor.css 统一管理，不需要动态设置
  // useEffect(() => {
  //   document.body.style.cursor = hovered ? 'pointer' : 'auto'
  // }, [hovered])

  // 点击处理 - 播放音效并触发动画
  const handleClick = (e: any) => {
    e.stopPropagation()
    playMeowSound()
    setClicked(true)
    setTimeout(() => setClicked(false), 300)
    if (onClick) onClick()
  }

  // 悬停处理 - 播放咕噜声
  const handlePointerOver = () => {
    setHovered(true)
    playPurrSound()
  }

  return (
    <animated.group
      ref={group}
      position-x={position[0]}
      position-y={springY}
      position-z={position[2]}
      scale={springScale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={() => setHovered(false)}
    >
      {/* GLB 模型 */}
      {clonedScene && <primitive object={clonedScene} />}

      {/* 永久顯示的名稱標籤（可通過 hideLabel 隱藏，可點擊觸發對話） */}
      {!hideLabel && (
        <Html position={[0, 0.67, 0]} center zIndexRange={[10, 0]}>
          <div
            className="px-4 py-2 rounded-2xl text-white font-bold shadow-lg whitespace-nowrap transition-all cursor-pointer"
            style={{
              background:
                color === '#FFFFFF' || color === 'white'
                  ? 'linear-gradient(135deg, #FFFFFF, #FFF8F0)'
                  : 'linear-gradient(135deg, #4A4A4A, #2C2C2C)',
              color: color === '#FFFFFF' || color === 'white' ? '#FF8FB3' : 'white',
              border: `2px solid ${color === '#FFFFFF' || color === 'white' ? 'white' : '#FFD700'}`,
              pointerEvents: 'auto',
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleClick(e)
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {emoji} {name}
            {subtitle && <div className="text-xs opacity-80">{subtitle}</div>}
          </div>
        </Html>
      )}

      {/* 光點效果 */}
      {hovered && (
        <pointLight
          position={[0, 1, 0]}
          intensity={color === '#FFFFFF' || color === 'white' ? 1 : 0.8}
          color={lightColor}
          distance={3}
        />
      )}
    </animated.group>
  )
}

// 主要導出組件 - 帶 Suspense 包裝
export function AnimatedCat(props: AnimatedCatProps) {
  return (
    <Suspense fallback={<LoadingCat position={props.position} />}>
      <AnimatedCatModel {...props} />
    </Suspense>
  )
}

// 預載入模型
useGLTF.preload('/models/cats/animated-cat.glb')
