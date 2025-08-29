import { useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
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
}

export const Player = ({ position = [0, 0, 0] }: PlayerProps) => {
  const playerRef = useRef<THREE.Group>(null)
  const { setPlayerPosition, setPlayerRotation, npcs, startConversation } = useGameStore()
  const isMounted = useRef(true)
  const interactionDistance = 5 // 互動距離（單位） - 增加到5單位

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
      
      // 獲取地形高度和旋轉
      const terrainHeight = getTerrainHeight(validPosition.x, validPosition.z)
      const terrainRotation = getTerrainRotation(validPosition.x, validPosition.z)
      const terrainSlope = getTerrainSlope(validPosition.x, validPosition.z)
      
      const adjustedPosition = validPosition.clone()
      // 讓整個角色都在地形上方：地形高度 + 角色中心點高度
      adjustedPosition.y = terrainHeight + 1.0
      
      playerRef.current.position.copy(adjustedPosition)
      
      // 根據地形傾斜調整角色旋轉（限制最大傾斜角度以保持自然）
      const maxTiltAngle = Math.PI / 8 // 22.5度最大傾斜
      if (terrainSlope < maxTiltAngle) {
        // 平滑插值到地形角度
        const lerpFactor = 0.1 // 插值係數，控制適應速度
        const targetRotation = terrainRotation
        
        playerRef.current.rotation.x = THREE.MathUtils.lerp(
          playerRef.current.rotation.x, 
          targetRotation.x * 0.3, // 減少X軸傾斜
          lerpFactor
        )
        playerRef.current.rotation.z = THREE.MathUtils.lerp(
          playerRef.current.rotation.z, 
          targetRotation.z * 0.3, // 減少Z軸傾斜
          lerpFactor
        )
      } else {
        // 地形太陡峭時回復垂直
        playerRef.current.rotation.x = THREE.MathUtils.lerp(playerRef.current.rotation.x, 0, 0.1)
        playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, 0, 0.1)
      }
      
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
    
    // 走路時的上下擺動 - 基於地形高度
    if (isMoving.current && playerRef.current) {
      const currentX = playerRef.current.position.x
      const currentZ = playerRef.current.position.z
      const terrainHeight = getTerrainHeight(currentX, currentZ)
      const bobAmount = Math.sin(walkCycle.current) * 0.05
      // 確保整個角色都在地形上方，設定最小高度避免沉入地下
      const safeY = Math.max(terrainHeight + 2.0, 3.0) + bobAmount
      playerRef.current.position.y = safeY
    } else if (playerRef.current) {
      // 靜止時也要保持在地形上方並適應地形傾斜
      const currentX = playerRef.current.position.x
      const currentZ = playerRef.current.position.z
      const terrainHeight = getTerrainHeight(currentX, currentZ)
      const terrainRotation = getTerrainRotation(currentX, currentZ)
      const terrainSlope = getTerrainSlope(currentX, currentZ)
      
      // 確保人物不會沉入地下，設定最小高度
      const safeY = Math.max(terrainHeight + 2.0, 3.0)
      playerRef.current.position.y = safeY
      
      // 靜止時也適應地形傾斜
      const maxTiltAngle = Math.PI / 8 // 22.5度最大傾斜
      if (terrainSlope < maxTiltAngle) {
        const lerpFactor = 0.05 // 靜止時較慢的適應速度
        playerRef.current.rotation.x = THREE.MathUtils.lerp(
          playerRef.current.rotation.x, 
          terrainRotation.x * 0.3,
          lerpFactor
        )
        playerRef.current.rotation.z = THREE.MathUtils.lerp(
          playerRef.current.rotation.z, 
          terrainRotation.z * 0.3,
          lerpFactor
        )
      } else {
        playerRef.current.rotation.x = THREE.MathUtils.lerp(playerRef.current.rotation.x, 0, 0.05)
        playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, 0, 0.05)
      }
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
  
  // 初始化玩家位置 - 只在組件首次掛載時執行一次
  useEffect(() => {
    if (playerRef.current && !hasInitialized.current && isMounted.current) {
      hasInitialized.current = true // 立即標記為已初始化，防止重複執行
      console.log('開始初始化玩家位置...')
      
      // 使用固定的初始位置，不依賴props
      const initialPosition = [-3, 10, -3]
      playerRef.current.position.set(initialPosition[0], initialPosition[1], initialPosition[2])
      
      // 添加標記防止重複初始化
      let isInitializing = true
      
      // 添加更長的延遲確保地形完全載入，並進行多次檢測
      const attemptTerrainDetection = (attempts: number = 0) => {
        if (!isInitializing) return // 如果已經初始化完成，停止檢測
        
        if (attempts >= 10) {
          console.warn('地形檢測失敗，使用預設高度')
          const safeY = Math.max(initialPosition[1], 10) // 至少10單位高度
          if (playerRef.current) {
            playerRef.current.position.y = safeY
          }
          isInitializing = false // 標記初始化完成
          return
        }
        
        const terrainHeight = getTerrainHeight(initialPosition[0], initialPosition[2])
        console.log(`初始化嘗試 ${attempts + 1}: 地形高度檢測結果: ${terrainHeight.toFixed(2)}`)
        
        if (terrainHeight > -100 && terrainHeight < 100) { // 有效的地形高度
          const adjustedY = Math.max(terrainHeight + 2.0, 5.0) // 確保最少5單位高度
          if (playerRef.current) {
            playerRef.current.position.set(initialPosition[0], adjustedY, initialPosition[2])
          }
          console.log(`人物初始化完成: [${initialPosition[0]}, ${adjustedY.toFixed(2)}, ${initialPosition[2]}], 地形高度: ${terrainHeight.toFixed(2)}`)
          isInitializing = false // 標記初始化完成
        } else {
          // 地形還未載入，繼續嘗試
          setTimeout(() => attemptTerrainDetection(attempts + 1), 200)
        }
      }
      
      // 延遲500ms後開始檢測
      setTimeout(() => attemptTerrainDetection(), 500)
      
      // 清理函數
      return () => {
        isInitializing = false
      }
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
      {/* 玩家身體 */}
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <capsuleGeometry args={[0.5, 1]} />
        <meshLambertMaterial color="#87CEEB" />
      </mesh>
      
      {/* 玩家頭部 */}
      <mesh castShadow receiveShadow position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshLambertMaterial color="#FDBCB4" />
      </mesh>
      
      {/* 簡單的眼睛 */}
      <mesh position={[-0.1, 2.3, 0.25]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 2.3, 0.25]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* 簡單的嘴巴 */}
      <mesh position={[0, 2.1, 0.28]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#FF69B4" />
      </mesh>

      {/* 玩家陰影圓圈 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      </group>
    </>
  )
}