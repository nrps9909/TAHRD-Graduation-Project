import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { getWorldCollisionMesh } from './worldBVH';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

export type ControllerSpec = {
  radius: number;      // 膠囊半徑
  height: number;      // 中間直段高度（總身高 = height + 2*radius）
  skin?: number;       // 與幾何的最小間距
  maxSlopeDeg?: number;
};

const EPS = 1e-6;
const MAX_ITERS = 5;          // 每子步最多解穿透 5 次
const BIN_STEPS = 8;          // 二分搜最早接觸時間
const DEFAULT_SKIN = 0.03;
const up = new THREE.Vector3(0,1,0);

const tri = new THREE.Triangle();
const triN = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const seg = new THREE.Line3();
const aabb = new THREE.Box3();

function getBVH(): MeshBVH | null {
  const world = getWorldCollisionMesh();
  return world ? (world.geometry as any).boundsTree as MeshBVH : null;
}

function clamp01(x:number){ return x<0?0:x>1?1:x; }

function closestPointOnTriangleToSegment(t: THREE.Triangle, s: THREE.Line3, outTri: THREE.Vector3, outSeg: THREE.Vector3){
  // three r150+ Triangle.closestPointToSegment 存在；若你的版本沒有，可用近似：
  // 轉投影最近點：使用 mesh-bvh 範例演算法（下方近似）
  (t as any).closestPointToSegment?.(s, outTri, outSeg) ??
  (()=>{ // 近似：取三角面最近點到線段中點（夠用做碰撞修正）
    t.getNormal(triN);
    const mid = outSeg.copy(s.start).add(s.end).multiplyScalar(0.5);
    t.closestPointToPoint(mid, outTri);
    outSeg.copy(mid);
  })();
}

function binaryTOI(capsule: Capsule, delta: THREE.Vector3, radius: number): number {
  let t0 = 0, t1 = 1;
  for(let i=0;i<BIN_STEPS;i++){
    const mid = (t0 + t1) * 0.5;
    const step = tmpV.copy(delta).multiplyScalar(mid);
    const s = seg.copy(new THREE.Line3(
      tmpV2.copy(capsule.start).add(step),
      tmpV.copy(capsule.end).add(step)
    ));
    const d = distanceToWorld(s);
    if (d < radius) t1 = mid; else t0 = mid;
  }
  return t0;
}

function distanceToWorld(s: THREE.Line3): number {
  const bvh = getBVH(); if (!bvh) return Infinity;
  aabb.makeEmpty().expandByPoint(s.start).expandByPoint(s.end).expandByScalar(1);
  let minDist = Infinity;
  bvh.shapecast({
    intersectsBounds: box => box.intersectsBox(aabb),
    intersectsTriangle: t => {
      tri.copy(t);
      const pTri = tmpV, pSeg = tmpV2;
      closestPointOnTriangleToSegment(tri, s, pTri, pSeg);
      const d = pTri.distanceTo(pSeg);
      if (d < minDist) minDist = d;
      return false;
    }
  });
  return minDist;
}

export function updateWithBVH(
  position: THREE.Vector3,
  desiredMove: THREE.Vector3,
  spec: ControllerSpec,
  substeps = 1
){
  const bvh = getBVH(); if (!bvh) { position.add(desiredMove); return; }

  const skin = spec.skin ?? DEFAULT_SKIN;
  const capsule = new Capsule(
    position.clone().addScaledVector(up, spec.radius),
    position.clone().addScaledVector(up, spec.radius + spec.height),
    spec.radius
  );

  let move = desiredMove.clone().divideScalar(substeps);
  for(let s=0;s<substeps;s++){
    // 迭代解穿透 + 切線滑移
    let remain = move.clone();
    for(let it=0; it<MAX_ITERS; it++){
      if (remain.lengthSq() < EPS) break;

      // 先檢查終點是否安全
      const testSeg = seg.set(
        tmpV.copy(capsule.start).add(remain),
        tmpV2.copy(capsule.end).add(remain)
      );
      let dist = distanceToWorld(testSeg);
      if (dist >= capsule.radius + skin) {
        capsule.start.add(remain);
        capsule.end.add(remain);
        break;
      }

      // 二分搜最早接觸時間
      const t = binaryTOI(capsule, remain, capsule.radius + skin);
      const safeStep = tmpV.copy(remain).multiplyScalar(t);
      capsule.start.add(safeStep);
      capsule.end.add(safeStep);
      remain.sub(safeStep);

      // 找接觸法線並加皮層推出
      const afterSeg = seg.set(capsule.start, capsule.end);
      let hitN = tmpV.set(0,1,0);
      let hit = false;
      bvh.shapecast({
        intersectsBounds: box => box.distanceToPoint(afterSeg.start) <= capsule.radius + 1
                             || box.distanceToPoint(afterSeg.end)   <= capsule.radius + 1,
        intersectsTriangle: t => {
          tri.copy(t).getNormal(triN);
          const pTri = tmpV2, pSeg = tmpV;
          closestPointOnTriangleToSegment(tri, afterSeg, pTri, pSeg);
          const d = pTri.distanceTo(pSeg);
          if (d < capsule.radius + skin) {
            hit = true;
            hitN.copy(triN.normalize());
          }
          return false;
        }
      });

      if (hit) {
        // 推出皮層
        const curSeg = seg.set(capsule.start, capsule.end);
        const dNow = distanceToWorld(curSeg);
        const push = (capsule.radius + skin - dNow) + 1e-3;
        capsule.start.addScaledVector(hitN, push);
        capsule.end.addScaledVector(hitN, push);

        // 沿面滑移：去除法線分量
        const dot = remain.dot(hitN);
        remain.addScaledVector(hitN, -dot);
        continue;
      } else {
        // 沒抓到法線就直接消耗掉剩餘位移（保險）
        capsule.start.add(remain);
        capsule.end.add(remain);
        remain.set(0,0,0);
        break;
      }
    } // end iters
  } // end substeps

  // 回寫到 position（腳底）
  const newFoot = capsule.start.clone().addScaledVector(up, -spec.radius);
  position.copy(newFoot);
}

/** 根據速度自動計算子步，避免高速穿透 */
export function computeSubsteps(speedPerFrame: number, spec: ControllerSpec){
  const maxStep = Math.max(0.25 * spec.radius, 0.1);
  const n = Math.ceil(speedPerFrame / maxStep);
  return Math.min(Math.max(n, 1), 8);
}