import * as THREE from 'three';

export const FOOT_OFFSET = 0.03;
export const GRAVITY = 18;
export const MAX_SLOPE_DEG = 42;     // > 此角度禁止上爬
export const STEP_HEIGHT = 0.35;     // 小台階容許高度
export const CAPSULE_RADIUS = 0.35;  // 依現有模型調
export const EPS = 1e-6;
export const MOUNTAIN_MARGIN = 0.20;   // 邊緣緩衝（進到這個距離就開始貼邊）
export const HUG_DISTANCE = 0.18;      // 貼邊時與山體外緣維持的距離

export const GROUND_LAYER_ID = 2;    // 若專案已有層，沿用既有常數

const up = new THREE.Vector3(0,1,0);
const raycaster = new THREE.Raycaster();
raycaster.layers.set(GROUND_LAYER_ID);
raycaster.far = 5000;

let sceneRef: THREE.Scene | null = null;
export function bindScene(scene: THREE.Scene){ sceneRef = scene; }

/** 以三點(等邊三角形) + 中心 4 光線取樣，回傳平均 y 與平均法線 */
export function multiSampleGround(x:number, z:number, sampleRadius=CAPSULE_RADIUS*0.6):
  | { y:number; normal:THREE.Vector3 } | null {
  if(!sceneRef) return null;
  const dir = new THREE.Vector3(0,-1,0);
  const origins: THREE.Vector3[] = [
    new THREE.Vector3(x, 1000, z),
    new THREE.Vector3(x+sampleRadius, 1000, z),
    new THREE.Vector3(x - sampleRadius*0.5, 1000, z + sampleRadius*0.866),
    new THREE.Vector3(x - sampleRadius*0.5, 1000, z - sampleRadius*0.866),
  ];
  let hitCount = 0, ySum = 0;
  const n = new THREE.Vector3();
  const nSum = new THREE.Vector3();

  for(const o of origins){
    raycaster.set(o, dir);
    const hits = raycaster.intersectObjects(sceneRef.children, true);
    const hit = hits.find(h => (h.object.layers.mask & (1<<GROUND_LAYER_ID)) !== 0);
    if(hit){
      hitCount++;
      ySum += hit.point.y;
      if(hit.face){
        n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
        nSum.add(n);
      }
    }
  }
  if(hitCount === 0) return null;
  const normal = nSum.lengthSq()>EPS ? nSum.normalize() : up.clone();
  return { y: ySum / hitCount, normal };
}

/** 坡度判斷 */
export function isSlopeTooSteep(normal:THREE.Vector3):boolean{
  const cos = normal.dot(up) / (normal.length()*1);
  const deg = Math.acos(Math.min(Math.max(cos,-1),1)) * 180/Math.PI;
  return deg > MAX_SLOPE_DEG;
}

/** Unity 風格 SmoothDamp */
export function smoothDamp(current:number, target:number, velocityRef:{value:number},
  smoothTime=0.08, maxSpeed=50, dt=1/60){
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48*x*x + 0.235*x*x*x);
  let change = current - target;
  const maxChange = maxSpeed * smoothTime;
  change = Math.min(Math.max(change, -maxChange), maxChange);
  const temp = (velocityRef.value + omega * change) * dt;
  velocityRef.value = (velocityRef.value - omega * temp) * exp;
  const output = target + (change + temp) * exp;
  return output;
}

/** 垂直方向：平滑貼地 + 重力，永不寫入 NaN */
export function clampToGroundSmooth(pos:THREE.Vector3, vy:{value:number}, dt:number,
  outNormal?:THREE.Vector3, outOnGround?:{value:boolean}){
  const sample = multiSampleGround(pos.x, pos.z);
  if(sample){
    const targetY = sample.y + FOOT_OFFSET;
    const newY = smoothDamp(pos.y, targetY, vy, 0.07, 100, dt);
    pos.y = Number.isFinite(newY) ? newY : targetY;
    if(outNormal) outNormal.copy(sample.normal);
    if(outOnGround) outOnGround.value = true;
    if(isSlopeTooSteep(sample.normal)){
      // 太陡 → 略微往下拉，避免上爬
      pos.y = Math.min(pos.y, targetY);
    }
  }else{
    // 沒取到地面 → 重力
    vy.value = Number.isFinite(vy.value) ? vy.value - GRAVITY*dt : 0;
    pos.y += vy.value * dt;
    if(outOnGround) outOnGround.value = false;
  }
}

/** 山脈圓形阻擋：請從現有 terrain/mountain 資料來源餵給此陣列 */
export type CircleCollider = { cx:number; cz:number; r:number };
export let mountainColliders: CircleCollider[] = [];
export function setMountainColliders(list: CircleCollider[]){ mountainColliders = list; }

