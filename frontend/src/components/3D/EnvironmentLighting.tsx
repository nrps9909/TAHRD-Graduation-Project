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
      } else if (weather === 'snow') {
        // 太陽雪：厚厚雲層中透出金光的天空
        bgColor = timeOfDay === 'day' 
          ? new THREE.Color('#C0C8D0').lerp(new THREE.Color('#FFE4B5'), 0.15) // 白天太陽雪：雲層中透金光
          : new THREE.Color('#708090') // 夜晚下雪：石板灰色
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
          case 'snow':
            // 雪天使用正常霧效設置
            fogNear = timeOfDay === 'day' ? 220 : 250
            fogFar = timeOfDay === 'day' ? 1400 : 1000
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
      case 'snow':
        return timeOfDay === 'day' ? "#F8FAFF" : "#E0F0FF" // 雪白柔光/淡藍雪光
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
      case 'snow':
        return timeOfDay === 'day' ? '#F0F8FF' : '#C8E6FF' // 柔和雪光/冷藍月光
      case 'clear':
      default:
        return baseColor
    }
  }

  // 統一的天空和地面顏色
  const getHemisphereLightColors = () => {
    return {
      sky: timeOfDay === 'day' ? "#87CEEB" : "#E8F4FF", // 天空藍色 / 夜晚月光色
      ground: timeOfDay === 'day' ? "#FFF8DC" : "#F0F8FF" // 古董白 / 夜晚潔白地面色
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
        color={getHemisphereLightColors().sky}
        groundColor={getHemisphereLightColors().ground}
        intensity={timeOfDay === 'day' ? 2.0 : 1.8} // 提高夜晚半球光強度
      />
      
      {/* 柔和的填充光系統 */}
      <directionalLight
        position={timeOfDay === 'day' ? [-10, 60, 15] : [0, -10, 0]} // 白天更高的填充光位置，配合主光源
        color={
          weather === 'snow' && timeOfDay === 'day' 
            ? "#E6E6FA" // 下雪天用淡紫色
            : timeOfDay === 'day' ? "#FFFFF0" : "#6495ED" // 象牙白 / 原始月光色
        }
        intensity={
          weather === 'snow' && timeOfDay === 'day'
            ? 0.8 * weatherSettings.lightMultiplier // 下雪天降低填充光強度
            : timeOfDay === 'day' ? 1.2 * weatherSettings.lightMultiplier : 0.7 * weatherSettings.lightMultiplier
        }
        castShadow={weather === 'snow' ? false : false} // 下雪天不投射陰影
      />
      
      {/* 可愛的補充光（讓一切都明亮可愛）*/}
      <pointLight
        position={[0, 90, 0]} // 正上方的補充光位置
        color={
          weather === 'snow' && timeOfDay === 'day'
            ? "#F0F8FF" // 下雪天用愛麗絲藍
            : timeOfDay === 'day' ? "#FFFAF0" : "#6495ED" // 花白色 / 原始月光色
        }
        intensity={
          weather === 'snow' && timeOfDay === 'day'
            ? 0.6 * weatherSettings.lightMultiplier * sparkleIntensity // 下雪天降低補充光強度
            : timeOfDay === 'day' ? 1.0 * weatherSettings.lightMultiplier * sparkleIntensity : 0.5 * weatherSettings.lightMultiplier * sparkleIntensity
        }
        distance={250} // 更大的照射範圍
        decay={1.8} // 減少衰減，讓光線傳播更遠
      />
      
      {/* 白天全域白光籠罩效果 - 下雪時不顯示強烈陽光 */}
      {timeOfDay === 'day' && weather !== 'snow' && (
        <>
          {/* 主要太陽白光 - 從太陽位置的強烈照射 */}
          <directionalLight
            position={sunPosition}
            color="#FFFFFF" // 純白太陽光
            intensity={weather === 'clear' ? 4.0 * sparkleIntensity : 3.0 * sparkleIntensity} // 晴天更亮
            castShadow={true}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={500}
            shadow-camera-near={0.5}
            shadow-camera-left={-150}
            shadow-camera-right={150}
            shadow-camera-top={150}
            shadow-camera-bottom={-150}
          />
          
          {/* 全方位白光包圍 - 東南西北四個方向的白光 */}
          <directionalLight
            position={[100, 80, 0]} // 東方
            color="#FFFEF7"
            intensity={1.8 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[-100, 80, 0]} // 西方
            color="#FFFEF7"
            intensity={1.8 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[0, 80, 100]} // 南方
            color="#FFFEF7"
            intensity={1.8 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[0, 80, -100]} // 北方
            color="#FFFEF7"
            intensity={1.8 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 頂部全域白光 - 從上方灑下的全面照明 */}
          <pointLight
            position={[0, 150, 0]}
            color="#FFFFFF"
            intensity={3.0 * sparkleIntensity}
            distance={400}
            decay={1.0} // 減少衰減，讓光線更均勻
          />
          
          {/* 多角度補充白光 */}
          <directionalLight
            position={[sunPosition[0] * 0.7, sunPosition[1] * 1.3, sunPosition[2] * 0.8]}
            color="#FFFFF0"
            intensity={2.5 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[sunPosition[0] * 1.4, sunPosition[1] * 0.9, sunPosition[2] * 1.2]}
            color="#FEFEFE"
            intensity={2.0 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 地面反射白光陣列 - 模擬地面全方位反射 */}
          <pointLight
            position={[50, 10, 50]}
            color="#F8F8FF"
            intensity={1.5 * sparkleIntensity}
            distance={200}
            decay={1.2}
          />
          <pointLight
            position={[-50, 10, 50]}
            color="#F8F8FF"
            intensity={1.5 * sparkleIntensity}
            distance={200}
            decay={1.2}
          />
          <pointLight
            position={[50, 10, -50]}
            color="#F8F8FF"
            intensity={1.5 * sparkleIntensity}
            distance={200}
            decay={1.2}
          />
          <pointLight
            position={[-50, 10, -50]}
            color="#F8F8FF"
            intensity={1.5 * sparkleIntensity}
            distance={200}
            decay={1.2}
          />
          
          {/* 空氣中的散射白光 - 模擬陽光在大氣中的散射 */}
          <pointLight
            position={[30, 60, 30]}
            color="#FFFFFE"
            intensity={1.2 * sparkleIntensity}
            distance={250}
            decay={1.3}
          />
          <pointLight
            position={[-30, 60, 30]}
            color="#FFFFFE"
            intensity={1.2 * sparkleIntensity}
            distance={250}
            decay={1.3}
          />
          <pointLight
            position={[30, 60, -30]}
            color="#FFFFFE"
            intensity={1.2 * sparkleIntensity}
            distance={250}
            decay={1.3}
          />
          <pointLight
            position={[-30, 60, -30]}
            color="#FFFFFE"
            intensity={1.2 * sparkleIntensity}
            distance={250}
            decay={1.3}
          />
        </>
      )}
      
      {/* 太陽雪天氣專用光照 - 雲縫中的金色陽光穿透雪花 */}
      {weather === 'snow' && timeOfDay === 'day' && (
        <>
          {/* 主要雲層漫射光 - 厚厚雲層的柔和基礎光照 */}
          <directionalLight
            position={[0, 100, 0]} // 正上方雲層光
            color="#E6E6FA" // 淡紫色雲層光
            intensity={1.8 * weatherSettings.lightMultiplier}
            castShadow={false}
          />
          
          {/* 太陽雪特效 - 雲縫中的金色陽光束 */}
          <directionalLight
            position={sunPosition} // 使用太陽位置
            color="#FFD700" // 金色陽光
            intensity={2.5 * sparkleIntensity} // 隨閃爍強度變化
            castShadow={true}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={200}
            shadow-camera-near={0.5}
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
          />
          
          {/* 暖光補充 - 陽光在雪花上的反射光 */}
          <pointLight
            position={[sunPosition[0] * 0.3, sunPosition[1] * 0.5, sunPosition[2] * 0.3]}
            color="#FFF8DC" // 淡金色反射光
            intensity={1.8 * sparkleIntensity}
            distance={300}
            decay={1.5}
          />
          
          {/* 環境冷光 - 雪地反射的藍白色光 */}
          <ambientLight
            color="#F0F8FF" // 愛麗絲藍
            intensity={1.2 * weatherSettings.lightMultiplier}
          />
          
          {/* 邊緣暖光勾勒 - 四個角度的金色邊緣光 */}
          <directionalLight
            position={[80, 40, 80]}
            color="#FFEBCD" // 白杏色
            intensity={0.6 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[-80, 40, 80]}
            color="#FFEBCD"
            intensity={0.6 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[80, 40, -80]}
            color="#FFEBCD"
            intensity={0.6 * sparkleIntensity}
            castShadow={false}
          />
          <directionalLight
            position={[-80, 40, -80]}
            color="#FFEBCD"
            intensity={0.6 * sparkleIntensity}
            castShadow={false}
          />
        </>
      )}

      {/* 夜晚月光籠罩大地效果 */}
      {timeOfDay === 'night' && (
        <>
          {/* 主要月光 - 從月亮位置灑下的潔白光芒 */}
          <directionalLight
            position={timeSettings.sunPosition} // 使用夜晚的月亮位置
            color="#F8FAFF" // 更潔白的月光色
            intensity={2.5 * sparkleIntensity} // 增強月光強度
            castShadow={true}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={500}
            shadow-camera-near={1}
            shadow-camera-left={-150}
            shadow-camera-right={150}
            shadow-camera-top={150}
            shadow-camera-bottom={-150}
          />
          
          {/* 月光地面漫射 - 創造潔白大地效果 */}
          <directionalLight
            position={[timeSettings.sunPosition[0], timeSettings.sunPosition[1] - 50, timeSettings.sunPosition[2]]}
            color="#FFFFFF" // 純白月光
            intensity={1.8 * sparkleIntensity}
            castShadow={false}
          />
          
          {/* 全方位月光地面照明 - 360度覆蓋 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2
            const x = Math.cos(angle) * 200
            const z = Math.sin(angle) * 200
            const y = 100 + Math.sin(i * 1.2) * 30
            
            return (
              <directionalLight
                key={`moonlight-ground-${i}`}
                position={[x, y, z]}
                target-position={[0, 0, 0]}
                color="#F0F8FF" // 潔白月光
                intensity={0.8 * sparkleIntensity}
                castShadow={false}
              />
            )
          })}
          
          {/* 月光環境填充 - 確保無死角照明 */}
          <ambientLight
            color="#E8F4FF" // 淡月光色
            intensity={0.6 * sparkleIntensity}
          />
          
          {/* 月光大氣散射效果 - 營造飄渺的月光氛圍 */}
          <pointLight
            position={[0, 120, 0]} // 高空大氣散射點
            color="#FFFFFF" // 純白大氣光
            intensity={1.2 * sparkleIntensity}
            distance={600}
            decay={0.6} // 低衰減讓大氣效果更廣泛
          />
          
          {/* 月光地面反射點 - 模擬月光在地面的反射 */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2
            const radius = 80 + (i % 4) * 25
            const x = Math.cos(angle) * radius
            const z = Math.sin(angle) * radius
            const y = 5 // 接近地面
            
            return (
              <pointLight
                key={`moonlight-reflection-${i}`}
                position={[x, y, z]}
                color="#F8FAFF" // 月光反射色
                intensity={0.5 * sparkleIntensity}
                distance={120}
                decay={1.2}
              />
            )
          })}
          
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