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
    <div className="absolute top-3 right-3 md:top-4 md:right-4">
      {/* 精簡動森風格玻璃面板 */}
      <div
        className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 248, 231, 0.5) 0%, rgba(255, 243, 224, 0.4) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1.5px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 4px 16px 0 rgba(139, 92, 46, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
        }}
      >
        {/* 頂部光澤 */}
        <div
          className="absolute inset-0 rounded-xl md:rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, transparent 35%)',
          }}
        />

        {/* 緊湊內容區域 */}
        <div className="relative p-2.5 md:p-3 min-w-[140px] md:min-w-[160px]">
          <div className="flex flex-col gap-2">
            {/* 時間 - 水平緊湊布局 */}
            <div className="flex items-center gap-2">
              <div
                className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-lg"
                style={{
                  background: isNight
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.3) 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
              >
                {isNight ? '🌙' : '☀️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg md:text-xl font-black leading-tight" style={{
                  color: '#5D3A1A',
                  textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                }}>
                  {timeString}
                </div>
                <div className="text-[9px] md:text-[10px] font-semibold" style={{ color: '#A67C52' }}>
                  {isNight ? '夜晚' : '白天'}
                </div>
              </div>
            </div>

            {/* 分隔線 */}
            <div
              className="h-[1px] rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 46, 0.25), transparent)',
              }}
            />

            {/* 天氣 */}
            <div>
              {weatherLoading ? (
                <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-xs font-semibold py-1" style={{ color: '#8B5C2E' }}>
                  <div className="animate-spin text-sm">⏳</div>
                  <span>載入中</span>
                </div>
              ) : weather ? (
                <>
                  {/* 天氣主要資訊 - 橫向緊湊 */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:text-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.3) 0%, rgba(96, 165, 250, 0.2) 100%)',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {getWeatherIcon(weather.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] md:text-xs font-bold leading-tight" style={{ color: '#5D3A1A' }}>
                        {weatherNames[weather.type]}
                      </div>
                      <div className="text-xl md:text-2xl font-black leading-tight" style={{
                        color: '#3B82F6',
                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                      }}>
                        {weather.temperature.toFixed(1)}°
                      </div>
                    </div>
                  </div>

                  {/* 位置標籤 - 更小巧 */}
                  {userLocation && (
                    <div
                      className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full mb-1.5 text-[9px] md:text-[10px] font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(134, 239, 172, 0.35) 0%, rgba(74, 222, 128, 0.25) 100%)',
                        color: '#166534',
                        boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <span className="text-[10px]">📍</span>
                      <span className="truncate max-w-[90px]">{weather.location}</span>
                    </div>
                  )}

                  {/* 詳細資訊 - 更緊湊 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className="flex items-center gap-1 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg md:rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.2) 0%, rgba(191, 219, 254, 0.15) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <span className="text-sm md:text-base">💧</span>
                      <div>
                        <div className="text-[8px] md:text-[9px] font-semibold leading-tight" style={{ color: '#8B5C2E' }}>濕度</div>
                        <div className="text-[10px] md:text-xs font-bold leading-tight" style={{ color: '#3B82F6' }}>{weather.humidity}%</div>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg md:rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(196, 181, 253, 0.2) 0%, rgba(221, 214, 254, 0.15) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <span className="text-sm md:text-base">💨</span>
                      <div>
                        <div className="text-[8px] md:text-[9px] font-semibold leading-tight" style={{ color: '#8B5C2E' }}>風速</div>
                        <div className="text-[10px] md:text-xs font-bold leading-tight" style={{ color: '#7C3AED' }}>{weather.windSpeed.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 定位提示 - 更小巧 */}
                  {weather.location === '未知位置' && (
                    <div
                      className="mt-1.5 px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-semibold flex items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(252, 211, 77, 0.15) 100%)',
                        color: '#92400E',
                        boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <span className="text-[10px]">💡</span>
                      <span className="hidden md:inline">允許定位以顯示位置</span>
                      <span className="md:hidden">允許定位</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] md:text-xs font-semibold text-center py-1" style={{ color: '#8B5C2E' }}>
                  載入中...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部光暈 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(251, 191, 36, 0.1), transparent)',
          }}
        />
      </div>
    </div>
  )
}
