/**
 * CatTree - 猫树模型组件
 * 用于测试显示 cat_tree_ready_for_your_game.glb
 */

import { Suspense, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface CatTreeProps {
  position?: [number, number, number]
  scale?: number
}

function CatTreeModel({ position = [0, 0, 0], scale = 1 }: CatTreeProps) {
  const { scene } = useGLTF('/models/cat_tree.glb')
  const [coloredScene, setColoredScene] = useState<THREE.Group | null>(null)

  useEffect(() => {
    if (scene) {
      // 克隆场景
      const sceneClone = scene.clone(true)

      // 定义可爱的粉色色调
      const cuteColors = [
        '#FFB3D9', // 寶寶粉
        '#FFC0CB', // 粉红色
        '#FFE5F0', // 淡粉色
        '#FFDEE9', // 浅粉色
        '#FF8FB3', // 深粉色
      ]

      let meshIndex = 0

      sceneClone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            const materials = child.material instanceof Array
              ? child.material
              : [child.material]

            const newMaterials = materials.map((mat) => {
              const clonedMat = mat.clone()

              // 选择一个可爱的颜色
              const cuteColor = cuteColors[meshIndex % cuteColors.length]

              // 设置颜色
              if ('color' in clonedMat && clonedMat.color instanceof THREE.Color) {
                clonedMat.color.set(cuteColor)
              }

              // 移除纹理以显示纯色
              if ('map' in clonedMat && clonedMat.map) {
                clonedMat.map = null
              }

              // 添加柔和的自发光
              if ('emissive' in clonedMat && clonedMat.emissive instanceof THREE.Color) {
                clonedMat.emissive.set(cuteColor)
                if ('emissiveIntensity' in clonedMat) {
                  clonedMat.emissiveIntensity = 0.2
                }
              }

              // 调整材质属性，让它看起来更可爱
              if ('roughness' in clonedMat) {
                clonedMat.roughness = 0.6
              }
              if ('metalness' in clonedMat) {
                clonedMat.metalness = 0.1
              }

              clonedMat.needsUpdate = true
              return clonedMat
            })

            child.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials
            child.castShadow = true
            child.receiveShadow = true
            meshIndex++
          }
        }
      })

      setColoredScene(sceneClone)
    }
  }, [scene])

  if (!coloredScene) return null

  return (
    <group position={position} scale={scale}>
      <primitive object={coloredScene} />
    </group>
  )
}

export function CatTree(props: CatTreeProps) {
  return (
    <Suspense fallback={null}>
      <CatTreeModel {...props} />
    </Suspense>
  )
}

// 预加载模型
useGLTF.preload('/models/cat_tree.glb')
