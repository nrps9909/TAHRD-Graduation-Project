import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { Text, Billboard, RoundedBox } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { getTerrainHeight, isValidGroundPosition, isPathClear, isOnRoadSurface, getNearestRoadPoint, getTerrainNormal, getTerrainSlope } from './TerrainModel'
import * as THREE from 'three'

interface NPCCharacterProps {
  npc: {
    id: string
    name: string
    personality: string
    currentMood: string
    relationshipLevel: number
  }
  position: [number, number, number]
  conversationContent?: string
  isInConversation?: boolean
}

export const NPCCharacter = ({ npc, position, conversationContent, isInConversation }: NPCCharacterProps) => {
  const meshRef = useRef<THREE.Group>(null)
  const bubbleRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(...position))
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...position))
  const [isNon3DPosition] = useState(true) // 關閉3D地形調整，讓NPC飄浮在空中
  
  // 初始化時處理位置設定
  useEffect(() => {
    console.log(`NPC ${npc.name} 接收到的位置:`, position, `是否非3D:`, isNon3DPosition)
    
    if (isNon3DPosition) {
      // 非3D位置：直接使用設定的位置，不進行地形調整
      const adjustedPosition = new THREE.Vector3(position[0], position[1], position[2])
      setCurrentPosition(adjustedPosition)
      setTargetPosition(adjustedPosition)
      updateNpcPosition(npc.id, [adjustedPosition.x, adjustedPosition.y, adjustedPosition.z])
      console.log(`NPC ${npc.name} 設定為非3D位置:`, adjustedPosition.toArray())
    } else {
      // 3D模型內位置：調整到地形高度
      // 先使用較高的臨時位置，避免沉入地下
      const tempPosition = new THREE.Vector3(position[0], Math.max(position[1], 20), position[2])
      setCurrentPosition(tempPosition)
      setTargetPosition(tempPosition)
      
      // 檢測實際的3D路面高度並貼合
      const detectRoadSurfaceHeight = (attempts: number = 0) => {
        if (attempts >= 15) { // 增加嘗試次數
          console.warn(`NPC ${npc.name} 路面高度檢測失敗，使用安全高度`)
          const fallbackPosition = new THREE.Vector3(position[0], 5, position[2]) // 使用稍高的安全高度
          setCurrentPosition(fallbackPosition)
          setTargetPosition(fallbackPosition)
          updateNpcPosition(npc.id, [fallbackPosition.x, fallbackPosition.y, fallbackPosition.z])
          return
        }
        
        const terrainHeight = getTerrainHeight(position[0], position[2])
        console.log(`🏔️ NPC ${npc.name} 嘗試著陸 ${attempts + 1}: 檢測到地形高度 ${terrainHeight.toFixed(2)}`)
        
        if (terrainHeight > -100 && terrainHeight < 200) { // 擴大有效地形高度範圍
          // 加上角色高度偏移，確保腳部貼合路面（適應GLB模型）
          const characterHeightOffset = 0 // 腳底直接貼合地形，不額外偏移
          const adjustedPosition = new THREE.Vector3(position[0], terrainHeight + characterHeightOffset, position[2])
          setCurrentPosition(adjustedPosition)
          setTargetPosition(adjustedPosition)
          updateNpcPosition(npc.id, [adjustedPosition.x, adjustedPosition.y, adjustedPosition.z])
          
          const isOnRoad = isOnRoadSurface(position[0], position[2])
          console.log(`🎯 NPC ${npc.name} 成功著陸於3D陸地:`, adjustedPosition.toArray())
          console.log(`   地形高度: ${terrainHeight.toFixed(2)}, 最終Y座標: ${(terrainHeight + characterHeightOffset).toFixed(2)}`)
          console.log(`   ${isOnRoad ? '✅ 位於道路上' : '🌿 位於野外'}`)
        } else {
          // 路面還未載入，繼續嘗試
          setTimeout(() => detectRoadSurfaceHeight(attempts + 1), 300)
        }
      }
      
      // 延遲1000ms後開始檢測，確保地形完全載入
      setTimeout(() => detectRoadSurfaceHeight(), 1000)
    }
  }, [])
  const [walkSpeed] = useState(2.5) // 提高移動速度，讓NPCs更活躍
  const [nextMoveTime, setNextMoveTime] = useState(Date.now() + 3000 + Math.random() * 5000) // 等待3-8秒即可開始移動
  const { setSelectedNpc, startConversation, selectedNpc, updateNpcPosition } = useGameStore()
  const { camera } = useThree()

  // Kenney角色模型路徑映射
  const KENNEY_MODEL_PATHS = {
    'char-m-a': '/characters/CHAR-M-A/CHAR-M-A.glb',
    'char-f-b': '/characters/CHAR-F-B/CHAR-F-B.glb',
    'char-m-c': '/characters/CHAR-M-C/CHAR-M-C.glb'
  } as const

  const getKenneyCharacterType = (npcName: string): keyof typeof KENNEY_MODEL_PATHS => {
    if (npcName.includes('劉宇岑') || npcName.includes('流羽岑')) {
      return 'char-f-b'
    }
    if (npcName.includes('陸培修') || npcName.includes('鋁配咻')) {
      return 'char-m-a'
    }
    if (npcName.includes('陳庭安') || npcName.includes('沉停鞍')) {
      return 'char-m-c'
    }
    return 'char-m-a'
  }

  const kenneyCharCode = getKenneyCharacterType(npc.name)
  const modelPath = KENNEY_MODEL_PATHS[kenneyCharCode]

  console.log(`🎭 NPC ${npc.name} 使用模型: ${kenneyCharCode} -> ${modelPath}`)

  // 使用useLoader載入GLB模型
  const kenneyModel = useLoader(GLTFLoader, modelPath, (loader) => {
    const basePath = modelPath.substring(0, modelPath.lastIndexOf('/') + 1)
    loader.setResourcePath(basePath)
    console.log(`📁 設定資源路徑: ${basePath}`)
  })
  
  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null)

  // 處理模型載入完成
  useEffect(() => {
    if (kenneyModel?.scene) {
      console.log(`✅ NPC ${npc.name} 模型載入成功:`, kenneyModel.scene)
      
      kenneyModel.scene.traverse((child: any) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.visible = true
          child.frustumCulled = false
          child.castShadow = true
          child.receiveShadow = false
          
          if (child.material) {
            if (child.isSkinnedMesh) {
              child.material.skinning = true
            }
            
            if (child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace
              child.material.map.needsUpdate = true
            }
            
            child.material.metalness = 0
            child.material.roughness = 0.8
            child.material.side = THREE.DoubleSide
            child.material.transparent = false
            child.material.opacity = 1
            child.material.depthWrite = true
            child.material.colorWrite = true
            child.material.needsUpdate = true
          }
        }
      })
      
      kenneyModel.scene.visible = true
      kenneyModel.scene.frustumCulled = false
    }
  }, [kenneyModel, npc.name, modelPath])

  // 處理動畫
  useEffect(() => {
    if (kenneyModel?.scene && kenneyModel.animations && kenneyModel.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(kenneyModel.scene)
      setAnimationMixer(mixer)
      
      const idleAnimation = kenneyModel.animations.find((clip: THREE.AnimationClip) => 
        clip.name.toLowerCase().includes('idle') || 
        clip.name.toLowerCase().includes('stand')
      ) || kenneyModel.animations[0]
      
      if (idleAnimation) {
        const action = mixer.clipAction(idleAnimation)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.play()
      }
      
      return () => {
        mixer.stopAllAction()
        mixer.uncacheRoot(kenneyModel.scene)
      }
    }
  }, [kenneyModel])

  // 根據關係等級調整角色大小
  const getSize = (level: number) => 1 + (level - 1) * 0.1

  // 設置新的道路目標位置 - NPCs優先在道路上移動
  const setNewTarget = () => {
    if (!isInConversation) {
      let attempts = 0
      let validTarget = null
      
      // 90%機率沿著道路移動，10%機率隨機探索
      const shouldStayOnRoad = Math.random() < 0.9
      
      // 嘗試找到一個有效的目標位置
      while (attempts < 30 && !validTarget) {
        let newX, newZ
        
        if (shouldStayOnRoad) {
          // 優先在道路上移動
          const isCurrentlyOnRoad = isOnRoadSurface(currentPosition.x, currentPosition.z)
          
          if (isCurrentlyOnRoad) {
            // 如果當前在道路上，沿著道路方向移動
            const roadDirections = [
              { x: 1, z: 0 },   // 東
              { x: -1, z: 0 },  // 西
              { x: 0, z: 1 },   // 南  
              { x: 0, z: -1 },  // 北
              { x: 0.7, z: 0.7 },   // 東南
              { x: -0.7, z: 0.7 },  // 西南
              { x: 0.7, z: -0.7 },  // 東北
              { x: -0.7, z: -0.7 }, // 西北
            ]
            
            const randomDirection = roadDirections[Math.floor(Math.random() * roadDirections.length)]
            const distance = 5 + Math.random() * 10 // 5-15 單位的道路移動
            newX = currentPosition.x + randomDirection.x * distance
            newZ = currentPosition.z + randomDirection.z * distance
          } else {
            // 如果不在道路上，找最近的道路點
            const nearestRoad = getNearestRoadPoint(currentPosition.x, currentPosition.z)
            // 向道路方向移動，但加入一些隨機性
            newX = nearestRoad[0] + (Math.random() - 0.5) * 6 // ±3單位的隨機偏移
            newZ = nearestRoad[1] + (Math.random() - 0.5) * 6
          }
        } else {
          // 隨機探索（保留原有的隨機移動機制，但範圍較小）
          const angle = Math.random() * Math.PI * 2
          const distance = 8 + Math.random() * 12 // 8-20 單位的移動距離
          newX = currentPosition.x + Math.cos(angle) * distance
          newZ = currentPosition.z + Math.sin(angle) * distance
        }
        
        // 限制在合理範圍內
        const clampedX = Math.max(-40, Math.min(40, newX))
        const clampedZ = Math.max(-40, Math.min(40, newZ))
        
        // 檢查是否為有效的地面位置
        if (!isValidGroundPosition(clampedX, clampedZ)) {
          attempts++
          continue
        }
        
        // 檢查路徑是否暢通
        if (!isPathClear(currentPosition.x, currentPosition.z, clampedX, clampedZ)) {
          attempts++
          continue
        }
        
        // 檢測目標位置的實際路面高度並加上角色偏移
        const targetTerrainHeight = getTerrainHeight(clampedX, clampedZ)
        const characterHeightOffset = 0 // 腳底直接貼合地形，不額外偏移
        const testPosition = new THREE.Vector3(clampedX, targetTerrainHeight + characterHeightOffset, clampedZ)
        
        // 檢查位置是否有效（碰撞檢測）
        const isValid = collisionSystem.isValidPosition(testPosition, 0.3)
        
        // 如果目標在道路上，給予優先權
        const isTargetOnRoad = isOnRoadSurface(clampedX, clampedZ)
        const shouldAccept = isValid && (isTargetOnRoad || !shouldStayOnRoad || attempts > 20)
        
        if (shouldAccept) {
          validTarget = testPosition
          const movementType = isTargetOnRoad ? '沿道路移動' : (shouldStayOnRoad ? '找路到道路' : '自由探索')
          console.log(`NPC ${npc.name} ${movementType}到 (${clampedX.toFixed(1)}, ${clampedZ.toFixed(1)}) ${isTargetOnRoad ? '✅ 道路上' : ''}`)
        }
        
        attempts++
      }
      
      // 如果找到有效位置就設為目標，否則保持當前位置
      if (validTarget) {
        setTargetPosition(validTarget)
      }
      
      // 調整移動間隔 - 道路移動更頻繁，探索移動間隔較長
      const nextInterval = shouldStayOnRoad
        ? 3000 + Math.random() * 5000  // 道路移動：3-8秒
        : 8000 + Math.random() * 12000 // 探索移動：8-20秒
      
      setNextMoveTime(Date.now() + nextInterval)
    }
  }

  // 定期更新目標位置
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() > nextMoveTime && !isInConversation && !isNon3DPosition) {
        setNewTarget()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [nextMoveTime, isInConversation, currentPosition])

  // 動畫和移動
  useFrame((state, delta) => {
    // 更新動畫mixer
    if (animationMixer) {
      animationMixer.update(delta)
    }

    if (meshRef.current) {
      // 移動到目標位置（只有3D地形模式的NPC才移動）
      if (!isInConversation && !isNon3DPosition) {
        const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition)
        const distance = direction.length()
        
        if (distance > 0.1) {
          direction.normalize()
          const moveDistance = Math.min(walkSpeed * delta, distance)
          const newPosition = currentPosition.clone().add(direction.clone().multiplyScalar(moveDistance))
          
          // 使用碰撞系統檢查新位置是否有效
          const validPosition = collisionSystem.getClosestValidPosition(
            currentPosition,
            newPosition,
            0.3 // NPC半徑稍小
          )
          
          // 更新當前位置
          setCurrentPosition(validPosition.clone())
          
          // 更新位置（半空中行走模式）
          meshRef.current.position.x = validPosition.x
          meshRef.current.position.z = validPosition.z
          if (isNon3DPosition) {
            // 半空中行走：保持目標位置的Y軸高度
            meshRef.current.position.y = validPosition.y
          } else {
            // 地形貼合模式：檢測地形高度
            const currentTerrainHeight = getTerrainHeight(validPosition.x, validPosition.z)
            const characterHeightOffset = 0 // 腳底直接貼合地形，不額外偏移
            meshRef.current.position.y = currentTerrainHeight + characterHeightOffset
          }
          
          // 更新 store 中的位置（每隔一段時間更新，避免過於頻繁）
          if (Math.random() < 0.1) { // 10% 機率更新，約每秒10次
            // GLB模型以腳部為原點，store中記錄地形高度即可
            const terrainHeightForStore = getTerrainHeight(validPosition.x, validPosition.z)
            updateNpcPosition(npc.id, [validPosition.x, terrainHeightForStore, validPosition.z])
          }
          
          // 面向移動方向
          if (!hovered && validPosition.distanceTo(currentPosition) > 0.01) {
            const actualDirection = new THREE.Vector3().subVectors(validPosition, currentPosition).normalize()
            meshRef.current.rotation.y = Math.atan2(actualDirection.x, actualDirection.z)
          }
        }
      }
      
      // 獲取當前位置用於後續檢測
      const currentX = meshRef.current.position.x
      const currentZ = meshRef.current.position.z
      
      // 只在非對話狀態和非移動狀態下才重新檢測地形高度，避免與移動邏輯衝突
      if (!isInConversation && !isNon3DPosition) {
        const currentTerrainHeight = getTerrainHeight(currentX, currentZ)
        
        // 檢查地形高度是否有效，並增加安全邊界
        if (currentTerrainHeight > -100 && currentTerrainHeight < 200) {
          const characterHeightOffset = 0 // 腳底直接貼合地形，不額外偏移
          const floatingAnimation = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.02 // 減少浮動幅度
          
          // 計算目標高度：地形高度 + 輕微浮動動畫，讓腳底真正貼合地形
          const targetY = currentTerrainHeight + characterHeightOffset + floatingAnimation
          
          // 平滑過渡到正確的地形高度，避免突兀跳躍
          const currentY = meshRef.current.position.y
          const lerpSpeed = Math.abs(targetY - currentY) > 5 ? 0.05 : 0.1 // 距離太遠時降低插值速度
          meshRef.current.position.y = THREE.MathUtils.lerp(currentY, targetY, lerpSpeed)
        } else {
          // 地形檢測失敗時，嘗試使用備用地形高度檢測
          const backupHeight = 0 // 使用地面高度作為備用
          meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, backupHeight, 0.02)
        }
      }
      
      // 檢查是否在道路上（用於調試）
      const isCurrentlyOnRoad = isOnRoadSurface(currentX, currentZ)
      if (Math.random() < 0.001) { // 偶爾輸出位置信息，避免控制台過於擁擠
        const debugTerrainHeight = getTerrainHeight(currentX, currentZ)
        console.log(`🚶 NPC ${npc.name} 位置: (${currentX.toFixed(1)}, ${debugTerrainHeight.toFixed(1)}, ${currentZ.toFixed(1)}) ${isCurrentlyOnRoad ? '✅ 道路上' : ''}`)
      }
      
      // 地形適應：根據地面傾斜調整NPC姿態（除非被選中或懸停）
      if (!hovered && selectedNpc !== npc.id) {
        const terrainNormal = getTerrainNormal(currentX, currentZ)
        const terrainSlope = getTerrainSlope(currentX, currentZ)
        
        // 只有在地形傾斜不太陡峭時才調整姿態（避免過度傾斜）
        if (terrainSlope < Math.PI / 6) { // 30度以內的傾斜才調整
          // 計算地形適應的旋轉角度
          const upVector = new THREE.Vector3(0, 1, 0)
          const quaternion = new THREE.Quaternion()
          quaternion.setFromUnitVectors(upVector, terrainNormal)
          
          // 應用地形適應旋轉，但保持溫和的調整
          const euler = new THREE.Euler().setFromQuaternion(quaternion)
          meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, euler.x * 0.3, 0.1)
          meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, euler.z * 0.3, 0.1)
        } else {
          // 地形過於陡峭時保持直立
          meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.1)
          meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1)
        }
      }
      
      // 如果被選中或懸停，面向攝影機
      if (hovered || selectedNpc === npc.id) {
        const lookAtPos = new THREE.Vector3(camera.position.x, meshRef.current.position.y, camera.position.z)
        meshRef.current.lookAt(lookAtPos)
      }
    }
    
    // 對話泡泡的可愛動畫
    if (bubbleRef.current && isInConversation) {
      // 輕微的縮放脈動
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05
      bubbleRef.current.scale.setScalar(scale)
      
      // 輕微的旋轉搖擺
      bubbleRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.02
    }
    
    // 名字標籤的可愛動畫
    if (nameRef.current) {
      // 懸浮效果
      nameRef.current.position.y = (isInConversation && conversationContent ? 7.5 * size : 3.5 * size) 
        + Math.sin(state.clock.elapsedTime * 2.5) * 0.1
      
      // 選中時的脈動效果
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1
        nameRef.current.scale.setScalar(scale)
      }
    }
  })

  const handleClick = () => {
    setClicked(!clicked)
    if (selectedNpc === npc.id) {
      setSelectedNpc(null)
    } else {
      startConversation(npc.id)
    }
  }

  const size = getSize(npc.relationshipLevel)
  const isSelected = selectedNpc === npc.id

  return (
    <group
      ref={meshRef}
      position={[currentPosition.x, currentPosition.y, currentPosition.z]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      layers={0}
    >
      {/* Kenney GLB 角色模型 */}
      {kenneyModel?.scene && (
        <group scale={[2.2, 2.2, 2.2]} position={[0, -1.1, 0]}>
          <primitive 
            object={kenneyModel.scene} 
            frustumCulled={false}
            visible={true}
          />
        </group>
      )}
      
      {/* 調試標記 - 幫助定位NPC */}
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* 3D對話泡泡 - 使用Billboard永遠朝向玩家 */}
      {isInConversation && conversationContent && (
        <Billboard
          ref={bubbleRef}
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, 4.5 * size, 0]}
        >
          {/* 3D對話框背景 */}
          <RoundedBox
            args={[5, 2.5, 0.3]}
            radius={0.25}
            smoothness={4}
          >
            <meshPhysicalMaterial
              color="#FFE4E1"
              emissive="#FFB6C1"
              emissiveIntensity={0.2}
              roughness={0.3}
              metalness={0.1}
              clearcoat={1}
              clearcoatRoughness={0}
              transmission={0.1}
              thickness={0.5}
            />
          </RoundedBox>
          
          {/* 3D對話框邊框 */}
          <RoundedBox
            args={[5.2, 2.7, 0.25]}
            radius={0.3}
            smoothness={4}
            position={[0, 0, -0.05]}
          >
            <meshPhysicalMaterial
              color="#87CEEB"
              emissive="#4A90E2"
              emissiveIntensity={0.3}
              roughness={0.2}
              metalness={0.2}
            />
          </RoundedBox>
          
          {/* 對話文字 */}
          <Text
            position={[0, 0, 0.2]}
            fontSize={0.35}
            maxWidth={4.5}
            lineHeight={1.4}
            letterSpacing={0.02}
            textAlign="center"
            font="/fonts/font.TTC"
            anchorX="center"
            anchorY="middle"
            color="#2C3E50"
            outlineWidth={0.02}
            outlineColor="#FFFFFF"
          >
            {conversationContent}
          </Text>
          
          {/* 可愛的裝飾 - 星星 */}
          <mesh position={[-2.3, 1, 0.2]}>
            <coneGeometry args={[0.15, 0.3, 5]} />
            <meshPhysicalMaterial
              color="#FFD700"
              emissive="#FFA500"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          
          <mesh position={[2.3, 1, 0.2]}>
            <coneGeometry args={[0.15, 0.3, 5]} />
            <meshPhysicalMaterial
              color="#FFD700"
              emissive="#FFA500"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          
          {/* 對話框尾巴（3D三角形） */}
          <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.4, 0.8, 3]} />
            <meshPhysicalMaterial
              color="#FFE4E1"
              emissive="#FFB6C1"
              emissiveIntensity={0.2}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
        </Billboard>
      )}
      
      {/* 3D名字標籤 - 使用Billboard永遠朝向玩家 */}
      <Billboard
        ref={nameRef}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        position={[0, isInConversation && conversationContent ? 7.5 * size : 3.5 * size, 0]}
      >
        {/* 名字背景板 */}
        <RoundedBox
          args={[2, 0.8, 0.2]}
          radius={0.15}
          smoothness={4}
        >
          <meshPhysicalMaterial
            color={isSelected ? "#FFB6C1" : "#E6E6FA"}
            emissive={isSelected ? "#FF69B4" : "#9370DB"}
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0}
            transmission={0.2}
            thickness={0.3}
          />
        </RoundedBox>
        
        {/* 3D名字文字 */}
        <Text
          position={[0, 0, 0.15]}
          fontSize={0.4}
          font="/fonts/font.TTC"
          anchorX="center"
          anchorY="middle"
          color={isSelected ? "#FFFFFF" : "#4B0082"}
          outlineWidth={0.03}
          outlineColor={isSelected ? "#FF1493" : "#FFFFFF"}
        >
          {npc.name}
        </Text>
        
        {/* 可愛的愛心裝飾 */}
        {isSelected && (
          <>
            <mesh position={[-0.9, 0, 0.15]} scale={0.15}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshPhysicalMaterial
                color="#FF69B4"
                emissive="#FF1493"
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.3}
              />
            </mesh>
            <mesh position={[0.9, 0, 0.15]} scale={0.15}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshPhysicalMaterial
                color="#FF69B4"
                emissive="#FF1493"
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.3}
              />
            </mesh>
          </>
        )}
      </Billboard>
      
      {/* hover 效果 */}
      {hovered && (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[1, 1, 0.1, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* 選中效果 */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.05, 32]} />
          <meshBasicMaterial color="#FF6B6B" transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* 關係等級指示器 */}
      <group position={[0, 3 * size, 0]}>
        {Array.from({ length: npc.relationshipLevel }, (_, i) => (
          <mesh key={i} position={[(i - 2) * 0.2, 0.5, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        ))}
      </group>
    </group>
  )
}