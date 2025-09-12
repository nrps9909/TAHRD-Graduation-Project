import * as THREE from 'three'
import { collisionSystem } from '@/utils/collision'
import { EPS, isFiniteVec2, clampDt } from '@/game/utils/mathSafe'

// 常數
export const FOOT_OFFSET = 0.06         // 腳底與地面微小間隙，避免穿模/閃爍
export const GRAVITY = 18               // m/s²
export const MAX_SLOPE_DEG = 42         // 允許的最大坡度
export const STEP_HEIGHT = 0.35         // 可跨越的小台階高度
export const CAPSULE_RADIUS = 0.35      // 角色膠囊半徑（依你現有模型等比例）
export const CAPSULE_HALF = 0.6         // 膠囊半高（腳底到身體中心）

// 地形圖層
export const GROUND_LAYER_ID = 2

// Raycast相關
let raycaster: THREE.Raycaster | null = null
let groundMeshes: THREE.Mesh[] = []

export function initializeGrounding(terrainMeshes: THREE.Mesh[]) {
  if (!raycaster) {
    raycaster = new THREE.Raycaster()
  }
  groundMeshes = terrainMeshes
  
  // 設置地形圖層
  terrainMeshes.forEach(mesh => {
    mesh.layers.enable(GROUND_LAYER_ID)
  })
}

/** 回傳 (y, normal)；若取樣失敗回傳 null */
export function sampleGroundAt(x: number, z: number): { y: number; normal: THREE.Vector3 } | null {
  if (!raycaster || groundMeshes.length === 0) {
    return null
  }

  const origin = new THREE.Vector3(x, 1000, z)
  const direction = new THREE.Vector3(0, -1, 0)
  
  raycaster.set(origin, direction)
  raycaster.layers.set(GROUND_LAYER_ID)
  
  const intersects = raycaster.intersectObjects(groundMeshes, true)
  
  if (intersects.length > 0) {
    const validIntersects = intersects.filter(intersect => {
      const y = intersect.point.y
      return y >= -50 && y <= 125 && intersect.face
    })
    
    if (validIntersects.length > 0) {
      const hit = validIntersects[0]
      return {
        y: hit.point.y,
        normal: hit.face!.normal.clone()
      }
    }
  }
  
  return null
}

export function isSlopeTooSteep(normal: THREE.Vector3): boolean {
  const upVector = new THREE.Vector3(0, 1, 0)
  const angle = Math.acos(normal.dot(upVector))
  const degrees = THREE.MathUtils.radToDeg(angle)
  return degrees > MAX_SLOPE_DEG
}

/** 檢查 (x,z) 是否進入任一山脈阻擋半徑（含安全邊界） */
export function isInsideMountain(x: number, z: number): { hit: boolean; normal: THREE.Vector2 | null } {
  const mountainColliders = collisionSystem.getCollisionObjects()
    .filter(obj => obj.type === 'mountain')
  
  for (const mountain of mountainColliders) {
    const dx = x - mountain.position.x
    const dz = z - mountain.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    if (distance < mountain.radius) {
      // 回傳由山脈中心指向角色的2D單位向量
      const normal = new THREE.Vector2(dx, dz).normalize()
      return { hit: true, normal }
    }
  }
  
  return { hit: false, normal: null }
}

/**
 * 給定目前與期望位移，回傳修正後可用位移（含沿邊滑移與階梯上/下）。
 * position: 目前世界座標
 * moveXZ:   欲嘗試的水平位移 (x,z)，單位: 每幀世界單位
 */
