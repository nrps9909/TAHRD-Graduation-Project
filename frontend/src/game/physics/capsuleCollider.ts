import * as THREE from 'three';
import { getWorldCollisionMesh } from './worldBVH';

export type CapsuleSpec = { radius: number; height: number }; // height 不含上下半球

const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

/**
 * 簡化的膠囊碰撞檢測（不使用 three-mesh-bvh 以避免相容性問題）
 * pos:  feetPivot 的 position
 * move: 想要的世界位移
 */
export function sweepCapsuleAndSlide(pos: THREE.Vector3, move: THREE.Vector3, spec: CapsuleSpec) {
  const world = getWorldCollisionMesh();
  if (!world) return move;

  // 簡化實作：用 raycaster 檢測碰撞
  const nextPos = tmpVec.copy(pos).add(move);
  
  // 檢測水平方向是否有碰撞
  const moveDir = tmpVec2.copy(move).normalize();
  raycaster.set(pos, moveDir);
  raycaster.far = move.length() + spec.radius;
  
  const intersects = raycaster.intersectObject(world, false);
  
  if (intersects.length > 0 && intersects[0].distance < move.length() + spec.radius) {
    // 有碰撞，沿法線滑移
    const hit = intersects[0];
    const normal = hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0);
    
    // 投影到切線方向
    const dot = move.dot(normal);
    const slideMove = move.clone().sub(normal.multiplyScalar(dot));
    
    return slideMove;
  }

  return move;
}