/**
 * CatDebugger - 貓咪模型調試工具
 * 用於測試不同顏色和參數
 */

import { useState } from 'react'
import { AnimatedCat } from './AnimatedCat'
import { Html } from '@react-three/drei'

export function CatDebugger() {
  const [config, setConfig] = useState({
    color: '#FFFFFF',
    ringColor: '#FFFFFF',
    lightColor: '#FFFFFF',
    scale: 1.5,
  })

  const [showPanel, setShowPanel] = useState(false)

  const presets = [
    { name: '小白', color: '#FFFFFF', ringColor: '#FFFFFF', lightColor: '#FFFFFF' },
    { name: '小黑', color: '#2C2C2C', ringColor: '#4A4A4A', lightColor: '#FFD700' },
    { name: '粉紅', color: '#FF69B4', ringColor: '#FFB6C1', lightColor: '#FF1493' },
    { name: '藍色', color: '#4169E1', ringColor: '#87CEEB', lightColor: '#00BFFF' },
    { name: '綠色', color: '#32CD32', ringColor: '#90EE90', lightColor: '#00FF00' },
    { name: '紫色', color: '#9370DB', ringColor: '#DDA0DD', lightColor: '#BA55D3' },
  ]

  return (
    <group>
      {/* 調試用的貓咪 */}
      <AnimatedCat
        position={[0, 1.5, -5]}
        color={config.color}
        name="測試貓咪"
        emoji="🧪"
        ringColor={config.ringColor}
        lightColor={config.lightColor}
        onClick={() => setShowPanel(!showPanel)}
      />

      {/* 調試面板 */}
      {showPanel && (
        <Html position={[0, 3, -5]} center>
          <div
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl"
            style={{
              border: '2px solid #FFB3D9',
              minWidth: '300px',
              pointerEvents: 'auto',
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">🎨 貓咪調試器</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* 顏色選擇 */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  主體顏色
                </label>
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => setConfig({ ...config, color: e.target.value })}
                  className="w-full h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  光環顏色
                </label>
                <input
                  type="color"
                  value={config.ringColor}
                  onChange={(e) => setConfig({ ...config, ringColor: e.target.value })}
                  className="w-full h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  光效顏色
                </label>
                <input
                  type="color"
                  value={config.lightColor}
                  onChange={(e) => setConfig({ ...config, lightColor: e.target.value })}
                  className="w-full h-10 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
              </div>
            </div>

            {/* 預設配色 */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                快速預設
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      setConfig({
                        ...config,
                        color: preset.color,
                        ringColor: preset.ringColor,
                        lightColor: preset.lightColor,
                      })
                    }
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${preset.color}, ${preset.ringColor})`,
                      color: preset.color === '#FFFFFF' ? '#666' : 'white',
                      border: '2px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 當前配置 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-mono text-gray-600">
                color: {config.color}
                <br />
                ring: {config.ringColor}
                <br />
                light: {config.lightColor}
              </p>
            </div>

            {/* 複製代碼按鈕 */}
            <button
              onClick={() => {
                const code = `<AnimatedCat
  color="${config.color}"
  ringColor="${config.ringColor}"
  lightColor="${config.lightColor}"
/>`
                navigator.clipboard.writeText(code)
                alert('代碼已複製到剪貼簿！')
              }}
              className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-pink-400 to-yellow-400 text-white font-bold rounded-lg hover:scale-105 transition-all"
            >
              📋 複製代碼
            </button>
          </div>
        </Html>
      )}
    </group>
  )
}
