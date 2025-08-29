import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { getTerrainHeight, getTerrainRotation, getTerrainSlope, isPathClear } from './TerrainModel'
import { CameraController } from './CameraController'

// NPC 類型定義（與 gameStore 保持一致）
interface NPC {
  id: string
  name: string
  personality: string
  currentMood: string
  position: [number, number, number]
  relationshipLevel: number
  lastInteraction?: Date
  isInConversation?: boolean
  conversationContent?: string
  conversationPartner?: string
}

interface PlayerProps {
  position?: [number, number, number]
  modelPath?: string
  modelFile?: string
}

interface PlayerRef {
  getPosition: () => THREE.Vector3
  getRef: () => THREE.Group | null
}

export const Player = forwardRef<PlayerRef, PlayerProps>(({ 
  position = [0, 0, 0], 
  modelPath = '/characters/CHAR-F-A',
  modelFile = '/CHAR-F-A.glb'
}: PlayerProps, ref) => {
  const playerRef = useRef<THREE.Group>(null)
  const { setPlayerPosition, setPlayerRotation, npcs, startConversation } = useGameStore()
  const isMounted = useRef(true)
  const interactionDistance = 5 // 互動距離（單位） - 增加到5單位

  // 使用與 NPC 相同的 Kenney Assets 載入邏輯
  const fullModelPath = `${modelPath}${modelFile}`
  console.log('📁 Loading Player model from:', fullModelPath)
  console.log('🎮 Player組件已渲染，位置:', position)
  
  // 使用useLoader載入GLB模型 - 與NPC相同的方式
  const kenneyModel = useLoader(GLTFLoader, fullModelPath, (loader) => {
    const basePath = fullModelPath.substring(0, fullModelPath.lastIndexOf('/') + 1)
    loader.setResourcePath(basePath)
    console.log(`📁 設定Player資源路徑: ${basePath}`)
  })
  
  // 克隆場景避免多個實例間的衝突
  const [playerScene, setPlayerScene] = useState<THREE.Group | null>(null)

  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null)

  // 提供 ref 介面給父組件
  useImperativeHandle(ref, () => ({
    getPosition: () => {
      if (playerRef.current) {
        return playerRef.current.position.clone()
      }
      return new THREE.Vector3(...position)
    },
    getRef: () => playerRef.current
  }), [])

  // 移動相關狀態
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const cameraRotation = useRef(0)
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false  // Shift鍵奔跑
  })

  // 玩家狀態
  const isMoving = useRef(false)
  const walkCycle = useRef(0)

  // 處理模型載入完成 - 與 NPC 完全相同的邏輯
  useEffect(() => {
    if (kenneyModel?.scene) {
      console.log(`✅ Player ${fullModelPath} 模型載入成功:`, kenneyModel.scene)
      
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
  }, [kenneyModel, fullModelPath])

  // 處理動畫 - 與 NPC 相同邏輯
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
  
  // 檢查附近的 NPC
  const checkNearbyNPC = useCallback((): NPC | null => {
    if (!playerRef.current) return null
    
    const playerPos = new THREE.Vector3()
    playerRef.current.getWorldPosition(playerPos)
    
    // 尋找最近的 NPC
    let nearestNPC: NPC | null = null
    let nearestDistance = Infinity
    
    npcs.forEach((npc) => {
      const npcPos = new THREE.Vector3(npc.position[0], npc.position[1], npc.position[2])
      const distance = playerPos.distanceTo(npcPos)
      
      if (distance < interactionDistance && distance < nearestDistance) {
        nearestDistance = distance
        nearestNPC = npc
      }
    })
    
    return nearestNPC
  }, [npcs, interactionDistance])
  
  // F鍵互動處理
  const handleInteraction = useCallback(() => {
    const nearbyNPC: NPC | null = checkNearbyNPC()
    
    if (nearbyNPC) {
      console.log(`與 ${nearbyNPC.name} 開始對話 (距離: ${nearbyNPC.position})`)
      startConversation(nearbyNPC.id)
    } else {
      console.log('附近沒有可互動的 NPC')
    }
  }, [checkNearbyNPC, startConversation])

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = true  // Shift鍵奔跑
          break
        case 'KeyF':
          // F鍵互動 - 檢查附近的NPC
          handleInteraction()
          break
        case 'KeyR':
          // R鍵重置人物位置到安全地點
          if (playerRef.current) {
            const safePosition = [0, 0, 0] // 安全的中心位置
            // 先設置到較高位置避免沉入地下
            playerRef.current.position.set(safePosition[0], 15, safePosition[2])
            
            // 延遲檢測地形高度
            setTimeout(() => {
              const terrainHeight = getTerrainHeight(safePosition[0], safePosition[2])
              const adjustedY = Math.max(terrainHeight + 2.0, 8.0) // 確保最少8單位高度
              playerRef.current!.position.set(safePosition[0], adjustedY, safePosition[2])
              setPlayerPosition([safePosition[0], adjustedY, safePosition[2]])
              console.log(`按R鍵重置人物位置: [${safePosition[0]}, ${adjustedY.toFixed(2)}, ${safePosition[2]}], 地形高度: ${terrainHeight.toFixed(2)}`)
            }, 100)
          }
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = false  // 釋放Shift鍵
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleInteraction])  // 加入 handleInteraction 依賴

  // 每幀更新
  useFrame((_, delta) => {
    if (!playerRef.current) return

    // 更新動畫混合器
    if (animationMixer) {
      animationMixer.update(delta)
    }

    // 重置方向向量
    direction.current.set(0, 0, 0)

    // PC遊戲：鍵盤輸入 (設定本地方向向量)
    if (keys.current.forward) direction.current.z = 1    // W鍵：本地前方
    if (keys.current.backward) direction.current.z = -1  // S鍵：本地後方
    if (keys.current.left) direction.current.x = -1      // A鍵：本地左方（修正方向）
    if (keys.current.right) direction.current.x = 1      // D鍵：本地右方（修正方向）

    // 正規化方向向量
    if (direction.current.length() > 0) {
      direction.current.normalize()
      
      // 計算移動方向
      const moveDirection = new THREE.Vector3()
      
      // 檢查是否在 Pointer Lock 模式
      const isPointerLocked = !!document.pointerLockElement
      
      if (isPointerLocked) {
        // PC遊戲 Pointer Lock 模式 - 基於相機朝向移動
        // Three.js坐標系：Z軸負方向為forward，X軸正方向為right
        const forward = new THREE.Vector3(0, 0, -1)  
        const right = new THREE.Vector3(1, 0, 0)    // 標準右向量
        
        // 根據相機旋轉調整方向向量
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.current)
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.current)
        
        // 正確的方向映射
        moveDirection.addScaledVector(forward, direction.current.z)   // Z軸：前後移動
        moveDirection.addScaledVector(right, direction.current.x)     // X軸：左右移動
      } else {
        // 標準模式 - 世界坐標移動
        // 在 Three.js 中，Z 軸負方向是前進
        moveDirection.x = direction.current.x
        moveDirection.z = -direction.current.z
      }
      
      moveDirection.normalize()

      // 移動速度設定 - 適應10倍擴展地形，提高移動速度
      let speed = 25  // 正常行走速度 (從8提高到25)
      if (keys.current.shift) speed = 45  // Shift - 奔跑 (從15提高到45)
      velocity.current.copy(moveDirection.multiplyScalar(speed * delta))

      // 分步移動防止跳過碰撞檢測
      let currentPos = playerRef.current.position.clone()
      const totalMovement = velocity.current.clone()
      const maxStepSize = 0.1 // 最大步長，防止跳過碰撞
      const steps = Math.ceil(totalMovement.length() / maxStepSize)
      const stepMovement = totalMovement.divideScalar(steps)
      
      // 只在第一次檢查時顯示碰撞物體數量
      if (Math.random() < 0.01) { // 1%機率輸出碰撞物體數量
        const treeCount = collisionSystem.getTreeCount()
        const waterCount = collisionSystem.getWaterCount()
        console.log(`已註冊樹木數量: ${treeCount}, 水域邊界數量: ${waterCount}`)
      }
      
      let validPosition = currentPos.clone()
      let blocked = false
      
      // 逐步移動，每步都檢查碰撞
      for (let i = 0; i < steps && !blocked; i++) {
        const nextPosition = validPosition.clone().add(stepMovement)
        
        if (collisionSystem.isValidPosition(nextPosition, 0.5)) {
          validPosition = nextPosition
        } else {
          // 被阻擋，嘗試找到部分有效的移動
          const partialMovement = collisionSystem.getClosestValidPosition(
            validPosition,
            nextPosition,
            0.5
          )
          
          if (partialMovement.distanceTo(validPosition) > 0.001) {
            validPosition = partialMovement
            console.log(`玩家被物體阻擋，部分移動到: (${validPosition.x.toFixed(1)}, ${validPosition.z.toFixed(1)})`)
          } else {
            console.log(`玩家被物體完全阻擋`)
          }
          blocked = true
        }
      }
      
      // 然後檢查山脈路徑是否暢通
      if (!isPathClear(currentPos.x, currentPos.z, validPosition.x, validPosition.z)) {
        // 如果路徑被山脈阻擋，嘗試找到可達的位置
        const direction = new THREE.Vector3().subVectors(validPosition, currentPos).normalize()
        let testDistance = 0.5
        let safePosition = currentPos.clone()
        
        // 更細粒度地測試移動，防止擠過物體
        while (testDistance < currentPos.distanceTo(validPosition)) {
          const testPos = currentPos.clone().add(direction.clone().multiplyScalar(testDistance))
          
          // 檢查山脈和物體碰撞
          if (isPathClear(currentPos.x, currentPos.z, testPos.x, testPos.z) &&
              collisionSystem.isValidPosition(testPos, 0.5)) {
            safePosition = testPos
            testDistance += 0.1 // 使用更小的步長，防止擠過物體
          } else {
            break
          }
        }
        
        validPosition = safePosition
        console.log(`玩家被山脈阻擋，最終位置: (${validPosition.x.toFixed(1)}, ${validPosition.z.toFixed(1)})`)
      }
      
      // Player浮空模式：保持固定高度，不貼合地形
      const adjustedPosition = validPosition.clone()
      // 保持浮空高度，不進行地形調整
      adjustedPosition.y = 15 // 固定浮在高度15
      
      playerRef.current.position.copy(adjustedPosition)
      
      // Player浮空模式：保持垂直姿態，不適應地形傾斜
      playerRef.current.rotation.x = THREE.MathUtils.lerp(playerRef.current.rotation.x, 0, 0.1)
      playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, 0, 0.1)
      
      // 走路動畫
      isMoving.current = true
      walkCycle.current += delta * 10
      // 移除持續的位置更新，避免觸發重複重置
      // if (isMounted.current) {
      //   setPlayerPosition([adjustedPosition.x, adjustedPosition.y, adjustedPosition.z])
      // }

      // PC遊戲：角色朝向邏輯
      if (moveDirection.length() > 0 && !isPointerLocked) {
        // 只在非 Pointer Lock 模式下，角色面向移動方向
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
        playerRef.current.rotation.y = THREE.MathUtils.lerp(
          playerRef.current.rotation.y,
          targetRotation,
          8 * delta
        )
        // 移除不必要的旋轉更新，避免觸發重複重置
        // if (isMounted.current) {
        //   setPlayerRotation(targetRotation)
        // }
      } else if (isPointerLocked) {
        // Pointer Lock 模式下，角色朝向跟隨移動方向
        if (moveDirection.length() > 0) {
          const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
          playerRef.current.rotation.y = THREE.MathUtils.lerp(
            playerRef.current.rotation.y,
            targetRotation,
            10 * delta
          )
          if (isMounted.current) {
            setPlayerRotation(targetRotation)
          }
        }
      }
    } else {
      isMoving.current = false
    }
    
    // Player浮空模式：走路時的上下擺動，但保持固定高度
    if (isMoving.current && playerRef.current) {
      const bobAmount = Math.sin(walkCycle.current) * 0.05
      // 固定浮空高度加上輕微的走路擺動
      playerRef.current.position.y = 15 + bobAmount
    } else if (playerRef.current) {
      // 靜止時保持固定浮空高度和垂直姿態
      playerRef.current.position.y = 15
      
      // 保持垂直姿態
      playerRef.current.rotation.x = THREE.MathUtils.lerp(playerRef.current.rotation.x, 0, 0.05)
      playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, 0, 0.05)
    }
  })

  // Component lifecycle management
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 使用ref跟踪是否已經初始化，避免重複初始化
  const hasInitialized = useRef(false)
  
  // 初始化玩家位置 - 像 NPC 一樣浮在半空中，不進行地形檢測
  useEffect(() => {
    if (playerRef.current && !hasInitialized.current && isMounted.current) {
      hasInitialized.current = true
      console.log('開始初始化玩家位置...')
      
      // 使用固定的浮空位置，像 NPC 一樣
      const initialPosition = [-3, 15, -3] // 固定浮在高度15
      playerRef.current.position.set(initialPosition[0], initialPosition[1], initialPosition[2])
      
      console.log(`玩家設定為浮空位置: [${initialPosition[0]}, ${initialPosition[1]}, ${initialPosition[2]}]`)
    }
  }, []) // 不依賴任何props，只在組件掛載時執行一次

  return (
    <>
      <CameraController 
        target={playerRef} 
        offset={new THREE.Vector3(0, 5, 8)}  // 更近的第三人稱視角
        lookAtOffset={new THREE.Vector3(0, 1.5, 0)}
        smoothness={8}  // 更平滑的相機移動
        enableRotation={true}  // PC模式：啟用旋轉
        enablePointerLock={true}  // 啟用永久 pointer lock
        onRotationChange={(rotation) => { cameraRotation.current = rotation }}
      />
      
      <group ref={playerRef} position={position}>
        {/* Kenney GLB 角色模型 - 與 NPC 完全相同的渲染方式 */}
        {kenneyModel?.scene && (
          <group scale={[2.2, 2.2, 2.2]} position={[0, -1.1, 0]}>
            <primitive 
              object={kenneyModel.scene} 
              frustumCulled={false}
              visible={true}
            />
          </group>
        )}


        {/* 玩家陰影圓圈 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[0.8, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.3} />
        </mesh>
      </group>
    </>
  )
})