import * as THREE from 'three';
import { getWorldCollisionMesh } from './worldBVH';

export type CapsuleSpec = { radius: number; height: number };

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpN = new THREE.Vector3();
const tmp3 = new THREE.Vector3();
const tmp2 = new THREE.Vector2();

const SKIN = 0.03;       // 與幾何保持固定皮層距離，杜絕「吃進去一點點」
const MAX_ITER = 5;      // 每幀最多解 5 次接觸
const BIN_STEPS = 8;     // 二分搜 TOI 次數
const EPS = 1e-6;

const raycaster = new THREE.Raycaster();

/** 取最近點與法線（from 世界幾何→膠囊軸最近點），回傳距離與法線 */
function closestPointOnWorld(p: THREE.Vector3, normalOut: THREE.Vector3): number {
  const world = getWorldCollisionMesh();
  if (!world) return Infinity;

  // Use raycasting to find closest point (simplified approach)
  let minDist = Infinity;

  // Cast rays in multiple directions to find closest surface
  const directions = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(1, 1, 0).normalize(), new THREE.Vector3(-1, -1, 0).normalize(),
    new THREE.Vector3(1, 0, 1).normalize(), new THREE.Vector3(-1, 0, -1).normalize(),
  ];

  for (const dir of directions) {
    raycaster.set(p, dir);
    raycaster.far = 2.0; // Search within 2 units
    const intersects = raycaster.intersectObject(world, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.distance < minDist) {
        minDist = hit.distance;
        if (hit.face) {
          normalOut.copy(hit.face.normal);
        }
      }
    }
  }

  if (!Number.isFinite(minDist)) return Infinity;
  if (normalOut.lengthSq() > 0) normalOut.normalize();
  return minDist;
}

/** 二分搜最早撞擊時間 t (0..1)，避免一步踩進太深 */
function binarySearchTOI(pos: THREE.Vector3, delta: THREE.Vector3, radius: number): number {
  let t0 = 0, t1 = 1;
  for (let i=0; i<BIN_STEPS; i++) {
    const mid = (t0 + t1) * 0.5;
    tmp3.copy(pos).addScaledVector(delta, mid);
    const d = closestPointOnWorld(tmp3, tmpN);
    if (d < radius) t1 = mid; else t0 = mid;
  }
  return t0; // 最安全可到的位置比例
}

/** 膠囊掃掠：回傳修正後的位移（含滑移 + 皮層 + 脫困） */
export function sweepCapsuleSlideAndUnstuck(
  position: THREE.Vector3, move: THREE.Vector3, spec: CapsuleSpec
): THREE.Vector3 {
  const out = move.clone();
  let remaining = move.clone();
  const pos = position.clone();

  for (let iter=0; iter<MAX_ITER; iter++) {
    if (remaining.lengthSq() < EPS) break;

    // 先檢查終點是否穿入；沒穿就整步走完
    tmp3.copy(pos).add(remaining);
    let dist = closestPointOnWorld(tmp3, tmpN);
    if (dist >= spec.radius + SKIN) { pos.add(remaining); break; }

    // 二分搜求最早接觸時間
    const t = binarySearchTOI(pos, remaining, spec.radius + SKIN);
    const step = remaining.clone().multiplyScalar(t);
    pos.add(step);                   // 走到安全邊界
    remaining.sub(step);             // 還剩多少要走

    // 取得接觸法線（朝外），加一點皮層推出
    tmp3.copy(pos);
    dist = closestPointOnWorld(tmp3, tmpN);
    if (Number.isFinite(dist)) {
      pos.addScaledVector(tmpN, (spec.radius + SKIN - dist) + 1e-3);
    }

    // 將剩餘位移投影到接觸平面的切線方向（滑移）
    const n = tmpN.clone().normalize();
    const dot = remaining.dot(n);
    remaining.addScaledVector(n, -dot); // 去除法線分量 → 沿面滑行
  }

  // 脫困保險：若還是意外在皮層內，沿法線推到皮層外
  const d2 = closestPointOnWorld(pos, tmpN);
  if (d2 < spec.radius + SKIN) {
    pos.addScaledVector(tmpN, (spec.radius + SKIN - d2) + 1e-3);
  }

  // 回寫位移量
  out.copy(pos).sub(position);
  return out;
}