import { useMemo } from 'react'
import { Sky as DreiSky } from '@react-three/drei'
import { useEnvironmentStore } from '../../stores/environmentStore'

/**
 * 自然天空系統 - 清新的藍天
 *
 * 設計理念：
 * 1. 清新的天藍色 - 平衡的 Rayleigh 散射值
 * 2. 清澈的大氣 - 低濁度，高透明度
 * 3. 自然的光照 - 與海面反射協調
 * 4. 動態適應 - 根據時間自動調整
 */
export function NaturalSky() {
  const { sunPosition } = useEnvironmentStore()

  // 根據時間計算天空參數
  const skyParams = useMemo(() => {
    const hour = 12 // Default to midday for now
    const isDawn = hour >= 5 && hour < 7
    const isDay = hour >= 7 && hour < 17
    const isDusk = hour >= 17 && hour < 19

    // 白天 - 清新的藍天（動物森友會風格）
    if (isDay) {
      return {
        turbidity: 0.5,        // 極清澈的大氣層
        rayleigh: 3.0,         // 高瑞利散射 = 深藍色天空
        mieCoefficient: 0.001, // 極少 Mie 散射
        mieDirectionalG: 0.8,  // 適度前向散射
      }
    }

    // 黎明 - 粉橙色天空
    if (isDawn) {
      return {
        turbidity: 1.5,
        rayleigh: 1.0,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.65,
      }
    }

    // 黃昏 - 溫暖的橙紅色
    if (isDusk) {
      return {
        turbidity: 2.5,
        rayleigh: 0.8,
        mieCoefficient: 0.008,
        mieDirectionalG: 0.6,
      }
    }

    // 夜晚 - 深藍夜空
    return {
      turbidity: 0.3,
      rayleigh: 3.5,
      mieCoefficient: 0.0005,
      mieDirectionalG: 0.9,
    }
  }, [])

  return (
    <DreiSky
      distance={450000}
      sunPosition={[
        sunPosition.position.x / 10,
        sunPosition.position.y / 10,
        sunPosition.position.z / 10
      ]}
      inclination={0.49}
      azimuth={0.25}
      mieCoefficient={skyParams.mieCoefficient}
      mieDirectionalG={skyParams.mieDirectionalG}
      rayleigh={skyParams.rayleigh}
      turbidity={skyParams.turbidity}
    />
  )
}
