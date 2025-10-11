/**
 * IslandEditorModal - 島嶼編輯器
 * 功能：
 * 1. 載入 3D 模型（GLTF/GLB）
 * 2. 更改島嶼顏色
 * 3. 選擇紋理材質
 * 4. 即時 3D 預覽
 * 5. 保存並覆蓋原島嶼
 */

import { useState, useRef, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useMutation } from '@apollo/client'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { TEXTURE_CONFIGS, getTextureConfig } from '../constants/textures'
import { applyTexture } from '../utils/textureLoader'
import { UPDATE_ASSISTANT } from '../graphql/assistant'

interface IslandEditorModalProps {
  isOpen: boolean
  onClose: () => void
  islandId: string
  islandName: string
  currentColor: string
  currentShape?: string
  onSaveSuccess?: (updates: { color: string; textureId: string; shape: string }) => void // 保存成功回調
}

// 預設顏色選項
const COLOR_PRESETS = [
  '#A8E6A3', // 草綠
  '#F5E6D3', // 沙灘
  '#FFB3D9', // 粉紅
  '#87CEEB', // 天藍
  '#FFD7A8', // 奶油黃
  '#B8C5D6', // 霧藍
  '#8B9DC3', // 藍灰
  '#A8D5BA', // 薄荷綠
]

// 島嶼形狀選項
const SHAPE_OPTIONS = [
  { id: 'circle', name: '圓形', emoji: '⭕', description: '經典圓形島嶼' },
  { id: 'hexagon', name: '六角形', emoji: '⬡', description: '蜂巢風格' },
  { id: 'square', name: '方形', emoji: '⬜', description: '整齊方正' },
  { id: 'star', name: '星形', emoji: '⭐', description: '閃耀星星' },
  { id: 'heart', name: '愛心', emoji: '💖', description: '可愛愛心' },
  { id: 'organic', name: '自然形', emoji: '🌿', description: '自然有機形狀' },
]

// 3D模型預覽組件
function ModelPreview({ modelUrl, color }: { modelUrl: string | null; color: string; texture: string }) {
  const { scene } = useGLTF(modelUrl || '/models/default-island.glb')

  // 應用顏色到模型
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        const material = mesh.material as THREE.MeshStandardMaterial
        material.color = new THREE.Color(color)
        material.needsUpdate = true
      }
    }
  })

  return <primitive object={scene} scale={2} />
}

// 簡單的島嶼預覽（如果沒有上傳模型）
function DefaultIslandPreview({ color, texture, shape }: { color: string; texture: string; shape: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const textureConfig = getTextureConfig(texture)

  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      applyTexture(material, texture, color).catch(error => {
        console.error('Failed to apply texture:', error)
      })
    }
  }, [texture, color])

  // 根據形狀生成不同的 geometry
  const getGeometry = () => {
    switch (shape) {
      case 'circle':
        return <circleGeometry args={[2.8, 64]} />
      case 'hexagon':
        return <circleGeometry args={[2.8, 6]} />
      case 'square':
        return <planeGeometry args={[5, 5]} />
      case 'star': {
        const starShape = new THREE.Shape()
        const outerRadius = 2.8
        const innerRadius = 1.4
        const points = 5
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const angle = (i * Math.PI) / points
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          if (i === 0) starShape.moveTo(x, y)
          else starShape.lineTo(x, y)
        }
        starShape.closePath()
        return <shapeGeometry args={[starShape]} />
      }
      case 'heart': {
        const heartShape = new THREE.Shape()
        const scale = 2
        heartShape.moveTo(0, 0.5 * scale)
        heartShape.bezierCurveTo(0, 0.8 * scale, -0.5 * scale, 1.2 * scale, -1 * scale, 0.8 * scale)
        heartShape.bezierCurveTo(-1.5 * scale, 0.4 * scale, -1.5 * scale, -0.2 * scale, -1 * scale, -0.8 * scale)
        heartShape.bezierCurveTo(-0.5 * scale, -1.4 * scale, 0, -1.8 * scale, 0, -2.2 * scale)
        heartShape.bezierCurveTo(0, -1.8 * scale, 0.5 * scale, -1.4 * scale, 1 * scale, -0.8 * scale)
        heartShape.bezierCurveTo(1.5 * scale, -0.2 * scale, 1.5 * scale, 0.4 * scale, 1 * scale, 0.8 * scale)
        heartShape.bezierCurveTo(0.5 * scale, 1.2 * scale, 0, 0.8 * scale, 0, 0.5 * scale)
        return <shapeGeometry args={[heartShape]} />
      }
      case 'organic':
        return <circleGeometry args={[2.8, 8]} />
      default:
        return <circleGeometry args={[2.8, 64]} />
    }
  }

  const getBaseGeometry = () => {
    switch (shape) {
      case 'circle':
      case 'organic':
        return <circleGeometry args={[3, 64]} />
      case 'hexagon':
        return <circleGeometry args={[3, 6]} />
      case 'square':
        return <planeGeometry args={[5.4, 5.4]} />
      case 'star':
      case 'heart':
        return <circleGeometry args={[3.2, 64]} />
      default:
        return <circleGeometry args={[3, 64]} />
    }
  }

  return (
    <group>
      {/* 底層土壤 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        {getBaseGeometry()}
        <meshStandardMaterial color="#D4A574" roughness={0.9} />
      </mesh>

      {/* 主層（應用紋理） */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        {getGeometry()}
        <meshStandardMaterial
          color={color}
          roughness={textureConfig?.roughness || 0.8}
          metalness={textureConfig?.metalness || 0}
        />
      </mesh>

      {/* 裝飾層（僅圓形島嶼顯示） */}
      {shape === 'circle' && (
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[2.5, 2.6, 0.6, 32]} />
          <meshStandardMaterial
            color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.2).getStyle()}
            roughness={0.7}
          />
        </mesh>
      )}
    </group>
  )
}

