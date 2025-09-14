import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { getWorldMesh } from './worldBVH';

export type KCCSpec = {
  radius: number;       // 膠囊半徑 (腳底圓半徑)
  height: number;       // 直段高度（總身高 = height + 2*radius）
  skin?: number;        // 與幾何最小間距
  maxSlopeDeg?: number; // 最大可走坡
  stepHeight?: number;  // 可跨階高度
  maxSnap?: number;     // 往下貼地最大距離
  gravity?: number;     // m/s^2
  maxIters?: number;    // 每子步碰撞解算次數
  maxSubsteps?: number; // CCD 子步上限
};

export type GroundState = { onGround: boolean; normal: THREE.Vector3; y: number };

const EPS = 1e-6, UP = new THREE.Vector3(0, 1, 0);

export class KCC {
  spec: Required<KCCSpec>;
  pos = new THREE.Vector3();            // 腳底世界座標（feetPivot）
  velY = 0;                              // 垂直速度
  grounded: GroundState = { onGround: false, normal: new THREE.Vector3(0, 1, 0), y: -Infinity };

  constructor(spec: KCCSpec) {
    this.spec = {
      radius: spec.radius,
      height: spec.height,
      skin: spec.skin ?? 0.035,
      maxSlopeDeg: spec.maxSlopeDeg ?? 42,
      stepHeight: spec.stepHeight ?? 0.35,
      maxSnap: spec.maxSnap ?? 0.6,
      gravity: spec.gravity ?? 18,
      maxIters: Math.max(3, spec.maxIters ?? 6),
      maxSubsteps: Math.max(1, spec.maxSubsteps ?? 8),
    };
  }

  reset(p: THREE.Vector3) {
    this.pos.copy(p);
    this.velY = 0;
    this.grounded.onGround = false;
  }

  /** 每幀呼叫：輸入水平期望移動（世界座標, XZ），dt 固定步長 */
  update(desiredXZ: THREE.Vector2, dt: number) {
    const speedPerFrame = desiredXZ.length();
    const sub = Math.min(this.spec.maxSubsteps, Math.max(1, Math.ceil(speedPerFrame / Math.max(0.25 * this.spec.radius, 0.1))));
    const stepXZ = desiredXZ.clone().divideScalar(sub);
    for (let s = 0; s < sub; s++) {
      // 1) 水平：膠囊掃掠 + 切線滑移 + 跨階（不得穿透）
      this.sweepAndSlide(stepXZ);

      // 2) 貼地 / 重力
      this.applyGrounding(dt / sub);
    }
  }

  // ---------- 私有：幾何與 BVH ----------
  private getBVH(): MeshBVH | null {
    const w = getWorldMesh();
    return w ? (w.geometry as any).boundsTree as MeshBVH : null;
  }

  private makeCapsule(at: THREE.Vector3) {
    const a = at.clone().addScaledVector(UP, this.spec.radius);
    const b = at.clone().addScaledVector(UP, this.spec.radius + this.spec.height);
    return { a, b };
  }

  // 距離世界幾何最近距：以 shapecast 最近三角形到線段的近似
  private distanceToWorld(segA: THREE.Vector3, segB: THREE.Vector3, outN: THREE.Vector3): number {
    const bvh = this.getBVH();
    if (!bvh) return Infinity;

    let minDist = Infinity;
    outN.set(0, 1, 0);
    const aabb = new THREE.Box3().setFromPoints([segA, segB]).expandByScalar(this.spec.radius + this.spec.skin + 1);
    const tri = new THREE.Triangle(), triN = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

    bvh.shapecast({
      intersectsBounds: (box) => box.intersectsBox(aabb),
      intersectsTriangle: (t) => {
        tri.copy(t);
        tri.getNormal(triN);
        // 近似：取線段中點的最近點
        const mid = tmp.copy(segA).add(segB).multiplyScalar(0.5);
        tri.closestPointToPoint(mid, tmp2);
        const d = tmp2.distanceTo(mid);
        if (d < minDist) {
          minDist = d;
          outN.copy(triN.normalize());
        }
        return false;
      }
    });
    return minDist;
  }

