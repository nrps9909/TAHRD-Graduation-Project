import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore, TIME_SETTINGS, WEATHER_SETTINGS, WeatherType } from '@/stores/timeStore'

export const EnvironmentLighting = () => {
  const { weather, timeOfDay, hour, minute } = useTimeStore()
  const weatherSettings = WEATHER_SETTINGS[weather]
  const timeSettings = TIME_SETTINGS[timeOfDay]
  
  // 可愛的閃爍效果狀態
  const [sparkleIntensity, setSparkleIntensity] = useState(1)
  const sparkleTimer = useRef(0)
  
  // 計算太陽位置（類似月亮系統）
  const calculateSunPosition = React.useCallback((currentHour: number, currentMinute: number): [number, number, number] => {
    // 將時間轉換為精確的小時數（包含分鐘）
    const preciseHour = currentHour + currentMinute / 60
    
    // 白天時間範圍 6:00-18:00
    let dayProgress = 0
    
    if (preciseHour >= 6 && preciseHour <= 18) {
      // 6:00-18:00 的部分，12小時白天
      dayProgress = (preciseHour - 6) / 12 // 從6點開始，12小時白天
    } else {
      // 夜晚時間，太陽在地平線下
      dayProgress = preciseHour < 6 ? 0 : 1 // 早晨6點前或傍晚18點後
    }
    
    // 太陽軌道參數 - 更高的天空半圓形軌道
    const orbitRadius = 300 // 軌道半徑（與月亮相同）
    const orbitHeight = 450 // 軌道高度基準（沿天空半圓形上方）
    const orbitDepth = 100   // 軌道深度變化（與月亮相同）
    
    // 太陽沿弧形軌道移動 (從東到西)
    const angle = dayProgress * Math.PI // 0 到 π 的弧度
    
    // 計算位置 - 正午時太陽位於天頂正中央
    const x = 0 // 正午時固定在正中央，其他時間可以有輕微偏移
    const y = orbitHeight + orbitRadius * Math.sin(angle) * 0.8 // 弧形高度，正午時達到最高點
    const z = 0 // 正午時固定在正中央
    
    return [x, y, z]
  }, [])
  
  // 獲取當前太陽位置
  const sunPosition = calculateSunPosition(hour, minute)
  
  // 調試：輸出太陽軌道資訊 (可移除)
  React.useEffect(() => {
    if (timeOfDay === 'day') {
      const preciseHour = hour + minute / 60
      let dayProgress = 0
      
      if (preciseHour >= 6 && preciseHour <= 18) {
        dayProgress = (preciseHour - 6) / 12
      }
      
      console.log(`☀️ 太陽位置 - 時間: ${hour}:${minute.toString().padStart(2, '0')}, 軌道進度: ${(dayProgress * 100).toFixed(1)}%, 位置: [${sunPosition.map(p => p.toFixed(1)).join(', ')}]`)
    }
  }, [hour, minute, sunPosition, timeOfDay])

  // 可愛的動態效果和背景設置（無過渡效果）
  useFrame((state, delta) => {
    // 可愛的閃爍效果（僅晴天）
    if (weatherSettings.sparkleEffect) {
      sparkleTimer.current += delta
      setSparkleIntensity(1 + Math.sin(sparkleTimer.current * 2) * 0.1)
    } else {
      setSparkleIntensity(1)
    }
    
    // 設置動森風格的背景色
    if (timeSettings.backgroundColor) {
      let bgColor = new THREE.Color(timeSettings.backgroundColor)
      
      // 根據天氣微調背景色
      if (weather === 'drizzle') {
        bgColor.multiplyScalar(0.95) // 細雨時稍微柔和
      }
      
      // 設置背景色
      state.scene.background = bgColor
    }
    
    // 動森風格的霧效設置 - 減少對天空的影響
    if (timeSettings.fogColor) {
      if (!state.scene.fog) {
        state.scene.fog = new THREE.Fog(timeSettings.fogColor, 200, 1200) // 更遠的霧效，減少天空影響
      } else {
        // 設置霧的顏色
        state.scene.fog.color.setStyle(timeSettings.fogColor)
        
        // 根據時間和天氣設置霧的距離 - 都調遠一些
        let fogNear = timeOfDay === 'day' ? 200 : 250 // 霧效更遠，不影響天空
        let fogFar = weatherSettings.fogIntensity * (timeOfDay === 'day' ? 1200 : 1000)
        
        switch(weather) {
          case 'drizzle':
            fogNear = timeOfDay === 'day' ? 180 : 220
            fogFar = timeOfDay === 'day' ? 1000 : 800
            break
          case 'clear':
          default:
            fogNear = timeOfDay === 'day' ? 220 : 250
            fogFar = timeOfDay === 'day' ? 1400 : 1000
        }
        
        state.scene.fog.near = fogNear
        state.scene.fog.far = fogFar
      }
    }
  })

  // 可愛風格的環境光顏色 - 減少對天空的影響
  const getWeatherAmbientColor = () => {
    const baseColor = timeOfDay === 'day' ? "#F0F8FF" : "#B0E0E6" // 淡藍白/更亮夜晚粉水藍
    
    switch(weather) {
      case 'drizzle':
        return timeOfDay === 'day' ? "#E6F3FF" : "#87CEEB" // 明亮淺藍/天藍色
      case 'clear':
      default:
        return baseColor
    }
  }

  // 可愛風格的太陽/月光顏色
  const getWeatherSunColor = () => {
    const baseColor = timeSettings.sunColor || '#FFFFFF'
    
    switch(weather) {
      case 'drizzle':
        return timeOfDay === 'day' ? '#D6EBFF' : '#B0E0E6' // 更深淺藍/更亮粉水藍
      case 'clear':
      default:
        return baseColor
    }
  }

  return (
    <>
      {/* 可愛風格的主要環境光 */}
      <ambientLight 
        color={getWeatherAmbientColor()} 
        intensity={(timeSettings.ambientIntensity * weatherSettings.lightMultiplier * sparkleIntensity)}
      />
      
      {/* 主要太陽光/月光 - 動態位置系統 */}
      <directionalLight
        position={timeOfDay === 'day' ? sunPosition : timeSettings.sunPosition}
        color={getWeatherSunColor()}
        intensity={(timeSettings.sunIntensity * weatherSettings.lightMultiplier * sparkleIntensity)}
        castShadow={timeOfDay === 'day'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={300}
        shadow-camera-near={1}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* 可愛的天空半球光 */}
      <hemisphereLight
        color={timeOfDay === 'day' ? "#87CEEB" : "#B0E0E6"} // 天空藍色 / 更亮夜晚粉水藍
        groundColor={timeOfDay === 'day' ? "#FFF8DC" : "#87CEEB"} // 古董白 / 更亮夜空天藍色  
        intensity={timeOfDay === 'day' ? 2.0 : 0.9} // 調亮白天半球光到最亮（從1.2提升到2.0）
      />
      
      {/* 柔和的填充光系統 */}
      <directionalLight
        position={timeOfDay === 'day' ? [-10, 60, 15] : [0, -10, 0]} // 白天更高的填充光位置，配合主光源
        color={timeOfDay === 'day' ? "#FFFFF0" : "#6495ED"} // 象牙白 / 原始月光色
        intensity={timeOfDay === 'day' ? 1.2 * weatherSettings.lightMultiplier : 0.7 * weatherSettings.lightMultiplier} // 調亮白天填充光到最亮（從0.6提升到1.2）
        castShadow={false}
      />
      
      {/* 可愛的補充光（讓一切都明亮可愛）*/}
      <pointLight
        position={[0, 90, 0]} // 正上方的補充光位置
        color={timeOfDay === 'day' ? "#FFFAF0" : "#6495ED"} // 花白色 / 原始月光色
        intensity={timeOfDay === 'day' ? 1.0 * weatherSettings.lightMultiplier * sparkleIntensity : 0.5 * weatherSettings.lightMultiplier * sparkleIntensity} // 調亮白天補充光到最亮（從0.5提升到1.0）
        distance={250} // 更大的照射範圍
        decay={1.8} // 減少衰減，讓光線傳播更遠
      />
      
      {/* 太陽白光照射效果 - 讓3D模型有被陽光直射的感覺 */}
      {timeOfDay === 'day' && weather === 'clear' && (
        <>
          {/* 強烈的太陽白光 - 主要照射光源 */}
          <directionalLight
            position={sunPosition}
            color="#FFFFFF" // 純白太陽光
            intensity={3.5 * sparkleIntensity} // 非常強烈的光線
            castShadow={true} // 產生清晰陰影增強立體感
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={500}
            shadow-camera-near={0.5}
            shadow-camera-left={-150}
            shadow-camera-right={150}
            shadow-camera-top={150}
            shadow-camera-bottom={-150}
          />
          
          {/* 太陽高光效果 - 產生物體表面的白光反射 */}
          <directionalLight
            position={[sunPosition[0] * 0.9, sunPosition[1] * 1.1, sunPosition[2] * 0.9]} // 略微偏移
            color="#FFFFF0" // 極亮的象牙白
            intensity={2.8 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 邊緣光效果 - 模擬物體邊緣的太陽反光 */}
          <directionalLight
            position={[sunPosition[0] * 1.2, sunPosition[1] * 0.8, sunPosition[2] * 1.1]}
            color="#FEFEFE" // 接近純白
            intensity={2.2 * sparkleIntensity}
            castShadow={false}
          />
        </>
      )}
      
      {/* 細雨天的柔和白光 */}
      {timeOfDay === 'day' && weather === 'drizzle' && (
        <directionalLight
          position={sunPosition}
          color="#F8F8FF" // 柔和的白色帶一點藍調
          intensity={1.5 * sparkleIntensity} // 增強一些，讓模型也有白光感
          castShadow={true}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
      )}

      {/* 夜晚月光灑落大地效果 */}
      {timeOfDay === 'night' && (
        <>
          {/* 主要月光 - 從月亮位置灑下的銀色光芒 */}
          <directionalLight
            position={timeSettings.sunPosition} // 使用夜晚的月亮位置
            color="#E6F3FF" // 清冷的月光藍白色
            intensity={1.8 * sparkleIntensity} // 強烈的月光
            castShadow={true}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={300}
            shadow-camera-near={1}
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
          />
          
          {/* 月光高光效果 - 物體表面的月光反射 */}
          <directionalLight
            position={[timeSettings.sunPosition[0] * 0.8, timeSettings.sunPosition[1] * 1.2, timeSettings.sunPosition[2] * 1.1]}
            color="#F0F8FF" // 淡藍月光白
            intensity={1.2 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 月光邊緣光 - 營造朦朧的夜晚輪廓 */}
          <directionalLight
            position={[timeSettings.sunPosition[0] * 1.3, timeSettings.sunPosition[1] * 0.9, timeSettings.sunPosition[2] * 0.7]}
            color="#E0E6FF" // 更深的月光藍
            intensity={0.8 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 地面月光反射 - 模擬月光在地面的柔和反射 */}
          <directionalLight
            position={[0, -20, 0]} // 從下方向上照射，模擬地面反光
            color="#D6E3FF" // 柔和的反射月光
            intensity={0.4 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 大範圍月光氛圍 - 整體夜晚氛圍光 */}
          <pointLight
            position={[0, 100, 0]} // 高空位置
            color="#E6F0FF" // 夜空月光色
            intensity={1.0 * sparkleIntensity}
            distance={300} // 大範圍照射
            decay={1.5}
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