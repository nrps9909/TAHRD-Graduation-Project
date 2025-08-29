import { useGLTF, useTexture } from '@react-three/drei'
import { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

// 角色模型和材質路徑映射
export const CHARACTER_PATHS = {
  // NPC模型路徑 (根據你提供的正確映射)
  'npc-1': '/characters/CHAR-M-A/CHAR-M-A.glb',  // 陸培修 (鋁配咻) - 男性A
  'npc-2': '/characters/CHAR-F-B/CHAR-F-B.glb',  // 劉宇岑 (流羽岑) - 女性B
  'npc-3': '/characters/CHAR-M-C/CHAR-M-C.glb',  // 陳庭安 (沉停鞍) - 男性C
  
  // Player模型路徑
  'player-female-main': '/characters/CHAR-F-A/CHAR-F-A.glb',  // 主場景Player (女性A)
  'player-male-default': '/characters/CHAR-M-A/CHAR-M-A.glb', // 預設Player (男性A)
  'player-female-simple': '/characters/CHAR-F-E/CHAR-F-E.glb', // 簡化Player (女性E)
} as const

// 對應貼圖路徑 (根據你提供的正確映射)
export const TEXTURE_PATHS = {
  'npc-1': '/characters/CHAR-M-A/textures/colormap.png',  // 鋁配咻
  'npc-2': '/characters/CHAR-F-B/textures/colormap.png',  // 流羽岑
  'npc-3': '/characters/CHAR-M-C/textures/colormap.png',  // 沉停鞍
  'player-female-main': '/characters/CHAR-F-A/textures/colormap.png',
  'player-male-default': '/characters/CHAR-M-A/textures/colormap.png',
  'player-female-simple': '/characters/CHAR-F-E/textures/colormap.png',
} as const

export type CharacterSkinId = keyof typeof CHARACTER_PATHS

// 皮膚更換組件
interface CharacterWithSkinProps {
  skinId: CharacterSkinId
  scale?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  onLoad?: (model: THREE.Group) => void
}

export const CharacterWithSkin = ({ 
  skinId, 
  scale = 1, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  onLoad 
}: CharacterWithSkinProps) => {
  const meshRef = useRef<THREE.Group>(null)
  
  // 載入GLB模型 (hooks必須在頂層調用)
  const gltfResult = useGLTF(CHARACTER_PATHS[skinId])
  const model = gltfResult.scene
  const modelError = gltfResult.error
  
  // 載入對應的貼圖
  const colorTexture = useTexture(TEXTURE_PATHS[skinId])
  
  // 錯誤處理
  useEffect(() => {
    if (modelError) {
      console.error(`載入GLB模型失敗 (${skinId}):`, modelError)
    }
  }, [modelError, skinId])
  
  useEffect(() => {
    console.log(`🎭 角色模型載入狀態 [${skinId}]:`, {
      modelPath: CHARACTER_PATHS[skinId],
      texturePath: TEXTURE_PATHS[skinId],
      modelLoaded: !!model,
      textureLoaded: !!colorTexture,
      modelError: !!modelError,
      modelType: model ? typeof model : 'undefined',
      modelChildren: model ? model.children?.length : 0
    })
    
    if (model) {
      console.log(`✅ GLB模型載入成功 [${skinId}]:`, model)
    }
    
    if (colorTexture) {
      console.log(`✅ 貼圖載入成功 [${skinId}]:`, colorTexture)
    }
  }, [skinId, model, colorTexture, modelError])
  
  // 處理模型材質更新
  const processedModel = useMemo(() => {
    console.log(`🔧 處理模型材質 [${skinId}]:`, { 
      hasModel: !!model, 
      hasTexture: !!colorTexture,
      modelChildren: model?.children?.length 
    })
    
    if (!model || !colorTexture) {
      console.log(`⏳ 等待資源載入 [${skinId}]: 模型=${!!model}, 貼圖=${!!colorTexture}`)
      return null
    }
    
    console.log(`✨ 開始處理模型 [${skinId}]...`)
    
    // 複製模型以避免修改原始資源
    const clonedModel = model.clone()
    
    // 設定貼圖屬性
    colorTexture.flipY = false
    colorTexture.minFilter = THREE.LinearFilter
    colorTexture.magFilter = THREE.LinearFilter
    colorTexture.wrapS = THREE.RepeatWrapping
    colorTexture.wrapT = THREE.RepeatWrapping
    
    // 創建Toon材質
    const toonMaterial = new THREE.MeshToonMaterial({
      map: colorTexture,
      transparent: true,
      alphaTest: 0.5,
    })
    
    let meshCount = 0
    // 遍歷所有網格，應用新材質
    clonedModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = toonMaterial
        child.castShadow = true
        child.receiveShadow = true
        meshCount++
      }
    })
    
    console.log(`🎨 材質應用完成 [${skinId}]: 處理了 ${meshCount} 個網格`)
    
    // 確保模型以腳部為原點（大多數角色模型的標準）
    // 如果模型的中心點不在腳部，可以在此處調整
    // clonedModel.position.y = 0 // 根據具體模型調整
    
    return clonedModel
  }, [model, colorTexture, skinId])
  
  // 當模型載入完成時調用回調
  useEffect(() => {
    if (processedModel && onLoad) {
      onLoad(processedModel)
    }
  }, [processedModel, onLoad])
  
  // 如果模型未載入，顯示備用幾何體
  if (!processedModel) {
    return (
      <group 
        ref={meshRef}
        scale={scale}
        position={position}
        rotation={rotation}
      >
        {/* 備用幾何體 - 簡單的角色形狀 */}
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.4, 1.5, 8]} />
          <meshLambertMaterial color="#87CEEB" />
        </mesh>
        
        {/* 頭部 */}
        <mesh position={[0, 2, 0]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshLambertMaterial color="#FDBCB4" />
        </mesh>
        
        {/* 載入提示 */}
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      </group>
    )
  }
  
  return (
    <group 
      ref={meshRef}
      scale={scale}
      position={position}
      rotation={rotation}
    >
      <primitive object={processedModel} />
    </group>
  )
}

// 預載入所有角色模型
export const preloadAllCharacterModels = () => {
  Object.values(CHARACTER_PATHS).forEach((path) => {
    useGLTF.preload(path)
  })
  Object.values(TEXTURE_PATHS).forEach((path) => {
    useTexture.preload(path)
  })
}

// 皮膚選擇器Hook
export const useCharacterSkin = (initialSkinId: CharacterSkinId) => {
  const [currentSkinId, setCurrentSkinId] = useState<CharacterSkinId>(initialSkinId)
  
  const changeSkin = (newSkinId: CharacterSkinId) => {
    setCurrentSkinId(newSkinId)
  }
  
  const getAvailableSkins = (type: 'npc' | 'player') => {
    return Object.keys(CHARACTER_PATHS).filter(skinId => 
      type === 'npc' ? skinId.startsWith('npc-') : skinId.startsWith('player-')
    ) as CharacterSkinId[]
  }
  
  return {
    currentSkinId,
    changeSkin,
    getAvailableSkins
  }
}

// 角色信息映射
export const CHARACTER_INFO = {
  'npc-1': { name: '陸培修', nickname: '鋁配咻', type: 'male' },
  'npc-2': { name: '劉宇岑', nickname: '流羽岑', type: 'female' },
  'npc-3': { name: '陳庭安', nickname: '沉停鞍', type: 'male' },
  'player-female-main': { name: '主角', nickname: '女性A', type: 'female' },
  'player-male-default': { name: '主角', nickname: '男性A', type: 'male' },
  'player-female-simple': { name: '主角', nickname: '女性E', type: 'female' },
} as const