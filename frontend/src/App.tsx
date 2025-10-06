import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Scene } from './components/Scene'
import { UI } from './components/UI'
import { TimeControl } from './components/TimeControl'
import { PointerLockManager } from './components/3D/PointerLockManager'
import { FontPreloader } from './components/FontPreloader'
import { ClickEffects } from './components/ClickEffects'
import { StartScreen } from './components/StartScreen'
import { HotkeyGuide } from './components/HotkeyGuide'
// import { NookPhone } from './components/UI/NookPhone' // 已移除，使用 AnimalCrossingPhone
import { VisualSoundEffects, BubbleEffect, MusicalNoteRain } from './components/UI/VisualSoundEffects'
import { NPCConversationBubble } from './components/UI/NPCConversationBubble'
import { useGameStore } from './stores/gameStore'
import { useSocketConnection } from './hooks/useSocketConnection'
import './styles/animalcrossing.css'
import './styles/npc-animations.css'

function App() {
  const { initializeGame, isLoading, showHotkeyGuide, setShowHotkeyGuide } = useGameStore()
  const [showStartScreen, setShowStartScreen] = useState(true)
  const [gameStarting, setGameStarting] = useState(false)

  // 只在遊戲開始後才連接 WebSocket
  const socketEnabled = !showStartScreen
  useSocketConnection(socketEnabled)

  const handleStartGame = async () => {
    setGameStarting(true)
    // 先初始化遊戲，等待完成後再隱藏開始畫面
    try {
      await initializeGame()
      // 確保有足夠時間顯示載入動畫
      setTimeout(() => {
        setShowStartScreen(false)
        setGameStarting(false)
        setShowHotkeyGuide(true) // 顯示快捷鍵指南
      }, 1000)
    } catch (error) {
      console.error('遊戲初始化失敗:', error)
      // 即使失敗也要進入遊戲，使用預設資料
      setTimeout(() => {
        setShowStartScreen(false)
        setGameStarting(false)
        setShowHotkeyGuide(true) // 顯示快捷鍵指南
      }, 2000)
    }
  }

  const handleCloseHotkeyGuide = () => {
    setShowHotkeyGuide(false)
  }

  const handleBackToStart = () => {
    setShowStartScreen(true)
    setGameStarting(false)
    setShowHotkeyGuide(false)
  }

  // 添加返回開始畫面的熱鍵監聽 - 必須在所有條件返回之前
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Home鍵返回開始畫面
      if (e.key === 'Home' || (e.ctrlKey && e.key === 'h')) {
        e.preventDefault()
        setShowStartScreen(true)
        setGameStarting(false)
        const { setShowHotkeyGuide } = useGameStore.getState()
        setShowHotkeyGuide(false)
      }
    }

    if (!showStartScreen && !gameStarting) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showStartScreen, gameStarting])

  // 阻止方向鍵/空白鍵觸發瀏覽器捲動
  useEffect(() => {
    const prevent = (e: KeyboardEvent) => {
      const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '];
      if (keys.includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', prevent, { passive:false });
    return () => window.removeEventListener('keydown', prevent as any);
  }, []);

  // 如果顯示開始畫面，直接返回開始畫面組件
  if (showStartScreen) {
    return <StartScreen onStartGame={handleStartGame} />
  }

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-sky-200 via-green-100 to-yellow-100 flex items-center justify-center overflow-hidden relative">
        {/* Animated background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-8xl animate-float">🌱</div>
          <div className="absolute top-20 right-20 text-7xl animate-float" style={{ animationDelay: '1s' }}>🌸</div>
          <div className="absolute bottom-20 left-20 text-9xl animate-float" style={{ animationDelay: '2s' }}>🌻</div>
          <div className="absolute bottom-10 right-10 text-6xl animate-float" style={{ animationDelay: '3s' }}>🌼</div>
          <div className="absolute top-1/2 left-1/2 text-8xl animate-spin-slow">✨</div>
        </div>
        
        <div className="text-center animate-pop-in relative z-10">
          {/* Animated logo with glow effect */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-green-300 rounded-full blur-3xl opacity-50 animate-pulse" />
            <div className="relative animate-bounce-slow">
              <div className="w-32 h-32 bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 
                            rounded-full shadow-2xl flex items-center justify-center 
                            border-4 border-white ac-avatar group hover:scale-110 transition-transform">
                <span className="text-5xl group-hover:animate-tada">🌳</span>
              </div>
              {/* Decorative rings */}
              <div className="absolute inset-0 border-4 border-green-300 rounded-full animate-ping opacity-30" />
              <div className="absolute inset-0 border-4 border-yellow-300 rounded-full animate-ping opacity-30" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
          
          {/* Title with enhanced styling */}
          <div className="relative">
            <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-2 ac-font animate-rainbow">
              心語小鎮
            </h2>
            <p className="text-lg text-green-700 font-medium mb-4">Heart Whisper Town</p>
          </div>
          
          {/* Loading indicator with cute animation */}
          <div className="flex items-center justify-center gap-3 bg-white/70 rounded-full px-6 py-3 shadow-lg">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-green-600 font-semibold">正在準備你的島嶼...</p>
          </div>
          
          {/* Tips */}
          <div className="mt-8 text-sm text-gray-600 animate-fade-in" style={{ animationDelay: '1s' }}>
            <p className="flex items-center justify-center gap-2">
              <span className="text-lg">💡</span>
              小提示：與島民聊天可以提升親密度哦！
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container" style={{ width: '100vw', height: '100vh', background: '#87CEEB' }}>
      <FontPreloader />
      <PointerLockManager />

      {/* Click effects for entire app */}
      <ClickEffects />

      <div className="game-scene" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 8, 12], fov: 75 }}
          shadows
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            background: '#87CEEB'
          }}
          onCreated={({ gl }) => {
            console.log('Canvas created successfully')
            console.log('WebGL context:', gl.getContext())
            // 調整陰影為最柔和的PCF類型
            if (gl.shadowMap) {
              gl.shadowMap.enabled = true
              gl.shadowMap.type = THREE.PCFSoftShadowMap
            }
            // 設置背景為天藍色而非純藍色
            gl.setClearColor('#87CEEB', 1)
          }}
          onError={(error) => {
            console.error('Canvas error:', error)
          }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          <Environment preset="sunset" background={true} blur={0} />

          <Scene />
        </Canvas>
      </div>

      <div className="game-ui">
        <UI />
      </div>

      {/* 時間控制面板 */}
      <TimeControl />

      {/* Animal Crossing Style Phone UI - 已移除，使用 UI 組件中的 AnimalCrossingPhone */}
      {/* <NookPhone /> */}

      {/* Visual Effects Layers */}
      <VisualSoundEffects />
      <BubbleEffect />
      <MusicalNoteRain active={false} />

      {/* NPC Conversation Bubbles */}
      <NPCConversationBubble />

      {/* Hotkey Guide */}
      <HotkeyGuide isVisible={showHotkeyGuide} onClose={handleCloseHotkeyGuide} />

      {/* Corner decorations */}
      <div className="fixed top-4 left-4 z-20 pointer-events-none">
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-3 shadow-xl border-3 border-white animate-wiggle">
          <span className="text-2xl">🌱</span>
        </div>
      </div>

      <div className="fixed top-4 right-4 z-20 pointer-events-none">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-3 shadow-xl border-3 border-white animate-pulse">
          <span className="text-2xl">✨</span>
        </div>
      </div>

      {/* Hotkey hints */}
      <div className="fixed bottom-4 left-4 z-20 bg-black/50 text-white px-3 py-2 rounded-lg">
        <div className="text-sm">
          <div>G: 遊戲模式</div>
          <div>C: 社交功能 | X: 探索世界 | Z: 設定</div>
          <div>Ctrl+H: 返回開始畫面</div>
        </div>
      </div>
    </div>
  )
}

export default App