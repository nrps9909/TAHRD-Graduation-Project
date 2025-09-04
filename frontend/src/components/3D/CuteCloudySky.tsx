import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 可愛的多雲天空效果 - 在半圓形天空上呈現雲朵
export const CuteCloudySky = () => {
  const cloudMeshRef = useRef<THREE.Mesh>(null)
  const { weather, timeOfDay } = useTimeStore()
  
  // 創建半圓形天空幾何體
  const skyGeometry = useMemo(() => {
    return new THREE.SphereGeometry(
      400, // 半徑
      32,  // 水平分段
      16,  // 垂直分段
      0,   // phiStart
      Math.PI * 2, // phiLength (完整圓周)
      0,   // thetaStart
      Math.PI / 2  // thetaLength (半圓)
    )
  }, [])
  
  // 創建可愛風格的雲朵材質
  const cloudMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cloudOpacity: { value: 0.7 },
        cloudColor: { value: new THREE.Color('#FFFFFF') },
        skyColor: { value: new THREE.Color('#87CEEB') },
        nightSkyColor: { value: new THREE.Color('#9370DB') },
        isNight: { value: 0.0 },
        weatherIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float cloudOpacity;
        uniform vec3 cloudColor;
        uniform vec3 skyColor;
        uniform vec3 nightSkyColor;
        uniform float isNight;
        uniform float weatherIntensity;
        
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        // 可愛的噪聲函數
        float noise(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // 可愛的雲朵噪聲
        float cloudNoise(vec2 st, float scale) {
          st *= scale;
          
          // 多層噪聲疊加，創造蓬鬆的雲朵
          float n1 = noise(st);
          float n2 = noise(st * 2.0) * 0.5;
          float n3 = noise(st * 4.0) * 0.25;
          float n4 = noise(st * 8.0) * 0.125;
          
          return n1 + n2 + n3 + n4;
        }
        
        void main() {
          vec3 currentSkyColor = mix(skyColor, nightSkyColor, isNight);
          
          // 基於UV座標創造可愛的雲朵圖案
          vec2 cloudUV = vUv;
          
          // 添加時間流動效果
          cloudUV.x += time * 0.02; // 慢速飄動
          cloudUV.y += sin(time * 0.01) * 0.01; // 輕微上下浮動
          
          // 創造可愛的雲朵形狀
          float cloud1 = cloudNoise(cloudUV + vec2(0.0, 0.0), 3.0);
          float cloud2 = cloudNoise(cloudUV + vec2(1.5, 0.8), 2.5);
          float cloud3 = cloudNoise(cloudUV + vec2(-1.2, 1.3), 4.0);
          
          // 混合多層雲朵
          float cloudPattern = cloud1 * 0.5 + cloud2 * 0.3 + cloud3 * 0.2;
          
          // 創造可愛的雲朵邊緣
          float cloudMask = smoothstep(0.4, 0.7, cloudPattern);
          cloudMask *= smoothstep(0.95, 0.7, cloudPattern); // 避免過於密集
          
          // 根據高度調整雲朵密度（天空上方多雲朵）
          float heightFactor = smoothstep(0.1, 0.8, vUv.y);
          cloudMask *= heightFactor;
          
          // 可愛的雲朵形狀調整
          cloudMask = smoothstep(0.2, 0.8, cloudMask);
          
          // 根據天氣調整雲朵強度
          cloudMask *= weatherIntensity;
          
          // 混合天空色和雲朵色
          vec3 finalColor = mix(currentSkyColor, cloudColor, cloudMask * cloudOpacity);
          
          // 添加可愛的邊緣發光效果
          float edgeGlow = 1.0 - smoothstep(0.0, 0.3, cloudMask);
          finalColor += vec3(1.0, 1.0, 1.0) * edgeGlow * 0.1 * (1.0 - isNight);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      transparent: false
    })
  }, [])
  
  useFrame((state) => {
    if (cloudMeshRef.current && cloudMeshRef.current.material instanceof THREE.ShaderMaterial) {
      const material = cloudMeshRef.current.material
      
      // 更新時間
      material.uniforms.time.value = state.clock.elapsedTime
      
      // 直接設置日夜模式，無過渡
      material.uniforms.isNight.value = timeOfDay === 'night' ? 1.0 : 0.0
      
      // 直接設置天空和雲朵顏色，無漸變過渡
      if (timeOfDay === 'day') {
        material.uniforms.skyColor.value.setStyle('#87CEEB') // 純天藍色
        material.uniforms.cloudColor.value.setStyle('#FFFFFF') // 白雲
      } else {
        material.uniforms.skyColor.value.setStyle('#87CEEB') // 更亮夜晚背景色 - 天藍色
        material.uniforms.cloudColor.value.setStyle('#FFFFFF') // 更亮夜晚雲朵 - 白色
      }
      
      // 直接設置雲朵強度和透明度，無過渡效果
      let weatherIntensity = 0
      let cloudOpacity = 0.6
      
      switch (weather) {
        case 'cloudy':
          weatherIntensity = 1.0
          cloudOpacity = 0.8
          break
        case 'drizzle':
          weatherIntensity = 0.6
          cloudOpacity = 0.7
          if (timeOfDay === 'day') {
            material.uniforms.cloudColor.value.setStyle('#E0E0E0') // 灰白雲
          } else {
            material.uniforms.cloudColor.value.setStyle('#F0F8FF') // 更亮夜晚細雨雲 - 愛麗絲藍
          }
          break
        case 'clear':
        default:
          weatherIntensity = 0.2
          cloudOpacity = 0.3
          break
      }
      
      // 直接設置數值，無過渡
      material.uniforms.weatherIntensity.value = weatherIntensity
      material.uniforms.cloudOpacity.value = cloudOpacity
    }
  })
  
  // 只在白天有雲的天氣時顯示
  const shouldShow = timeOfDay === 'day' && (
    weather === 'cloudy' || weather === 'drizzle' || 
    (weather === 'clear' && Math.random() > 0.7)
  )
  
  if (!shouldShow) return null
  
  return (
    <mesh ref={cloudMeshRef} geometry={skyGeometry} material={cloudMaterial} />
  )
}