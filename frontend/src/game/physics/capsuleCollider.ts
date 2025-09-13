import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper } from 'three-mesh-bvh';
import { getWorldCollisionMesh } from './worldBVH';

export type CapsuleSpec = { radius: number; height: number }; // height 不含上下半球

const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpBox = new THREE.Box3();
const tri = new THREE.Triangle();
const triNormal = new THREE.Vector3();

/**
 * 對膠囊「掃掠」位移，與世界 BVH 碰撞並修正位移（含滑移）
 * pos:  feetPivot 的 position（capsule 以此為中心，落到地面時 y≈腳底）
 * move: 想要的世界位移（含水平/微小垂直）
 */
export function sweepCapsuleAndSlide(pos: THREE.Vector3, move: THREE.Vector3, spec: CapsuleSpec) {
  const world = getWorldCollisionMesh();
  if (!world) return move;

  const geom: any = world.geometry;
  const bvh: MeshBVH = geom.boundsTree;
  if (!bvh) return move;

  // 1) 嘗試位移
  const next = tmpVec.copy(pos).add(move);

  // 2) 以「多次推離」處理穿透（最多3輪）
  let corrected = move.clone();
  for (let iter = 0; iter < 3; iter++) {
    // 以 AABB 擴張體估計可疑三角形
    tmpBox.min.set(
      Math.min(pos.x, next.x) - spec.radius,
      Math.min(pos.y, next.y) - 0.1,
      Math.min(pos.z, next.z) - spec.radius
    );
    tmpBox.max.set(
      Math.max(pos.x, next.x) + spec.radius,
      Math.max(pos.y, next.y) + spec.height + spec.radius + 0.1,
      Math.max(pos.z, next.z) + spec.radius
    );

    let hit = false;
    bvh.shapecast({
      intersectsBounds: (box) => box.intersectsBox(tmpBox),
      intersectsTriangle: (t) => {
        tri.a.copy(t.a); 
        tri.b.copy(t.b); 
        tri.c.copy(t.c);
        tri.getNormal(triNormal);

        // 最近點到線段(膠囊軸)距離是否 < radius
        // 膠囊軸： [pos.y, pos.y + height]
        const a = tmpVec.set(next.x, pos.y + spec.radius, next.z);
        const b = tmpVec2.set(next.x, pos.y + spec.radius + spec.height, next.z);
        
        // 簡化計算：檢查膠囊中心點到三角形的距離
        const center = tmpVec.set(next.x, pos.y + spec.radius + spec.height / 2, next.z);
        const closestPoint = new THREE.Vector3();
        tri.closestPointToPoint(center, closestPoint);
        const dist = closestPoint.distanceTo(center);
        
        if (dist < spec.radius) {
          hit = true;
          // 推離向量：沿三角面法線
          const depth = spec.radius - dist + 0.001;
          const push = triNormal.clone().multiplyScalar(depth);

          // 平面切線滑移：移除沿法線的分量
          corrected.add(push);
        }
        return false;
      }
    });

    if (!hit) break;
    next.copy(pos).add(corrected);
  }

  // 3) 修正後的位移回傳
  return corrected;
}