export function IslandEditorModal({
  isOpen,
  onClose,
  islandId,
  islandName,
  currentColor,
  currentShape = 'circle',
  onSaveSuccess
}: IslandEditorModalProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [selectedTexture, setSelectedTexture] = useState('grass')
  const [selectedShape, setSelectedShape] = useState(currentShape)
  const [customColor, setCustomColor] = useState(currentColor)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // GraphQL mutation
  const [updateAssistant] = useMutation(UPDATE_ASSISTANT, {
    refetchQueries: ['GetAssistants', 'GetAssistant'],
  })

  if (!isOpen) return null

  // 處理模型文件上傳
  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 檢查文件類型
    const validExtensions = ['.gltf', '.glb']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

    if (!validExtensions.includes(fileExtension)) {
      alert('請上傳 GLTF 或 GLB 格式的 3D 模型文件')
      return
    }

    setModelFile(file)

    // 創建本地預覽 URL
    const url = URL.createObjectURL(file)
    setModelUrl(url)
  }

  // 移除模型
  const handleRemoveModel = () => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl)
    }
    setModelFile(null)
    setModelUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 保存島嶼設置
  const handleSave = async () => {
    console.log('🔵 [IslandEditor] handleSave 開始執行')
    console.log('🔵 [IslandEditor] 參數:', {
      islandId,
      selectedColor,
      selectedTexture,
      modelFile: modelFile?.name
    })

    setIsLoading(true)
    try {
      let uploadedModelUrl: string | undefined = undefined

      // 1. 上傳模型文件到服務器（如果有）
      if (modelFile) {
        // TODO: 實現文件上傳到服務器
        // 目前使用本地 URL 作為示例
        uploadedModelUrl = modelUrl || undefined
        console.log('🔵 [IslandEditor] Model file to upload:', modelFile.name)
      }

      console.log('🔵 [IslandEditor] 準備調用 updateAssistant mutation...')
      console.log('🔵 [IslandEditor] Variables:', {
        id: islandId,
        color: selectedColor,
        modelUrl: uploadedModelUrl,
        textureId: selectedTexture,
        shape: selectedShape,
      })

      // 2. 更新島嶼配置（顏色、紋理、形狀等）
      const result = await updateAssistant({
        variables: {
          id: islandId,
          color: selectedColor,
          modelUrl: uploadedModelUrl,
          textureId: selectedTexture,
          shape: selectedShape,
        },
      })

      console.log('✅ [IslandEditor] Mutation 成功返回:', result)
      console.log('✅ [IslandEditor] Updated assistant:', result.data?.updateAssistant)

      // 調用成功回調，通知父組件更新
      console.log('🔵 [IslandEditor] 準備調用 onSaveSuccess 回調...')
      if (onSaveSuccess) {
        await onSaveSuccess({
          color: selectedColor,
          textureId: selectedTexture,
          shape: selectedShape,
        })
        console.log('✅ [IslandEditor] onSaveSuccess 回調執行完成')
      } else {
        console.warn('⚠️ [IslandEditor] onSaveSuccess 回調未定義！')
      }

      const shapeOption = SHAPE_OPTIONS.find(s => s.id === selectedShape)
      alert(`島嶼 "${islandName}" 已成功更新！\n\n顏色: ${selectedColor}\n紋理: ${selectedTexture}\n形狀: ${shapeOption?.name || selectedShape}`)
      onClose()
    } catch (error) {
      console.error('❌ [IslandEditor] 保存失敗:', error)
      alert(`保存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl)
    }
    onClose()
  }

  return (
    <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center ${Z_INDEX_CLASSES.MODAL} animate-fade-in p-2 md:p-4`}>
      <div className="bg-gradient-to-br from-white to-healing-cream rounded-bubble p-4 md:p-8 max-w-6xl w-full shadow-cute-xl border-4 border-white animate-bounce-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-base md:text-cute-2xl font-bold bg-gradient-to-r from-candy-pink to-candy-purple bg-clip-text text-transparent truncate mr-2">
            🎨 編輯島嶼 - {islandName}
          </h2>
          <button
            onClick={handleCancel}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-healing-sunset hover:bg-candy-pink text-white text-xl md:text-2xl font-bold transition-all duration-300 hover:rotate-90 hover:scale-110 shadow-cute flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* 左側：設置面板 */}
          <div className="space-y-4 md:space-y-6">
            {/* 3D 模型上傳 */}
            <div className="bg-white rounded-cute p-4 md:p-6 shadow-cute">
              <h3 className="text-base md:text-cute-lg font-bold mb-3 md:mb-4 text-gray-800">📦 3D 模型</h3>
              <div className="space-y-3">
                {modelFile ? (
                  <div className="bg-healing-gentle rounded-cute p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">✅</span>
                        <div>
                          <p className="font-bold text-gray-800">{modelFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(modelFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveModel}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-cute font-bold transition-colors"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".gltf,.glb"
                      onChange={handleModelUpload}
                      className="hidden"
                      id="model-upload"
                    />
                    <label
                      htmlFor="model-upload"
                      className="block w-full px-4 py-6 border-3 border-dashed border-candy-purple rounded-cute text-center cursor-pointer hover:bg-candy-purple/10 transition-colors"
                    >
                      <span className="text-4xl block mb-2">📤</span>
                      <span className="text-cute-base font-bold text-gray-700">
                        點擊上傳 GLTF/GLB 模型
                      </span>
                      <span className="block text-cute-sm text-gray-500 mt-1">
                        支援 .gltf 和 .glb 格式
                      </span>
                    </label>
                  </div>
                )}
                <p className="text-cute-xs text-gray-600">
                  💡 上傳自定義 3D 模型後，將完全替換原有島嶼外觀
                </p>
              </div>
            </div>

            {/* 顏色選擇 */}
            <div className="bg-white rounded-cute p-4 md:p-6 shadow-cute">
              <h3 className="text-base md:text-cute-lg font-bold mb-3 md:mb-4 text-gray-800">🎨 島嶼顏色</h3>

              {/* 預設顏色 */}
              <div className="mb-4">
                <p className="text-cute-sm text-gray-600 mb-2">預設顏色</p>
                <div className="grid grid-cols-4 gap-3">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color)
                        setCustomColor(color)
                      }}
                      className={`
                        h-12 rounded-cute transition-all duration-300 hover:scale-110
                        ${selectedColor === color ? 'ring-4 ring-candy-purple shadow-cute' : 'ring-2 ring-gray-200'}
                      `}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* 自定義顏色 */}
              <div>
                <p className="text-cute-sm text-gray-600 mb-2">自定義顏色</p>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value)
                      setSelectedColor(e.target.value)
                    }}
                    className="h-12 w-full rounded-cute cursor-pointer border-3 border-gray-200"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value)
                      setSelectedColor(e.target.value)
                    }}
                    className="w-32 px-3 py-2 border-3 border-gray-200 rounded-cute font-mono text-cute-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            {/* 紋理選擇 */}
            <div className="bg-white rounded-cute p-4 md:p-6 shadow-cute">
              <h3 className="text-base md:text-cute-lg font-bold mb-3 md:mb-4 text-gray-800">🖼️ 紋理材質</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 md:gap-3">
                {TEXTURE_CONFIGS.map((texture) => (
                  <button
                    key={texture.id}
                    onClick={() => setSelectedTexture(texture.id)}
                    className={`
                      p-4 rounded-cute transition-all duration-300 hover:scale-105
                      ${selectedTexture === texture.id
                        ? 'bg-gradient-to-br from-candy-pink to-candy-purple text-white shadow-cute'
                        : 'bg-healing-gentle text-gray-700 hover:bg-candy-blue/20'
                      }
                    `}
                  >
                    <span className="text-3xl block mb-1">{texture.emoji}</span>
                    <span className="text-cute-sm font-bold">{texture.nameChinese}</span>
                  </button>
                ))}
              </div>
              <p className="text-cute-xs text-gray-600 mt-3">
                💡 提示：可在 public/textures/ 目錄添加自定義紋理圖片
              </p>
            </div>

            {/* 形狀選擇 */}
            <div className="bg-white rounded-cute p-4 md:p-6 shadow-cute">
              <h3 className="text-base md:text-cute-lg font-bold mb-3 md:mb-4 text-gray-800">🔷 島嶼形狀</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 md:gap-3">
                {SHAPE_OPTIONS.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedShape(shape.id)}
                    className={`
                      p-4 rounded-cute transition-all duration-300 hover:scale-105
                      ${selectedShape === shape.id
                        ? 'bg-gradient-to-br from-candy-pink to-candy-purple text-white shadow-cute'
                        : 'bg-healing-gentle text-gray-700 hover:bg-candy-blue/20'
                      }
                    `}
                  >
                    <span className="text-3xl block mb-1">{shape.emoji}</span>
                    <span className="text-cute-sm font-bold block">{shape.name}</span>
                    <span className="text-cute-xs opacity-70">{shape.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：3D 預覽 */}
          <div className="bg-white rounded-cute p-4 md:p-6 shadow-cute">
            <h3 className="text-base md:text-cute-lg font-bold mb-3 md:mb-4 text-gray-800">👁️ 即時預覽</h3>
            <div className="bg-gradient-to-br from-healing-sky to-healing-gentle rounded-cute overflow-hidden" style={{ height: '300px', minHeight: '300px' }}>
              <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                <hemisphereLight intensity={0.4} color="#FFFACD" groundColor="#FFE5F0" />

                <Suspense fallback={null}>
                  {modelUrl ? (
                    <ModelPreview
                      modelUrl={modelUrl}
                      color={selectedColor}
                      texture={selectedTexture}
                    />
                  ) : (
                    <DefaultIslandPreview
                      color={selectedColor}
                      texture={selectedTexture}
                      shape={selectedShape}
                    />
                  )}
                  <Environment preset="sunset" />
                </Suspense>

                <OrbitControls
                  enablePan={false}
                  minDistance={3}
                  maxDistance={10}
                  maxPolarAngle={Math.PI / 2}
                />

                {/* 地面 */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                  <planeGeometry args={[20, 20]} />
                  <meshStandardMaterial color="#E8F5E9" />
                </mesh>
              </Canvas>
            </div>
            <p className="text-cute-xs text-gray-600 mt-3 text-center">
              🖱️ 拖動旋轉 | 滾輪縮放
            </p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('🔴 [DEBUG] 保存按鈕被點擊！')
              handleSave()
            }}
            disabled={isLoading}
            className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-candy-pink to-candy-purple text-white rounded-cute font-bold shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            {isLoading ? '💾 保存中...' : <><span className="hidden sm:inline">💾 保存島嶼</span><span className="sm:hidden">💾 保存</span></>}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleCancel()
            }}
            disabled={isLoading}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-healing-gentle hover:bg-candy-blue text-gray-700 font-bold rounded-cute shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 text-sm md:text-base"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
