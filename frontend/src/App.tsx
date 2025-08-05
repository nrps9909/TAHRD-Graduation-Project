import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Scene } from './components/Scene'
import { UI } from './components/UI'
import { useGameStore } from './stores/gameStore'
import { useSocketConnection } from './hooks/useSocketConnection'

function App() {
  const { initializeGame, isLoading } = useGameStore()
  useSocketConnection()

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-healing-warm to-healing-gentle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-gentle-float mb-4">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
              🌸
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">心語小鎮</h2>
          <p className="text-gray-600 animate-pulse">正在為你準備這個溫暖的世界...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 8, 12], fov: 75 }}
        shadows
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, #87CEEB, #98FB98, #F0E68C)'
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
        
        <Environment preset="park" />
        
        <Scene />
      </Canvas>
      
      <div className="ui-overlay">
        <UI />
      </div>
    </div>
  )
}

export default App