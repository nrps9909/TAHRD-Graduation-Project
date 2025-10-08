/**
 * RealisticOcean - 真实海洋效果
 * 使用 Water shader 创建带波浪和反射的海洋
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Water } from 'three-stdlib'
import * as THREE from 'three'

export function RealisticOcean() {
  const waterRef = useRef<Water>(null)
  const { gl, scene, camera } = useThree()

  // 创建水面纹理
  const waterNormals = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const texture = loader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      }
    )
    return texture
  }, [])

  // 创建 Water 实例
  const water = useMemo(() => {
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 128, 128)

    const waterInstance = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new THREE.Vector3(0.7, 0.5, 0.3),
      sunColor: 0xffffff,
      waterColor: 0x89cff0, // 温暖的蓝色
      distortionScale: 3.7,
      fog: scene.fog !== undefined,
      alpha: 0.9,
    })

    waterInstance.rotation.x = -Math.PI / 2
    waterInstance.position.set(0, -2, 0)

    return waterInstance
  }, [waterNormals, scene.fog])

  // 添加到场景
  useEffect(() => {
    if (water) {
      scene.add(water)
      return () => {
        scene.remove(water)
      }
    }
  }, [water, scene])

  // 动画更新
  useFrame((_, delta) => {
    if (water) {
      water.material.uniforms.time.value += delta * 0.3 // 波浪速度
    }
  })

  return null
}
