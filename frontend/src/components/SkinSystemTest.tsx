import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { CharacterWithSkin, CharacterSkinId, CHARACTER_PATHS, CHARACTER_INFO } from './CharacterSkinSystem'
import * as THREE from 'three'

// 皮膚系統測試組件
export const SkinSystemTest = () => {
  const [currentSkinId, setCurrentSkinId] = useState<CharacterSkinId>('player-female-main')
  
  const availableSkins = Object.keys(CHARACTER_PATHS) as CharacterSkinId[]
  
  return (
    <div className="w-full h-screen flex">
      {/* 3D 預覽區域 */}
      <div className="flex-1">
        <Canvas
          camera={{ position: [0, 2, 5], fov: 60 }}
          shadows
        >
          <color attach="background" args={['#f0f8ff']} />
          
          {/* 環境光照 */}
          <Environment preset="city" />
          <ambientLight intensity={0.3} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1} 
            castShadow 
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* 地板 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshLambertMaterial color="#90EE90" />
          </mesh>
          
          {/* 角色模型 */}
          <CharacterWithSkin 
            skinId={currentSkinId}
            scale={1}
            position={[0, 0, 0]}
            onLoad={() => {
              console.log(`測試: 模型載入完成 - ${currentSkinId}`)
            }}
          />
          
          {/* 軌道控制器 */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            target={[0, 1, 0]}
          />
        </Canvas>
      </div>
      
      {/* 控制面板 */}
      <div className="w-80 bg-gray-100 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">皮膚系統測試</h2>
        
        {/* 當前選擇 */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">目前選擇:</h3>
          <div className="text-sm">
            <p><strong>ID:</strong> {currentSkinId}</p>
            <p><strong>名稱:</strong> {CHARACTER_INFO[currentSkinId]?.name}</p>
            <p><strong>別名:</strong> {CHARACTER_INFO[currentSkinId]?.nickname}</p>
            <p><strong>類型:</strong> {CHARACTER_INFO[currentSkinId]?.type}</p>
          </div>
        </div>
        
        {/* 皮膚選擇 */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">選擇皮膚:</h3>
          <div className="space-y-2">
            {availableSkins.map((skinId) => {
              const info = CHARACTER_INFO[skinId]
              const isSelected = skinId === currentSkinId
              
              return (
                <button
                  key={skinId}
                  onClick={() => setCurrentSkinId(skinId)}
                  className={`
                    w-full p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-100 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {info.type === 'male' ? '👦' : '👧'}
                    </span>
                    <div>
                      <div className="font-medium">{info.name}</div>
                      <div className="text-xs text-gray-600">{info.nickname}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* 系統信息 */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2">系統信息:</h3>
          <div className="text-sm space-y-1">
            <p>• 模型格式: GLB</p>
            <p>• 貼圖格式: PNG</p>
            <p>• 材質: MeshToonMaterial</p>
            <p>• 可用皮膚: {availableSkins.length} 個</p>
          </div>
        </div>
        
        {/* 使用說明 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">使用說明:</h3>
          <div className="text-sm space-y-1">
            <p>• 點擊上方按鈕切換皮膚</p>
            <p>• 滑鼠拖拽可旋轉視角</p>
            <p>• 滾輪可縮放視角</p>
            <p>• 遊戲中按C鍵快速切換</p>
          </div>
        </div>
      </div>
    </div>
  )
}