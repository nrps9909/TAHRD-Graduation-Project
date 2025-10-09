/**
 * 🎵 AudioControls - 音频控制面板
 * 浮动在右下角，让用户控制音乐和音效
 */

import { useState } from 'react'
import { useSound } from '../hooks/useSound'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

export function AudioControls() {
  const sound = useSound()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`fixed bottom-4 right-4 ${Z_INDEX_CLASSES.FLOATING_TOOLS}`}>
      {/* 控制按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
          border: '2px solid white',
        }}
        title="音频控制"
      >
        <span className="text-2xl">{sound.bgm.isPlaying ? '🎵' : '🔇'}</span>
      </button>

      {/* 展开的控制面板 */}
      {isOpen && (
        <div
          className="absolute bottom-16 right-0 w-64 p-4 rounded-2xl shadow-xl backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid rgba(255, 179, 217, 0.5)',
          }}
        >
          <h3 className="text-lg font-bold mb-4" style={{ color: '#FF8FB3' }}>
            🎵 音频控制
          </h3>

          {/* 背景音乐 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">背景音乐</span>
              <button
                onClick={() => (sound.bgm.isPlaying ? sound.bgm.stop() : sound.bgm.play())}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{
                  background: sound.bgm.isPlaying
                    ? 'linear-gradient(135deg, #FFB3D9, #FF8FB3)'
                    : '#E0E0E0',
                  color: sound.bgm.isPlaying ? 'white' : '#666',
                }}
              >
                {sound.bgm.isPlaying ? '暂停' : '播放'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.3"
              onChange={(e) => sound.bgm.setVolume(parseFloat(e.target.value))}
              className="w-full"
              disabled={!sound.bgm.isPlaying}
            />
          </div>

          {/* 音效 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">音效</span>
              <button
                onClick={sound.sfx.toggle}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{
                  background: sound.sfx.enabled
                    ? 'linear-gradient(135deg, #FFB3D9, #FF8FB3)'
                    : '#E0E0E0',
                  color: sound.sfx.enabled ? 'white' : '#666',
                }}
              >
                {sound.sfx.enabled ? '开启' : '关闭'}
              </button>
            </div>

            {/* 音效测试按钮 */}
            {sound.sfx.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={sound.sfx.meow}
                  className="px-2 py-1 rounded-lg text-xs bg-pink-100 hover:bg-pink-200 transition-colors"
                >
                  🐱 猫叫
                </button>
                <button
                  onClick={sound.sfx.purr}
                  className="px-2 py-1 rounded-lg text-xs bg-pink-100 hover:bg-pink-200 transition-colors"
                >
                  😺 咕噜
                </button>
                <button
                  onClick={sound.sfx.click}
                  className="px-2 py-1 rounded-lg text-xs bg-pink-100 hover:bg-pink-200 transition-colors"
                >
                  👆 点击
                </button>
                <button
                  onClick={sound.sfx.flower}
                  className="px-2 py-1 rounded-lg text-xs bg-pink-100 hover:bg-pink-200 transition-colors"
                >
                  🌸 花朵
                </button>
              </div>
            )}
          </div>

          {/* 主音量 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">主音量</span>
              <span className="text-xs text-gray-500">{Math.round(sound.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="1"
              onChange={(e) => sound.setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 静音按钮 */}
          <button
            onClick={sound.mute}
            className="w-full mt-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #FFE5F0, #FFB3D9)',
              color: '#FF8FB3',
            }}
          >
            🔇 全局静音
          </button>
        </div>
      )}
    </div>
  )
}