export function resolveMoveXZ(position: THREE.Vector3, moveXZ: THREE.Vector2): THREE.Vector2 {
  if (!isFiniteVec2(moveXZ)) return new THREE.Vector2(0, 0)
  if (moveXZ.lengthSq() < EPS) return moveXZ
  
  const nextX = position.x + moveXZ.x
  const nextZ = position.z + moveXZ.y
  
  const collision = isInsideMountain(nextX, nextZ)
  
  if (!collision.hit) {
    return moveXZ // 無阻擋，直接返回原移動
  }
  
  if (!collision.normal) {
    return new THREE.Vector2(0, 0) // 無法確定法向量，停止移動
  }
  
  // 將移動投影到切線方向（沿邊滑移）
  const moveVector = new THREE.Vector2(moveXZ.x, moveXZ.y)
  const normal = collision.normal
  const dot = moveVector.dot(normal)
  const slidingMove = moveVector.clone().sub(normal.clone().multiplyScalar(dot))
  
  // 檢查投影後的位移是否仍會碰撞
  const slidingX = position.x + slidingMove.x
  const slidingZ = position.z + slidingMove.y
  
  const slidingCollision = isInsideMountain(slidingX, slidingZ)
  
  if (slidingCollision.hit) {
    // 仍會碰撞，縮小位移到邊界外
    const safeDist = 0.02 // 2cm安全距離
    const mountainColliders = collisionSystem.getCollisionObjects()
      .filter(obj => obj.type === 'mountain')
    
    for (const mountain of mountainColliders) {
      const dx = position.x - mountain.position.x
      const dz = position.z - mountain.position.z
      const currentDist = Math.sqrt(dx * dx + dz * dz)
      
      if (currentDist < mountain.radius + safeDist) {
        const pushOutDist = mountain.radius + safeDist - currentDist
        const pushDir = new THREE.Vector2(dx, dz).normalize()
        return pushDir.multiplyScalar(pushOutDist)
      }
    }
  }
  
  // 嘗試小台階
  const stepSample = sampleGroundAt(slidingX, slidingZ)
  if (stepSample) {
    const heightDiff = stepSample.y - position.y
    if (heightDiff <= STEP_HEIGHT && !isSlopeTooSteep(stepSample.normal)) {
      return slidingMove
    }
  }
  
  // Final safety check
  if (!isFiniteVec2(slidingMove)) slidingMove.set(0, 0)
  return slidingMove
}

/**
 * 將 y 校正到地面：取樣到地面就設置 y = groundY + FOOT_OFFSET。
 * 若無命中，則保持重力落下，直到找到地面（或觸發找最近地面）。
 */
export function clampToGroundY(pos: THREE.Vector3, velocityY: { value: number }, dt: number): void {
  dt = clampDt(dt)
  if (!Number.isFinite(velocityY.value)) velocityY.value = 0
  if (!Number.isFinite(pos.y)) pos.y = 1
  
  const groundSample = sampleGroundAt(pos.x, pos.z)
  
  if (groundSample) {
    const targetY = groundSample.y + FOOT_OFFSET
    const currentY = pos.y
    
    // 檢查坡度
    if (isSlopeTooSteep(groundSample.normal)) {
      // 坡度過陡，不要上爬，保持在邊緣
      if (currentY > targetY) {
        // 如果在陡坡上方，讓其滑落
        velocityY.value -= GRAVITY * dt
        pos.y += velocityY.value * dt
        
        // 限制不要低於地面
        if (pos.y < targetY) {
          pos.y = targetY
          velocityY.value = 0
        }
      }
      return
    }
    
    // 坡度允許，貼地
    if (Math.abs(currentY - targetY) > 0.02) {
      pos.y = targetY
      velocityY.value = 0
    }
  } else {
    // 無命中地面，施加重力
    velocityY.value -= GRAVITY * dt
    pos.y += velocityY.value * dt
    
    // 防止掉到極低處
    if (pos.y < -100) {
      pos.y = 0
      velocityY.value = 0
    }
  }
  
  // Final safety check
  if (!Number.isFinite(pos.y)) pos.y = 1
}

/** 以漣漪搜尋 (ring search) 在半徑 r、步長 s 內找最近可站點，找到就把 pos.xz 移過去並貼地。 */
export function snapToNearestGround(pos: THREE.Vector3, radius = 3, step = 0.25): boolean {
  const centerX = pos.x
  const centerZ = pos.z
  
  for (let r = step; r <= radius; r += step) {
    const circumference = 2 * Math.PI * r
    const numPoints = Math.max(8, Math.floor(circumference / step))
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI
      const testX = centerX + Math.cos(angle) * r
      const testZ = centerZ + Math.sin(angle) * r
      
      // 檢查是否被山脈阻擋
      const collision = isInsideMountain(testX, testZ)
      if (collision.hit) continue
      
      // 檢查地面
      const groundSample = sampleGroundAt(testX, testZ)
      if (groundSample && !isSlopeTooSteep(groundSample.normal)) {
        pos.x = testX
        pos.z = testZ
        pos.y = groundSample.y + FOOT_OFFSET
        
        console.info('[Grounding] snapped to nearest ground at', pos.x.toFixed(1), pos.z.toFixed(1))
        return true
      }
    }
  }
  
  return false
}