import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { getTerrainHeight, getTerrainRotation, getTerrainSlope, isPathClear } from './TerrainModel'
import { CameraController } from './CameraController'
import { bindScene, resolveMoveXZ, clampToGroundSmooth, snapToNearestGround, GROUND_LAYER_ID, setMountainColliders, debugThrottled } from '@/game/physics/grounding'
import { safeNormalize2, clampDt, isFiniteVec3 } from '@/game/utils/mathSafe'

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
  position = [-15, 18, -15], // 安全的spawn位置，遠離山脈 
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

  // Physics state for new system
  const velocityY = useRef({ value: 0 })
  const onGround = useRef({ value: true })
  const groundNormal = useRef(new THREE.Vector3())
  const playerPos = useRef(new THREE.Vector3(...position))
  const FIXED_DT = 1/60
  const accumulator = useRef(0)

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

  // Initialize terrain meshes for physics system
  const { scene } = useThree()
  useEffect(() => {
    bindScene(scene)
    
    const timer = setTimeout(() => {
      const terrainMeshes: THREE.Mesh[] = []
      const mountains: any[] = []
      
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        
        const name = (obj.name || '').toLowerCase()
        let materialName = ''
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            materialName = obj.material.map((m: any) => m.name || '').join(' ').toLowerCase()
          } else {
            materialName = (obj.material.name || '').toLowerCase()
          }
        }
        
        // Identify terrain meshes for raycasting
        const terrainHints = ['terrain', 'ground', 'island', 'sand', 'grass', 'dirt', 'plain', 'terrain_low_poly', 'landscape']
        const isTerrain = terrainHints.some(hint => name.includes(hint) || materialName.includes(hint))
        
        if (isTerrain) {
          obj.layers.enable(GROUND_LAYER_ID)
          terrainMeshes.push(obj)
        }
        
        // Collect mountain colliders
        if (name.includes('mountain') || name.includes('Mountain')) {
          obj.layers.enable(GROUND_LAYER_ID)
          mountains.push({ cx: obj.position.x, cz: obj.position.z, r: 5 }) // Adjust radius as needed
        }
      })
      
      // Get collision objects for mountains
      const mountainColliders = collisionSystem.getCollisionObjects()
        .filter(obj => obj.type === 'mountain')
        .map(m => ({ cx: m.position.x, cz: m.position.z, r: m.radius }))
      
      if (mountainColliders.length > 0) {
        setMountainColliders(mountainColliders)
      }
      
      console.log(`✅ [Player] Physics initialized: ${terrainMeshes.length} terrain, ${mountainColliders.length} mountains`)
      
      // Initial snap to ground
      snapToNearestGround(playerPos.current, 3, 0.25)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [scene])
  
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
      // 防止方向鍵的默認滾動行為
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault()
      }
      
      console.log(`🎮 按下按鍵: ${event.code}`) // 調試日志
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true
          console.log('🎮 ↑ 方向鍵 - 設定前進 = true')
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true
          console.log('🎮 ↓ 方向鍵 - 設定後退 = true')
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true
          console.log('🎮 ← 方向鍵 - 設定左移 = true')
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true
          console.log('🎮 → 方向鍵 - 設定右移 = true')
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
            const terrainHeight = getTerrainHeight(safePosition[0], safePosition[2]) || 0
            const terrainSlope = getTerrainSlope(safePosition[0], safePosition[2]) || { x: 0, z: 0 }
            const adjustedY = terrainHeight + 3 // 站在3D模型上方
            
            playerRef.current.position.set(safePosition[0], adjustedY, safePosition[2])
            playerRef.current.rotation.x = terrainSlope.x
            playerRef.current.rotation.z = terrainSlope.z
            
            setPlayerPosition([safePosition[0], adjustedY, safePosition[2]])
            console.log(`按R鍵重置人物位置: [${safePosition[0]}, ${adjustedY.toFixed(2)}, ${safePosition[2]}], 地形高度: ${terrainHeight.toFixed(2)}, 傾斜: [${terrainSlope.x.toFixed(3)}, ${terrainSlope.z.toFixed(3)}]`)
          }
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log(`🎮 放開按鍵: ${event.code}`) // 調試日志
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false
          console.log('🎮 ↑ 方向鍵 - 設定前進 = false')
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false
          console.log('🎮 ↓ 方向鍵 - 設定後退 = false')
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false
          console.log('🎮 ← 方向鍵 - 設定左移 = false')
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false
          console.log('🎮 → 方向鍵 - 設定右移 = false')
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = false  // 釋放Shift鍵
          break
      }
    }

    // 確保事件監聽器正確綁定
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    // 點擊畫面來獲得焦點
    const handleClick = () => {
      console.log('🎯 畫面獲得焦點')
      window.focus()
    }
    document.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('click', handleClick)
    }
  }, [handleInteraction])  // 加入 handleInteraction 依賴

  // 每幀更新
  useFrame((_, delta) => {
    if (!playerRef.current) return
    
    // Fixed timestep accumulator
    accumulator.current += Math.min(delta, 0.05)
    
    while (accumulator.current >= FIXED_DT) {
      const dt = FIXED_DT
      
      // 重置方向向量
      direction.current.set(0, 0, 0)

      // PC遊戲：鍵盤輸入 (設定本地方向向量)
      if (keys.current.forward) direction.current.z = 1    // W鍵：本地前方
      if (keys.current.backward) direction.current.z = -1  // S鍵：本地後方
      if (keys.current.left) direction.current.x = -1      // A鍵：本地左方（修正方向）
      if (keys.current.right) direction.current.x = 1      // D鍵：本地右方（修正方向）

    // 調試：檢查按鍵狀態和方向向量
    const anyKeyPressed = keys.current.forward || keys.current.backward || keys.current.left || keys.current.right
    if (anyKeyPressed) {
      console.log(`🎮 按鍵狀態 - 前:${keys.current.forward} 後:${keys.current.backward} 左:${keys.current.left} 右:${keys.current.right}`)
      console.log(`🎮 方向向量: (${direction.current.x}, ${direction.current.z})`)
    }

    // 安全正規化方向向量
    if (direction.current.length() > 0) {
      const dir2D = new THREE.Vector2(direction.current.x, direction.current.z)
      safeNormalize2(dir2D)
      direction.current.x = dir2D.x
      direction.current.z = dir2D.y
      
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
      
      const moveDir2D = new THREE.Vector2(moveDirection.x, moveDirection.z)
      safeNormalize2(moveDir2D)
      moveDirection.x = moveDir2D.x
      moveDirection.z = moveDir2D.y

      // 移動速度設定 - 適應10倍擴展地形，提高移動速度
      let speed = 25  // 正常行走速度 (從8提高到25)
      if (keys.current.shift) speed = 45  // Shift - 奔跑 (從15提高到45)
      velocity.current.copy(moveDirection.multiplyScalar(speed * dt))
      
      // 調試：檢查移動向量和速度
      if (anyKeyPressed) {
        console.log(`🎮 移動向量: (${moveDirection.x.toFixed(2)}, ${moveDirection.z.toFixed(2)})`)
        console.log(`🎮 速度向量: (${velocity.current.x.toFixed(2)}, ${velocity.current.z.toFixed(2)})`)
        console.log(`🎮 Pointer Lock: ${!!document.pointerLockElement}`)
      }

      // Physics-based movement using new system
      const desiredXZ = new THREE.Vector2(velocity.current.x, velocity.current.z)
      
      // Step 1: Resolve horizontal movement with mountain collision
      const actualXZ = resolveMoveXZ(playerPos.current, desiredXZ)
      
      // Step 2: Apply horizontal movement
      playerPos.current.x += actualXZ.x
      playerPos.current.z += actualXZ.y // Note: THREE.Vector2.y maps to world Z
      
      // Step 3: Smooth ground clamping with gravity
      clampToGroundSmooth(playerPos.current, velocityY.current, dt, groundNormal.current, onGround.current)
      
      // Step 4: If not on ground for too long, snap to nearest  
      }
      
      // 走路動畫
      isMoving.current = true
      walkCycle.current += dt * 10
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
          8 * dt
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
            10 * dt
          )
          if (isMounted.current) {
            setPlayerRotation(targetRotation)
          }
        }
      }
      accumulator.current -= FIXED_DT
    }
    
    // Apply position to mesh
    if (isFiniteVec3(playerPos.current)) {
      playerRef.current.position.copy(playerPos.current)
      setPlayerPosition([playerPos.current.x, playerPos.current.y, playerPos.current.z])
    }
    
    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(delta)
    }
    } else {
      isMoving.current = false
    }
    
    // 安全的地形貼合模式：防止玩家掉落
    if (playerRef.current && hasInitialized.current) {
      const currentPos = playerRef.current.position
      const terrainHeight = getTerrainHeight(currentPos.x, currentPos.z)
      
      // 只有在地形高度合理時才進行調整
      if (terrainHeight !== undefined && terrainHeight > -10) {
        const targetY = terrainHeight + 3
        const currentY = currentPos.y
        const heightDiff = Math.abs(targetY - currentY)
        
        // 防止突然掉落：只允許合理的高度調整
        if (heightDiff < 8) { // 允許8單位以內的高度調整
          if (isMoving.current) {
            // 走路時：平滑過渡到地形高度+輕微擺動
            const bobAmount = Math.sin(walkCycle.current) * 0.03
            const newY = THREE.MathUtils.lerp(currentY, targetY + bobAmount, 0.08)
            playerRef.current.position.y = newY
          } else {
            // 靜止時：慢慢過渡到地形高度
            const newY = THREE.MathUtils.lerp(currentY, targetY, 0.04)
            playerRef.current.position.y = newY
          }
          
          // 地形傾斜調整（更溫和）
          const terrainSlope = getTerrainSlope(currentPos.x, currentPos.z)
          if (terrainSlope && Math.abs(terrainSlope.x) < 0.3 && Math.abs(terrainSlope.z) < 0.3) {
            playerRef.current.rotation.x = THREE.MathUtils.lerp(playerRef.current.rotation.x, terrainSlope.x, 0.08)
            playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, terrainSlope.z, 0.08)
          }
        } else {
          // 高度差異過大，保持當前位置
          if (Math.random() < 0.01) { // 偶爾輸出調試信息
            console.log(`🛡️ 防止掉落：地形高度=${terrainHeight.toFixed(1)}, 玩家高度=${currentY.toFixed(1)}, 高度差=${heightDiff.toFixed(1)}`)
          }
        }
      } else {
        // 地形高度不可靠，保持當前高度不變
        if (Math.random() < 0.005) { // 偶爾輸出調試信息
          console.log(`🏔️ 地形高度不可靠: ${terrainHeight}，保持玩家當前高度: ${currentPos.y.toFixed(1)}`)
        }
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
  
  // 初始化玩家位置 - 像 NPC 一樣浮在半空中，不進行地形檢測
  useEffect(() => {
    if (playerRef.current && !hasInitialized.current && isMounted.current) {
      hasInitialized.current = true
      console.log('開始初始化玩家位置...')
      
      // 使用更安全的初始化方式 - 延遲等待地形載入
      setTimeout(() => {
        if (!playerRef.current) return
        
        const initialX = position[0]
        const initialZ = position[2]
        const terrainHeight = getTerrainHeight(initialX, initialZ)
        
        console.log(`🏔️ 玩家位置 [${initialX}, ${initialZ}] 的地形高度檢測結果: ${terrainHeight}`)
        
        let safeY = position[1] // 使用原始Y位置作為後備
        
        if (terrainHeight !== undefined && terrainHeight > -10) {
          // 地形高度合理，使用地形貼合
          safeY = terrainHeight + 3
          console.log(`✅ 使用地形貼合高度: ${safeY.toFixed(2)}`)
        } else {
          // 地形高度不可靠，使用固定安全高度
          safeY = Math.max(18, position[1]) // 至少18高度
          console.log(`⚠️ 地形高度不可靠，使用安全固定高度: ${safeY}`)
        }
        
        playerRef.current.position.set(initialX, safeY, initialZ)
        
        // 地形傾斜（如果可用）
        const terrainSlope = getTerrainSlope(initialX, initialZ)
        if (terrainSlope && Math.abs(terrainSlope.x) < 0.5 && Math.abs(terrainSlope.z) < 0.5) {
          playerRef.current.rotation.x = terrainSlope.x
          playerRef.current.rotation.z = terrainSlope.z
        }
        
        console.log(`🎮 玩家初始化完成: [${initialX}, ${safeY.toFixed(2)}, ${initialZ}]`)
      }, 1000) // 等待1秒讓地形完全載入
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
          <group scale={[2.2, 2.2, 2.2]} position={[0, -1.5, 0]}>
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