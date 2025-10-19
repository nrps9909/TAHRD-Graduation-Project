/**
 * IslandCreator - 島嶼創建器/編輯器頁面
 * 玩家可以繪製自訂形狀並即時預覽 3D 島嶼
 * 支持創建新島嶼或編輯現有島嶼
 */

import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { useMutation } from '@apollo/client'
import { IslandDrawer } from '../../components/IslandDrawer'
import { CustomIsland } from '../../components/3D/CustomIsland'
import { islandShapePresets, type ShapePreset } from '../../utils/islandShapePresets'
import { useNavigate, useParams } from 'react-router-dom'
import { useIslandStore } from '../../stores/islandStore'
import { UPDATE_ISLAND, GET_ISLANDS } from '../../graphql/category'

interface Point {
  x: number
  y: number
}

interface IslandConfig {
  shape: Point[]
  color: string
  height: number
  bevel: number
  texture: string
  name: string
}

export default function IslandCreator() {
  const navigate = useNavigate()
  const { islandId } = useParams<{ islandId?: string }>()
  const { islands, updateIsland } = useIslandStore()
  const canvasRef = useRef<any>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [config, setConfig] = useState<IslandConfig>({
    shape: [],
    color: '#90C695',
    height: 2,
    bevel: 0.5,
    texture: 'grass',
    name: '我的島嶼'
  })
  const [savedIslands, setSavedIslands] = useState<IslandConfig[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // GraphQL mutation for updating island
  const [updateIslandMutation] = useMutation(UPDATE_ISLAND, {
    refetchQueries: [{ query: GET_ISLANDS }],
    onCompleted: (data) => {
      console.log('✅ 島嶼更新成功:', data.updateIsland)
      setIsSaving(false)
      alert(`✅ 島嶼「${config.name}」已更新！\n\n形狀點數: ${config.shape.length}\n高度: ${(config.height ?? 2).toFixed(1)}\n斜率: ${(config.bevel ?? 0.5).toFixed(1)}`)
      navigate('/', { replace: true })
    },
    onError: (error) => {
      console.error('❌ 島嶼更新失敗:', error)
      alert('更新失敗：' + error.message)
      setIsSaving(false)
    }
  })

  // 判斷是否為編輯模式
  const isEditMode = !!islandId
  const currentIsland = isEditMode ? islands.find(i => i.id === islandId) : null

  // 載入現有島嶼配置（編輯模式）
  useEffect(() => {
    if (isEditMode && currentIsland) {
      // 嘗試從 localStorage 載入形狀數據
      let loadedShape: Point[] = []
      let loadedHeight = 2
      let loadedBevel = 0.5

      try {
        const customShapeData = currentIsland.customShapeData
        if (customShapeData && typeof customShapeData === 'string') {
          loadedShape = JSON.parse(customShapeData)
          console.log('✅ [IslandCreator] 載入自訂形狀:', loadedShape.length, '個點')
        }

        const islandHeight = currentIsland.islandHeight
        if (islandHeight != null) {
          loadedHeight = islandHeight
        }

        const islandBevel = currentIsland.islandBevel
        if (islandBevel != null) {
          loadedBevel = islandBevel
        }
      } catch (error) {
        console.warn('⚠️ [IslandCreator] 載入形狀資料失敗:', error)
      }

      setConfig({
        shape: loadedShape,
        color: currentIsland.color,
        height: loadedHeight,
        bevel: loadedBevel,
        texture: 'grass',
        name: currentIsland.name
      })

      console.log('🔵 [IslandCreator] 已載入島嶼配置:', {
        name: currentIsland.name,
        shapePoints: loadedShape.length,
        height: loadedHeight,
        bevel: loadedBevel
      })
    }
  }, [isEditMode, currentIsland])

  const handleComplete = (points: Point[]) => {
    setConfig({ ...config, shape: points })
    setShowDrawer(false)
  }

  const handlePresetSelect = (preset: ShapePreset) => {
    setConfig({ ...config, shape: preset.points, name: preset.name })
    setShowPresets(false)
  }

  const handleSave = async () => {
    if (isEditMode && islandId) {
      // 編輯模式：使用 GraphQL mutation 更新島嶼配置到資料庫
      if (isSaving) return

      try {
        setIsSaving(true)
        console.log('🔵 [IslandCreator] 開始保存島嶼...')
        console.log('🔵 [IslandCreator] Island ID:', islandId)
        console.log('🔵 [IslandCreator] Config:', config)

        // 將 shape 轉換為 JSON 字符串
        const customShapeData = config.shape.length > 0 ? JSON.stringify(config.shape) : null

        // 使用 GraphQL mutation 更新資料庫
        await updateIslandMutation({
          variables: {
            id: islandId,
            input: {
              color: config.color,
              customShapeData,
              islandHeight: config.height ?? 2,
              islandBevel: config.bevel ?? 0.5,
            }
          }
        })

        // 同時更新本地 store 以保持 UI 同步
        updateIsland(islandId, {
          color: config.color,
          customShapeData: customShapeData || undefined,
          islandHeight: config.height ?? 2,
          islandBevel: config.bevel ?? 0.5,
          updatedAt: new Date().toISOString(),
        })

        console.log('✅ [IslandCreator] 島嶼配置已保存到資料庫', {
          shape: config.shape.length,
          height: config.height ?? 2,
          bevel: config.bevel ?? 0.5
        })
      } catch (error) {
        console.error('❌ [IslandCreator] 更新失敗:', error)
        setIsSaving(false)
        // Error handled in onError callback
      }
    } else {
      // 創建模式：保存到 localStorage
      const name = prompt('請輸入島嶼名稱：', config.name)
      if (!name) return

      const newConfig = { ...config, name }
      const updated = [...savedIslands, newConfig]
      setSavedIslands(updated)
      localStorage.setItem('savedIslands', JSON.stringify(updated))
      alert(`✅ 島嶼「${name}」已保存！`)
    }
  }

  const handleLoad = () => {
    const saved = localStorage.getItem('savedIslands')
    if (saved) {
      const islands = JSON.parse(saved)
      setSavedIslands(islands)

      if (islands.length === 0) {
        alert('目前沒有已保存的島嶼')
        return
      }

      const names = islands.map((i: IslandConfig, idx: number) => `${idx + 1}. ${i.name}`).join('\n')
      const choice = prompt(`選擇要載入的島嶼：\n${names}\n\n請輸入編號：`)
      if (choice) {
        const index = parseInt(choice) - 1
        if (index >= 0 && index < islands.length) {
          setConfig(islands[index])
          alert(`✅ 已載入島嶼「${islands[index].name}」`)
        }
      }
    } else {
      alert('目前沒有已保存的島嶼')
    }
  }

  const handleExport = () => {
    if (!canvasRef.current) return

    const exporter = new GLTFExporter()
    const scene = canvasRef.current

    exporter.parse(
      scene,
      (gltf) => {
        const blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${config.name}.gltf`
        link.click()
        URL.revokeObjectURL(url)
        alert('✅ 3D 模型已導出！')
      },
      (error) => {
        console.error('導出失敗:', error)
        alert('❌ 導出失敗，請稍後再試')
      },
      { binary: false }
    )
  }

  const textures = [
    { id: 'grass', name: '草地', color: '#90C695', emoji: '🌿' },
    { id: 'sand', name: '沙灘', color: '#F4E4C1', emoji: '🏖️' },
    { id: 'snow', name: '雪地', color: '#E8F4F8', emoji: '❄️' },
    { id: 'rock', name: '岩石', color: '#8B7355', emoji: '🗻' },
    { id: 'flower', name: '花園', color: '#FFB6C1', emoji: '🌸' },
    { id: 'autumn', name: '秋葉', color: '#D2691E', emoji: '🍂' }
  ]

  const selectedTexture = textures.find(t => t.id === config.texture) || textures[0]

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-sky-300 to-sky-100 flex flex-col">
      {/* 頂部控制欄 */}
      <div className="bg-white/90 backdrop-blur shadow-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                ← 返回主頁
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {isEditMode ? `🎨 編輯島嶼 - ${config.name}` : '🏝️ 島嶼創建器'}
                </h1>
                <p className="text-sm text-gray-600">
                  {isEditMode ? '修改島嶼顏色和紋理' : '繪製你的專屬島嶼形狀'}
                </p>
              </div>
            </div>

            {/* 控制面板 */}
            <div className="mt-4 flex flex-wrap gap-4">
              {/* 形狀控制 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDrawer(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all shadow-lg"
                >
                  {config.shape.length > 0 ? '✏️ 重新繪製' : '🎨 開始繪製'}
                </button>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                >
                  📋 預設形狀
                </button>
              </div>

              {/* 紋理選擇 */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow">
                <label className="text-sm font-medium text-gray-700">紋理：</label>
                <select
                  value={config.texture}
                  onChange={(e) => {
                    const texture = textures.find(t => t.id === e.target.value)
                    setConfig({ ...config, texture: e.target.value, color: texture?.color || config.color })
                  }}
                  className="px-3 py-1 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {textures.map(t => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
              </div>

              {/* 顏色選擇器 */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow">
                <label className="text-sm font-medium text-gray-700">顏色：</label>
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => setConfig({ ...config, color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-300"
                />
              </div>

              {/* 高度控制 */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow">
                <label className="text-sm font-medium text-gray-700">高度：</label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={config.height ?? 2}
                  onChange={(e) => setConfig({ ...config, height: parseFloat(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 w-8">{(config.height ?? 2).toFixed(1)}</span>
              </div>

              {/* 斜率控制 */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow">
                <label className="text-sm font-medium text-gray-700">斜率：</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.bevel ?? 0.5}
                  onChange={(e) => setConfig({ ...config, bevel: parseFloat(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 w-8">{(config.bevel ?? 0.5).toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* 右側操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={handleLoad}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
            >
              📂 載入
            </button>
            <button
              onClick={handleSave}
              disabled={(!isEditMode && config.shape.length === 0) || isSaving}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '💾 保存中...' : isEditMode ? '💾 保存更新' : '💾 保存'}
            </button>
            <button
              onClick={handleExport}
              disabled={config.shape.length === 0}
              className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📥 導出3D
            </button>
            <button
              onClick={() => setConfig({ ...config, shape: [] })}
              disabled={config.shape.length === 0}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ 清空
            </button>
          </div>
        </div>
      </div>

      {/* 預設形狀選擇面板 */}
      {showPresets && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 bg-white rounded-2xl shadow-2xl p-6 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">選擇預設形狀</h3>
            <button
              onClick={() => setShowPresets(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {islandShapePresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className="p-4 border-2 border-gray-200 hover:border-blue-400 rounded-xl transition-all hover:shadow-lg group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{preset.icon}</div>
                <div className="font-semibold text-gray-800">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3D 預覽區域 */}
      <div className="flex-1 relative">
        {config.shape.length > 0 ? (
          <Canvas shadows ref={canvasRef}>
            <PerspectiveCamera makeDefault position={[30, 20, 30]} fov={60} />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={10}
              maxDistance={100}
            />

            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <Environment preset="sunset" />

            <CustomIsland
              position={[0, 0, 0]}
              color={config.color}
              scale={1.5}
              isActive={true}
              memories={[]}
              islandId="custom-island"
              shapePoints={config.shape}
              height={config.height ?? 2}
              bevel={config.bevel ?? 0.5}
            />

            <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[200, 200]} />
              <meshStandardMaterial color="#4a9eff" opacity={0.6} transparent />
            </mesh>

            <gridHelper args={[100, 20, '#888888', '#cccccc']} position={[0, -2.9, 0]} />
          </Canvas>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl mb-4">🎨</div>
              <h2 className="text-3xl font-bold text-gray-700 mb-2">開始創作你的島嶼</h2>
              <p className="text-gray-500 mb-6">點擊上方按鈕來設計你的專屬島嶼形狀</p>
              <div className="flex gap-4 justify-center text-sm text-gray-600 flex-wrap max-w-2xl">
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow">✏️ 自由繪製形狀</div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow">📋 使用預設範本</div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow">🎨 選擇紋理顏色</div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow">⚙️ 調整高度斜率</div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow">💾 保存到本地</div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow">📥 導出3D模型</div>
              </div>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        {config.shape.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 max-w-xs">
            <h3 className="font-semibold text-gray-800 mb-2">💡 控制說明</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>左鍵拖動</strong>：旋轉視角</li>
              <li>• <strong>滾輪</strong>：縮放視圖</li>
              <li>• <strong>右鍵拖動</strong>：平移視圖</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                紋理：{selectedTexture.emoji} {selectedTexture.name}<br/>
                高度：{(config.height ?? 2).toFixed(1)} | 斜率：{(config.bevel ?? 0.5).toFixed(1)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 繪製界面 */}
      {showDrawer && (
        <IslandDrawer
          onComplete={handleComplete}
          onCancel={() => setShowDrawer(false)}
        />
      )}
    </div>
  )
}
