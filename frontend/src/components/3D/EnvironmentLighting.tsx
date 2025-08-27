import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore, TIME_SETTINGS, WEATHER_SETTINGS, WeatherType } from '@/stores/timeStore'

// 漸進式時間插值函數 - 平滑的天空變化
const interpolateTimeSettings = (hour: number) => {
  // 創建顏色插值函數
  const lerpColor = (color1: string, color2: string, factor: number) => {
    const c1 = new THREE.Color(color1)
    const c2 = new THREE.Color(color2)
    return c1.lerp(c2, factor)
  }
  
  // 定義一天中的關鍵時刻和對應設定
  const timePoints = [
    { hour: 6,  // 黎明
      skyColor: '#FF8C69', // 橙紅色
      ambientIntensity: 0.4,
      sunIntensity: 0.6,
      sunPosition: [-50, 10, -20],
      sunColor: '#FFA500'
    },
    { hour: 8, // 上午（天空藍開始）
      skyColor: '#87CEEB', // 天空藍
      ambientIntensity: 0.9,
      sunIntensity: 1.2,
      sunPosition: [-20, 50, -10],
      sunColor: '#FFFACD'
    },
    { hour: 12, // 正午
      skyColor: '#87CEEB', // 天空藍
      ambientIntensity: 1.0,
      sunIntensity: 1.5,
      sunPosition: [0, 80, 0],
      sunColor: '#FFFFFF'
    },
    { hour: 17, // 下午（天空藍持續）
      skyColor: '#87CEEB', // 天空藍
      ambientIntensity: 0.9,
      sunIntensity: 1.2,
      sunPosition: [20, 50, -10],
      sunColor: '#FFFACD'
    },
    { hour: 18, // 黃昏
      skyColor: '#DC143C', // 深紅色
      ambientIntensity: 0.4,
      sunIntensity: 0.6,
      sunPosition: [50, 10, -20],
      sunColor: '#FF4500'
    },
    { hour: 24, // 深夜
      skyColor: '#191970', // 深藍夜空
      ambientIntensity: 0.3,
      sunIntensity: 0.0,
      sunPosition: [0, -10, 0],
      sunColor: '#4169E1'
    }
  ]
  
  // 處理24小時循環（0點等同24點）
  const normalizedHour = hour % 24
  
  // 找到當前時間所在的區間
  let currentIndex = 0
  let nextIndex = 1
  let factor = 0
  
  for (let i = 0; i < timePoints.length; i++) {
    const currentPoint = timePoints[i]
    const nextPoint = timePoints[(i + 1) % timePoints.length]
    
    let currentHour = currentPoint.hour
    let nextHour = nextPoint.hour
    
    // 處理跨天情況（夜晚到黎明）
    if (nextHour < currentHour) {
      nextHour += 24
    }
    
    if ((normalizedHour >= currentHour && normalizedHour < nextHour) ||
        (currentHour > nextPoint.hour && (normalizedHour >= currentHour || normalizedHour < nextPoint.hour))) {
      currentIndex = i
      nextIndex = (i + 1) % timePoints.length
      
      if (currentHour > nextPoint.hour) {
        // 跨天情況
        if (normalizedHour >= currentHour) {
          factor = (normalizedHour - currentHour) / (24 - currentHour + nextPoint.hour)
        } else {
          factor = (24 - currentHour + normalizedHour) / (24 - currentHour + nextPoint.hour)
        }
      } else {
        factor = (normalizedHour - currentHour) / (nextHour - currentHour)
      }
      break
    }
  }
  
  const current = timePoints[currentIndex]
  const next = timePoints[nextIndex]
  
  // 平滑插值計算
  return {
    ambientIntensity: current.ambientIntensity + (next.ambientIntensity - current.ambientIntensity) * factor,
    sunIntensity: current.sunIntensity + (next.sunIntensity - current.sunIntensity) * factor,
    sunPosition: [
      current.sunPosition[0] + (next.sunPosition[0] - current.sunPosition[0]) * factor,
      current.sunPosition[1] + (next.sunPosition[1] - current.sunPosition[1]) * factor,
      current.sunPosition[2] + (next.sunPosition[2] - current.sunPosition[2]) * factor
    ],
    backgroundColor: lerpColor(current.skyColor, next.skyColor, factor).getHexString(),
    sunColor: lerpColor(current.sunColor, next.sunColor, factor).getHexString(),
    fogColor: lerpColor(current.skyColor, next.skyColor, factor).getHexString()
  }
}

export const EnvironmentLighting = () => {
  const { weather } = useTimeStore()
  const nightSettings = TIME_SETTINGS.night
  const weatherSettings = WEATHER_SETTINGS[weather]

  // 設置固定夜晚背景和霧效
  useFrame((state) => {
    // 固定夜晚背景色
    let bgColor = new THREE.Color(nightSettings.backgroundColor)
    if (weather === 'storm') {
      bgColor.multiplyScalar(0.3) // 暴風雨時更暗
    } else if (weather === 'rain') {
      bgColor.multiplyScalar(0.7) // 雨天時偏暗
    }
    state.scene.background = bgColor
    
    // 更新霧效
    if (!state.scene.fog) {
      state.scene.fog = new THREE.Fog(nightSettings.fogColor, 50, 800)
    } else {
      state.scene.fog.color.setStyle(nightSettings.fogColor)
      state.scene.fog.near = weather === 'fog' ? 10 : 50
      state.scene.fog.far = weather === 'fog' ? 200 : (weatherSettings.fogIntensity * 800)
    }
  })

  return (
    <>
      {/* 夜晚環境光 */}
      <ambientLight 
        color="#6495ED" 
        intensity={nightSettings.ambientIntensity * weatherSettings.lightMultiplier} 
      />
      
      {/* 夜晚月光 */}
      <hemisphereLight
        color="#5A5A8B" // 調亮的夜空色
        groundColor="#2E2E5C" // 調亮的地面色
        intensity={0.6 * weatherSettings.lightMultiplier} // 增強月光
      />
    </>
  )
}

// 天空盒組件 - 現在由EnvironmentLighting處理
export const DynamicSky = () => {
  // 移除重複的背景設置，讓EnvironmentLighting全權處理
  return null
}