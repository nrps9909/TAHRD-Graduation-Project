import React, { useEffect, useRef, useState } from 'react'
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
  
  // 山地環境的時間點設定 - 考慮山峰遮擋和高海拔特性
  const timePoints = [
    { hour: 5,  // 山地黎明前 - 寧靜藍調
      skyColor: '#4682B4', // 鋼藍色
      ambientIntensity: 0.3,  
      sunIntensity: 0.0,      
      sunPosition: [-80, -10, -30], 
      sunColor: '#6495ED'
    },
    { hour: 6,  // 山地黎明 - 晨光乍現
      skyColor: '#FF8C69', // 橙紅色
      ambientIntensity: 0.5,  
      sunIntensity: 0.8,      // 山峰遮擋，光線較弱
      sunPosition: [-60, 5, -20], // 山後升起
      sunColor: '#FFA500'
    },
    { hour: 8, // 上午 - 陽光越過山峰
      skyColor: '#87CEEB', // 天空藍
      ambientIntensity: 1.0,  
      sunIntensity: 1.8,      // 陽光開始強烈
      sunPosition: [-30, 40, -10], 
      sunColor: '#FFFFE0'     // 淡黃陽光
    },
    { hour: 11, // 上午晚期 - 山地強光
      skyColor: '#87CEEB', 
      ambientIntensity: 1.3,  
      sunIntensity: 2.2,      
      sunPosition: [-10, 70, 5], 
      sunColor: '#FFFFFF'
    },
    { hour: 13, // 正午過後 - 最強光照
      skyColor: '#87CEEB', 
      ambientIntensity: 1.4,  // 山地反射光
      sunIntensity: 2.4,      
      sunPosition: [10, 80, 10], 
      sunColor: '#FFFFFF'
    },
    { hour: 16, // 下午 - 西傾陽光
      skyColor: '#87CEEB', 
      ambientIntensity: 1.1,  
      sunIntensity: 1.9,      
      sunPosition: [40, 50, 5], 
      sunColor: '#FFF8DC'     // 米色陽光
    },
    { hour: 17, // 傍晚 - 山影漸長
      skyColor: '#CD853F', // 秘魯色
      ambientIntensity: 0.8,  
      sunIntensity: 1.3,      
      sunPosition: [60, 25, -10], 
      sunColor: '#FF6347'
    },
    { hour: 19, // 黃昏 - 山後夕陽
      skyColor: '#8B4513', // 馬鞍棕色
      ambientIntensity: 0.5,  
      sunIntensity: 0.8,      // 山峰遮擋
      sunPosition: [80, 5, -20], 
      sunColor: '#FF4500'
    },
    { hour: 21, // 入夜 - 山地藍調時刻
      skyColor: '#483D8B', // 暗板岩藍
      ambientIntensity: 0.35,
      sunIntensity: 0.0,
      sunPosition: [90, -5, -30],
      sunColor: '#9370DB'
    },
    { hour: 24, // 深夜 - 高山寧靜
      skyColor: '#2F4F4F', // 暗石板灰
      ambientIntensity: 0.25, // 高山夜晚較暗
      sunIntensity: 0.0,
      sunPosition: [0, -15, 0],
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
  const { hour, weather, timeOfDay } = useTimeStore()
  const weatherSettings = WEATHER_SETTINGS[weather]
  
  // 暴風雨閃電效果狀態
  const [lightningActive, setLightningActive] = useState(false)
  const [lightningIntensity, setLightningIntensity] = useState(0)
  
  // 獲取動態時間設定
  const currentSettings = interpolateTimeSettings(hour)

  // 設置動態背景和霧效
  useFrame((state) => {
    // 暴風雨閃電邏輯
    if (weather === 'storm') {
      if (!lightningActive && Math.random() < 0.002) { // 0.2% 機率每幀
        setLightningActive(true)
        setLightningIntensity(2 + Math.random() * 3) // 2-5倍強度
        
        // 閃電持續時間
        const duration = 100 + Math.random() * 200 // 100-300ms
        setTimeout(() => {
          setLightningActive(false)
          setLightningIntensity(0)
        }, duration)
      }
    } else {
      // 非暴風雨天氣時確保閃電效果關閉
      if (lightningActive) {
        setLightningActive(false)
        setLightningIntensity(0)
      }
    }
    
    // 動態背景色 - 根據天氣和閃電調整
    let bgColor = new THREE.Color('#' + currentSettings.backgroundColor)
    
    if (weather === 'storm') {
      if (lightningActive) {
        bgColor = bgColor.lerp(new THREE.Color('#E6E6FA'), 0.6) // 閃電時變亮
      } else {
        // 暴風雨時濃厚陰沉灰色
        bgColor = bgColor.multiply(new THREE.Color(0.25, 0.27, 0.30)) // 保持灰色調
        bgColor = bgColor.lerp(new THREE.Color('#4a4c52'), 0.4) // 混入中灰色
      }
    } else if (weather === 'rain' || weather === 'drizzle') {
      bgColor.multiplyScalar(0.7) // 雨天時偏暗
    } else if (weather === 'fog' || weather === 'mist') {
      bgColor.multiplyScalar(0.6) // 霧天時偏暗
    } else if (weather === 'snow') {
      bgColor = bgColor.lerp(new THREE.Color('#F0F8FF'), 0.2) // 雪天偏冷白色
    } else if (weather === 'windy') {
      // 大風天氣 - 天空更明亮清澈，雲層被吹散
      bgColor.multiplyScalar(1.1) // 比晴天更亮
      bgColor = bgColor.lerp(new THREE.Color('#E0F6FF'), 0.1) // 略微偏向冷白色
    }
    
    state.scene.background = bgColor
    
    // 更新霧效 - 根據天氣調整能見度
    if (!state.scene.fog) {
      state.scene.fog = new THREE.Fog('#' + currentSettings.fogColor, 50, 800)
    } else {
      state.scene.fog.color.setStyle('#' + currentSettings.fogColor)
      
      // 根據天氣調整霧的距離
      let fogNear = 80
      let fogFar = weatherSettings.fogIntensity * 1000
      
      switch(weather) {
        case 'fog':
          fogNear = 15  // 濃霧，能見度很低
          fogFar = 200
          break
        case 'mist':
          fogNear = 30  // 薄霧，能見度低
          fogFar = 400
          break
        case 'rain':
        case 'drizzle':
          fogNear = 50  // 雨天降低能見度
          fogFar = 500
          break
        case 'storm':
          fogNear = 25  // 暴風雨能見度很差
          fogFar = 300
          break
        case 'snow':
          fogNear = 40  // 雪天輕微影響能見度
          fogFar = 600
          break
        case 'windy':
          fogNear = 120 // 大風吹散霧氣，能見度極佳
          fogFar = 1200 // 比晴天看得更遠
          break
        default:
          fogNear = 100 // 晴天能見度佳
          fogFar = 1000
      }
      
      state.scene.fog.near = fogNear
      state.scene.fog.far = fogFar
    }
  })

  // 根據天氣調整環境光顏色
  const getWeatherAmbientColor = () => {
    const baseColor = timeOfDay === 'day' ? "#FFFFFF" : "#6495ED"
    
    switch(weather) {
      case 'rain':
      case 'drizzle':
        return timeOfDay === 'day' ? "#B0C4DE" : "#4682B4" // 藍灰色調
      case 'storm':
        return timeOfDay === 'day' ? "#708090" : "#2F4F4F" // 暗灰色調
      case 'fog':
      case 'mist':
        return timeOfDay === 'day' ? "#F5F5DC" : "#D3D3D3" // 米色/淺灰調
      case 'snow':
        return timeOfDay === 'day' ? "#F0F8FF" : "#E6E6FA" // 偏冷白色
      case 'windy':
        return timeOfDay === 'day' ? "#F0F8FF" : "#87CEEB" // 大風時天空清澈明亮
      default:
        return baseColor
    }
  }

  // 根據天氣調整太陽光顏色
  const getWeatherSunColor = () => {
    const baseColor = currentSettings.sunColor
    
    switch(weather) {
      case 'rain':
      case 'drizzle':
        return 'B0C4DE' // 淡藍色
      case 'storm':
        return '778899' // 淡石板灰
      case 'fog':
      case 'mist':
        return 'F5DEB3' // 小麥色
      case 'snow':
        return 'F0F8FF' // 愛麗絲藍
      case 'windy':
        return 'FFFFFF' // 大風天陽光更純淨
      default:
        return baseColor
    }
  }

  return (
    <>
      {/* 動態環境光 - 根據天氣調整顏色 */}
      <ambientLight 
        color={getWeatherAmbientColor()} 
        intensity={(currentSettings.ambientIntensity * weatherSettings.lightMultiplier) + (weather === 'storm' && lightningActive ? lightningIntensity : 0)} 
      />
      
      {/* 主要太陽光/月光 - 根據天氣調整顏色 */}
      <directionalLight
        position={currentSettings.sunPosition}
        color={'#' + getWeatherSunColor()}
        intensity={(currentSettings.sunIntensity * weatherSettings.lightMultiplier) + (weather === 'storm' && lightningActive ? lightningIntensity * 0.5 : 0)}
        castShadow={timeOfDay === 'day'}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-near={0.1}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      
      {/* 天空半球光 - 提供整體照明 */}
      <hemisphereLight
        color={timeOfDay === 'day' ? "#87CEEB" : "#5A5A8B"} // 天空色
        groundColor={timeOfDay === 'day' ? "#DEB887" : "#2E2E5C"} // 地面色
        intensity={timeOfDay === 'day' ? 1.5 : 0.4} // 大幅增強白天半球光
      />
      
      {/* 白天額外的全域照明系統 */}
      {timeOfDay === 'day' && (
        <>
          {/* 主要填充光 - 消除陰影區域 */}
          <directionalLight
            position={[-currentSettings.sunPosition[0], currentSettings.sunPosition[1] * 0.5, -currentSettings.sunPosition[2]]}
            color="#E6F3FF"
            intensity={0.8 * weatherSettings.lightMultiplier}
            castShadow={false}
          />
          
          {/* 地面反射光 - 從下方提供照明 */}
          <directionalLight
            position={[0, -30, 0]}
            color="#F5F5DC" // 米色反射光
            intensity={0.4 * weatherSettings.lightMultiplier}
            castShadow={false}
          />
          
          {/* 側面補充光 - 確保側面也有照明 */}
          <directionalLight
            position={[80, 30, 50]}
            color="#F0F8FF" // 淡藍白光
            intensity={0.5 * weatherSettings.lightMultiplier}
            castShadow={false}
          />
          
          <directionalLight
            position={[-80, 30, -50]}
            color="#F0F8FF"
            intensity={0.5 * weatherSettings.lightMultiplier}
            castShadow={false}
          />
          
          {/* 額外的環境光增強 */}
          <ambientLight 
            color="#FFFFFF" 
            intensity={0.3 * weatherSettings.lightMultiplier} 
          />
        </>
      )}
    </>
  )
}

// 天空盒組件 - 現在由EnvironmentLighting處理
export const DynamicSky = () => {
  // 移除重複的背景設置，讓EnvironmentLighting全權處理
  return null
}