/** 若進入任一山脈半徑，回傳推離向量（2D 最小平移量） */
function pushOutFromMountains(x:number, z:number, margin=0.01): THREE.Vector2 {
  for(const c of mountainColliders){
    const dx = x - c.cx, dz = z - c.cz;
    const d = Math.hypot(dx, dz);
    if(d < c.r){
      const n = new THREE.Vector2(dx/d, dz/d);
      const depth = c.r - d + margin;
      return n.multiplyScalar(depth); // 把角色往外推
    }
  }
  return new THREE.Vector2(0,0);
}

/** 取得最近命中的山體資訊 */
type HitInfo = { idx:number; cx:number; cz:number; r:number; dist:number; nx:number; nz:number };
function getNearestMountainHit(x:number, z:number): HitInfo | null {
  let best: HitInfo | null = null;
  for (let i=0;i<mountainColliders.length;i++){
    const c = mountainColliders[i];
    const dx = x - c.cx, dz = z - c.cz;
    const d  = Math.hypot(dx, dz);
    if (d < c.r + MOUNTAIN_MARGIN) {
      const nx = dx / (d || 1), nz = dz / (d || 1);
      const h: HitInfo = { idx:i, cx:c.cx, cz:c.cz, r:c.r, dist:d, nx, nz };
      if (!best || d < best.dist) best = h;
    }
  }
  return best;
}

/** XZ 位移解算：山體阻擋 + 強化切線滑移 + 貼邊行走 */
export function resolveMoveXZ(current:THREE.Vector3, moveXZ:THREE.Vector2):THREE.Vector2 {
  if (!Number.isFinite(moveXZ.x) || !Number.isFinite(moveXZ.y)) return new THREE.Vector2(0,0);
  const speed = moveXZ.length();
  if (speed < EPS) return moveXZ;

  // 預計位置
  let nx = current.x + moveXZ.x;
  let nz = current.z + moveXZ.y;

  const hit = getNearestMountainHit(nx, nz);
  if (!hit) return moveXZ; // 沒碰到 → 正常移動

  // 原始方向
  const dir = moveXZ.clone().divideScalar(speed); // 單位向量
  const n2  = new THREE.Vector2(hit.nx, hit.nz);  // 由中心指向角色的外法線（2D）
  const dotInto = dir.dot(n2) < 0;                // 是否朝向山體內部

  // 在邊界內或想往內推時 → 投影到切線方向，並選擇與原方向最接近的切線
  if (hit.dist < hit.r + MOUNTAIN_MARGIN || dotInto) {
    const tA = new THREE.Vector2(-n2.y,  n2.x).normalize(); // 兩個切線方向
    const tB = new THREE.Vector2( n2.y, -n2.x).normalize();
    const t  = (dir.dot(tA) >= dir.dot(tB)) ? tA : tB;

    // 讓角色「貼邊」：把預計位置拉到外緣 + HUG_DISTANCE
    const targetDist = hit.r + HUG_DISTANCE;
    nx = hit.cx + n2.x * targetDist + t.x * speed; // 先對齊外緣，再沿切線位移
    nz = hit.cz + n2.y * targetDist + t.y * speed;

    // 回寫為修正後位移
    moveXZ.set(nx - current.x, nz - current.z);
  }

  // 安全防護：若仍意外在山體內則再推出去
  const dx = nx - hit.cx, dz = nz - hit.cz;
  const d2 = Math.hypot(dx, dz);
  if (d2 < hit.r) {
    const nxOut = dx / (d2 || 1), nzOut = dz / (d2 || 1);
    const push  = (hit.r - d2) + 0.01;
    nx += nxOut * push;
    nz += nzOut * push;
    moveXZ.set(nx - current.x, nz - current.z);
  }

  if (!Number.isFinite(moveXZ.x) || !Number.isFinite(moveXZ.y)) moveXZ.set(0,0);
  return moveXZ;
}

/** 失足時就地尋找最近可站的點 */
export function snapToNearestGround(pos:THREE.Vector3, radius=3, step=0.25): boolean{
  for(let r=0; r<=radius; r+=step){
    for(let a=0; a<Math.PI*2; a+=Math.max(step/r, 0.6)){
      const tx = pos.x + Math.cos(a)*r;
      const tz = pos.z + Math.sin(a)*r;
      const s = multiSampleGround(tx, tz);
      if(s && !isSlopeTooSteep(s.normal)){
        pos.set(tx, s.y + FOOT_OFFSET, tz);
        return true;
      }
    }
  }
  return false;
}

// Log 節流工具
let lastLog = 0;
export function debugThrottled(msg:string){
  const now = performance.now();
  if(now - lastLog > 500){ console.debug(msg); lastLog = now; }
}