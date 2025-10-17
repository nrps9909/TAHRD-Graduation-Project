/**
 * 天氣效果渲染組件
 *
 * 支援的天氣效果：
 * - 雨天：粒子系統模擬雨滴
 * - 雪天：粒子系統模擬雪花
 * - 霧天：調整場景霧效
 * - 暴風雨：增強雨效和閃電
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEnvironmentStore } from '../../stores/environmentStore'
import * as THREE from 'three'

/**
 * 雨效果組件
 */
export function RainEffect({ intensity = 1 }: { intensity?: number }) {
  const rainRef = useRef<THREE.Points>(null)

  // 創建雨滴粒子
  const rainParticles = useMemo(() => {
    const particleCount = 5000 * intensity
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      // 在場景上方隨機分布
      positions[i * 3] = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = Math.random() * 150 + 50
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200

      // 隨機下落速度
      velocities[i] = Math.random() * 0.5 + 0.5
    }

    return { positions, velocities }
  }, [intensity])

  // 更新雨滴位置
  useFrame(() => {
    if (!rainRef.current) return

    const positions = rainRef.current.geometry.attributes.position.array as Float32Array
    const { velocities } = rainParticles

    for (let i = 0; i < positions.length / 3; i++) {
      // 雨滴下落
      positions[i * 3 + 1] -= velocities[i] * 2

      // 如果落到地面，重置到頂部
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 150 + Math.random() * 50
      }
    }

    rainRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={rainParticles.positions.length / 3}
          array={rainParticles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        color="#a0c4ff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

/**
 * 雪效果組件
 */
export function SnowEffect({ intensity = 1 }: { intensity?: number }) {
  const snowRef = useRef<THREE.Points>(null)

  // 創建雪花粒子
  const snowParticles = useMemo(() => {
    const particleCount = 3000 * intensity
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 2) // x和y方向的速度

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = Math.random() * 150 + 50
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200

      // 雪花下落較慢，並有橫向漂移
      velocities[i * 2] = (Math.random() - 0.5) * 0.2     // x方向
      velocities[i * 2 + 1] = Math.random() * 0.1 + 0.1   // y方向
    }

    return { positions, velocities }
  }, [intensity])

  // 更新雪花位置
  useFrame(({ clock }) => {
    if (!snowRef.current) return

    const positions = snowRef.current.geometry.attributes.position.array as Float32Array
    const { velocities } = snowParticles
    const time = clock.getElapsedTime()

    for (let i = 0; i < positions.length / 3; i++) {
      // 雪花下落並橫向飄動
      positions[i * 3] += velocities[i * 2] + Math.sin(time + i) * 0.01
      positions[i * 3 + 1] -= velocities[i * 2 + 1]

      // 重置到頂部
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 150 + Math.random() * 50
        positions[i * 3] = (Math.random() - 0.5) * 200
      }

      // 防止飄太遠
      if (Math.abs(positions[i * 3]) > 100) {
        positions[i * 3] = (Math.random() - 0.5) * 200
      }
    }

    snowRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={snowRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={snowParticles.positions.length / 3}
          array={snowParticles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.8}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

/**
 * 霧效果組件
 */
export function FogEffect({ density = 0.01 }: { density?: number }) {
  useFrame(({ scene }) => {
    // 動態調整場景霧效
    if (!scene.fog) {
      scene.fog = new THREE.Fog('#c8d8e4', 50, 400)
    }

    const fog = scene.fog as THREE.Fog
    // 根據濃度調整可見距離
    fog.near = 50 * (1 - density)
    fog.far = 400 * (1 - density * 0.5)
  })

  return null
}

/**
 * 主天氣系統組件 - 根據天氣類型自動渲染對應效果
 */
export function WeatherSystem() {
  const { weather } = useEnvironmentStore()

  if (!weather) return null

  const { type } = weather

  return (
    <group name="weather-system">
      {/* 雨天效果 */}
      {type === 'rainy' && <RainEffect intensity={1} />}

      {/* 暴風雨效果 */}
      {type === 'stormy' && (
        <>
          <RainEffect intensity={2} />
          <FogEffect density={0.02} />
        </>
      )}

      {/* 雪天效果 */}
      {type === 'snowy' && <SnowEffect intensity={1} />}

      {/* 霧天效果 */}
      {type === 'foggy' && <FogEffect density={0.05} />}
    </group>
  )
}

/**
 * 天氣資訊顯示組件（UI覆蓋層）
 */
export function WeatherInfo() {
  const { weather, gameTime, isNight, userLocation, weatherLoading } = useEnvironmentStore()

  // 格式化遊戲時間
  const hours = Math.floor(gameTime)
  const minutes = Math.floor((gameTime % 1) * 60)
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  // 天氣類型中文對照
  const weatherNames: Record<string, string> = {
    'clear': '晴天',
    'cloudy': '多雲',
    'rainy': '雨天',
    'stormy': '暴風雨',
    'snowy': '雪天',
    'foggy': '霧天',
    'partly-cloudy': '局部多雲'
  }

  // 天氣圖標
  const getWeatherIcon = (type: string) => {
    const icons: Record<string, string> = {
      'clear': '☀️',
      'cloudy': '☁️',
      'rainy': '🌧️',
      'stormy': '⛈️',
      'snowy': '❄️',
      'foggy': '🌫️',
      'partly-cloudy': '⛅'
    }
    return icons[type] || '🌤️'
  }

  return (
    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-6 md:right-6">
      {/* 動森風格玻璃面板 */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 248, 231, 0.45) 0%, rgba(255, 243, 224, 0.35) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px 0 rgba(139, 92, 46, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
        }}
      >
        {/* 可愛的裝飾邊框 */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, transparent 40%, rgba(139, 92, 46, 0.03) 100%)',
          }}
        />

        {/* 內容區域 */}
        <div className="relative p-3 sm:p-4 md:p-5 min-w-[160px] sm:min-w-[200px] md:min-w-[220px]">
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
            {/* 時間顯示 - 動森風格 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl md:text-2xl"
                style={{
                  background: isNight
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.3) 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                {isNight ? '🌙' : '☀️'}
              </div>
              <div className="flex-1">
                <div className="text-[10px] sm:text-xs font-bold" style={{ color: '#8B5C2E' }}>當前時間</div>
                <div className="text-xl sm:text-2xl font-black" style={{
                  color: '#5D3A1A',
                  textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                }}>
                  {timeString}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold" style={{ color: '#A67C52' }}>
                  {isNight ? '🌟 夜晚' : '🌤️ 白天'}
                </div>
              </div>
            </div>

            {/* 分隔線 - 動森風格 */}
            <div
              className="h-[2px] rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 46, 0.3), transparent)',
              }}
            />

            {/* 天氣顯示 */}
            <div>
              {weatherLoading ? (
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold" style={{ color: '#8B5C2E' }}>
                  <div className="animate-spin text-base sm:text-xl">⏳</div>
                  <span>載入中...</span>
                </div>
              ) : weather ? (
                <>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div
                      className="flex-shrink-0 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.3) 0%, rgba(96, 165, 250, 0.2) 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {getWeatherIcon(weather.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm font-bold" style={{ color: '#5D3A1A' }}>
                        {weatherNames[weather.type] || weather.description}
                      </div>
                      <div className="text-2xl sm:text-3xl font-black" style={{
                        color: '#3B82F6',
                        textShadow: '0 2px 4px rgba(255, 255, 255, 0.8)'
                      }}>
                        {weather.temperature.toFixed(1)}°
                      </div>
                    </div>
                  </div>

                  {/* 位置資訊 - 動森風格標籤 */}
                  {userLocation && (
                    <div
                      className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full mb-2 sm:mb-3 text-[10px] sm:text-xs font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(134, 239, 172, 0.4) 0%, rgba(74, 222, 128, 0.3) 100%)',
                        color: '#166534',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <span className="text-xs sm:text-sm">📍</span>
                      <span className="truncate max-w-[120px]">{weather.location}</span>
                    </div>
                  )}

                  {/* 詳細資訊 - 動森風格卡片 */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <div
                      className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.25) 0%, rgba(191, 219, 254, 0.2) 100%)',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <span className="text-base sm:text-lg">💧</span>
                      <div>
                        <div className="text-[10px] sm:text-xs font-semibold" style={{ color: '#8B5C2E' }}>濕度</div>
                        <div className="text-xs sm:text-sm font-bold" style={{ color: '#3B82F6' }}>{weather.humidity}%</div>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(196, 181, 253, 0.25) 0%, rgba(221, 214, 254, 0.2) 100%)',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <span className="text-base sm:text-lg">💨</span>
                      <div>
                        <div className="text-[10px] sm:text-xs font-semibold" style={{ color: '#8B5C2E' }}>風速</div>
                        <div className="text-xs sm:text-sm font-bold" style={{ color: '#7C3AED' }}>{weather.windSpeed.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 提示訊息 - 手機端縮小 */}
                  {weather.location === '未知位置' && (
                    <div
                      className="mt-2 sm:mt-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 sm:gap-2"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(252, 211, 77, 0.2) 100%)',
                        color: '#92400E',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <span className="text-xs sm:text-sm">💡</span>
                      <span className="hidden sm:inline">允許定位以顯示你的位置</span>
                      <span className="sm:hidden">允許定位</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs sm:text-sm font-semibold text-center" style={{ color: '#8B5C2E' }}>
                  天氣資料載入中...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部裝飾光暈 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(251, 191, 36, 0.15), transparent)',
          }}
        />
      </div>
    </div>
  )
}