  private binaryTOI(startA: THREE.Vector3, startB: THREE.Vector3, delta: THREE.Vector3): number {
    const target = this.spec.radius + this.spec.skin;
    const a = startA.clone(), b = startB.clone(), n = new THREE.Vector3();
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 8; i++) {
      const mid = (t0 + t1) * 0.5;
      const step = delta.clone().multiplyScalar(mid);
      const d = this.distanceToWorld(a.clone().add(step), b.clone().add(step), n);
      if (d < target) t1 = mid; else t0 = mid;
    }
    return t0;
  }

  private sweepAndSlide(moveXZ: THREE.Vector2) {
    if (moveXZ.lengthSq() < EPS) return;
    const bvh = this.getBVH();
    if (!bvh) {
      this.pos.x += moveXZ.x;
      this.pos.z += moveXZ.y;
      return;
    }

    const spec = this.spec, n = new THREE.Vector3(), remain = new THREE.Vector3(moveXZ.x, 0, moveXZ.y);
    const maxIter = this.spec.maxIters;

    for (let i = 0; i < maxIter; i++) {
      if (remain.lengthSq() < EPS) break;
      const cap = this.makeCapsule(this.pos);
      const endA = cap.a.clone().add(remain), endB = cap.b.clone().add(remain);

      // 終點是否安全
      const d = this.distanceToWorld(endA, endB, n);
      if (d >= spec.radius + spec.skin) {
        this.pos.add(remain);
        break;
      }

      // 二分搜最早接觸時間 → 走到安全邊界
      const t = this.binaryTOI(cap.a, cap.b, remain);
      const safeStep = remain.clone().multiplyScalar(t);
      this.pos.add(safeStep);
      remain.sub(safeStep);

      // 推出皮層（避免吃進去）
      const cur = this.makeCapsule(this.pos);
      const dNow = this.distanceToWorld(cur.a, cur.b, n);
      if (Number.isFinite(dNow) && dNow < spec.radius + spec.skin) {
        const push = (spec.radius + spec.skin - dNow) + 1e-3;
        this.pos.add(n.clone().multiplyScalar(push));
      }

      // 切線滑移：去除法線分量
      const dot = remain.dot(n);
      remain.addScaledVector(n, -dot);

      // 嘗試跨階：若仍被擋，試著抬高 stepHeight 再走一次
      if (remain.lengthSq() > EPS) {
        const tryUp = Math.min(spec.stepHeight, spec.stepHeight * (1 - t)); // 依剩餘比例抬高
        if (tryUp > 0.01) {
          const saved = this.pos.clone();
          this.pos.y += tryUp;
          const cap2 = this.makeCapsule(this.pos);
          const end2A = cap2.a.clone().add(remain), end2B = cap2.b.clone().add(remain);
          const d2 = this.distanceToWorld(end2A, end2B, n);
          if (d2 >= spec.radius + spec.skin) {
            this.pos.add(remain);
            break; // 成功跨階
          } else {
            this.pos.copy(saved); // 失敗還原
          }
        }
      }
    }
  }

  private applyGrounding(dt: number) {
    // 往下貼地（snap），把腳底黏在地表
    const bvh = this.getBVH();
    if (!bvh) return;

    const down = new THREE.Raycaster(
      this.pos.clone().addScaledVector(UP, this.spec.maxSnap + this.spec.radius + this.spec.height + 0.5),
      new THREE.Vector3(0, -1, 0),
      0,
      this.spec.maxSnap + this.spec.radius + this.spec.height + 1.0
    );

    const world = getWorldMesh()!;
    const hits = down.intersectObject(world, true);
    const hit = hits.find(Boolean);

    if (hit) {
      const n = hit.face?.normal?.clone()?.transformDirection(hit.object.matrixWorld)?.normalize() ?? UP.clone();
      const upDot = n.dot(UP);
      const slopeDeg = Math.acos(THREE.MathUtils.clamp(upDot, -1, 1)) * 180 / Math.PI;

      // 判定可站立
      if (slopeDeg <= this.spec.maxSlopeDeg + 0.5) {
        const targetY = hit.point.y + 0.03; // FOOT_OFFSET
        // 往上以平滑拉近，往下直接貼
        if (targetY > this.pos.y) {
          this.pos.y += Math.min(targetY - this.pos.y, 0.15);
        } else {
          this.pos.y = targetY;
        }
        this.velY = 0;
        this.grounded = { onGround: true, normal: n, y: targetY };
        return;
      }
    }

    // 沒地面或太陡 → 非貼地：施加重力，但限制最多下落一步的距離避免穿透
    this.grounded.onGround = false;
    this.velY -= this.spec.gravity * dt;
    const fall = Math.max(-2.0, this.velY * dt); // 下降限幅，下一輪 CCD 會處理
    this.pos.y += fall;
  }
}