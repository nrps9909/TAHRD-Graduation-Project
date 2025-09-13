import * as THREE from 'three';

export const GROUND_LAYER_ID = 2;     // 地面+山脈都打在這層
export const FOOT_OFFSET     = 0.03;
export const MAX_SLOPE_DEG   = 42;    // 允許爬坡最大角度
export const PROBE_FORWARD   = 0.8;   // 前向取樣距離
export const EPS             = 1e-6;

const up = new THREE.Vector3(0,1,0);
const ray = new THREE.Raycaster();
ray.layers.set(GROUND_LAYER_ID);
ray.far = 5000;

let _scene: THREE.Scene | null = null;
export function bindScene(scene: THREE.Scene){ _scene = scene; }

/** 取樣 (x,z) 的地面高度與法線（包含山脈） */
export function sampleGround(x:number, z:number):
  { y:number; normal:THREE.Vector3 } | null {
  if(!_scene) return null;
  // 用 4 點（中心+三角形）多點向下 Raycast，比單點穩定
  const origins = [
    new THREE.Vector3(x, 1000, z),
    new THREE.Vector3(x+0.3, 1000, z),
    new THREE.Vector3(x-0.15, 1000, z+0.26),
    new THREE.Vector3(x-0.15, 1000, z-0.26),
  ];
  let hitCount=0, ySum=0;
  const nSum = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  for(const o of origins){
    ray.set(o, new THREE.Vector3(0,-1,0));
    const hits = ray.intersectObjects(_scene.children, true);
    const hit = hits.find(h => (h.object.layers.mask & (1<<GROUND_LAYER_ID)) !== 0);
    if(hit){
      hitCount++; ySum += hit.point.y;
      if(hit.face){
        tmpN.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
        nSum.add(tmpN);
      }
    }
  }
  if(hitCount===0) return null;
  const normal = nSum.lengthSq()>EPS ? nSum.normalize() : up.clone();
  return { y: ySum/hitCount, normal };
}

/** 是否超過可爬坡角度 */
export function tooSteep(normal:THREE.Vector3): boolean {
  const c = THREE.MathUtils.clamp(normal.dot(up)/(normal.length()*1), -1, 1);
  const deg = Math.acos(c) * 180/Math.PI;
  return deg > MAX_SLOPE_DEG;
}

/** 將期望移動 (XZ) 投影到「地面法線」的平面上，得到沿坡的 3D 向量 */
export function projectMoveOnSlope(moveXZ:THREE.Vector2, groundNormal:THREE.Vector3):THREE.Vector3{
  const v3 = new THREE.Vector3(moveXZ.x, 0, moveXZ.y);
  // v_on_plane = v - n * (v·n)
  const dot = v3.dot(groundNormal);
  const v = v3.sub(groundNormal.clone().multiplyScalar(dot));
  if(!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) return new THREE.Vector3();
  return v;
}

/** 給目前位置與欲移動向量，回傳「沿坡或沿邊滑移」後的實際位移（含 Y） */
export function solveSlopeMove(position:THREE.Vector3, desiredXZ:THREE.Vector2, dt:number):THREE.Vector3{
  const speed = desiredXZ.length();
  if(speed < EPS) return new THREE.Vector3();

  // 預判前方地面樣貌
  const dir = desiredXZ.clone().divideScalar(speed);
  const probeX = position.x + dir.x * PROBE_FORWARD;
  const probeZ = position.z + dir.y * PROBE_FORWARD;
  const ahead = sampleGround(probeX, probeZ);

  // 取當下地面，防守用
  const here  = sampleGround(position.x, position.z);

  if(ahead){
    if(!tooSteep(ahead.normal)){
      // 可爬 → 把移動投影到坡面，並由取樣高度決定新 y（穩定貼地）
      const along = projectMoveOnSlope(desiredXZ, ahead.normal).setLength(speed*dt);
      const nextX = position.x + along.x;
      const nextZ = position.z + along.z;
      const snap  = sampleGround(nextX, nextZ) ?? ahead;
      return new THREE.Vector3(along.x, (snap.y + FOOT_OFFSET) - position.y, along.z);
    }else{
      // 太陡 → 算切線方向，沿邊滑行
      const tA = new THREE.Vector2(-ahead.normal.z, ahead.normal.x).normalize();
      const tB = new THREE.Vector2( ahead.normal.z,-ahead.normal.x).normalize();
      const t  = (dir.dot(tA) >= dir.dot(tB)) ? tA : tB;
      const slide = t.multiplyScalar(speed*dt);
      const nextX = position.x + slide.x;
      const nextZ = position.z + slide.y;
      const snap  = sampleGround(nextX, nextZ) ?? here ?? ahead;
      return new THREE.Vector3(slide.x, (snap.y + FOOT_OFFSET) - position.y, slide.y);
    }
  }

  // 前方取不到地面時，保持原地或沿當下地面切線滑移（避免掉入/穿入）
  if(here){
    const along = projectMoveOnSlope(desiredXZ, here.normal).setLength(speed*dt);
    const nextX = position.x + along.x;
    const nextZ = position.z + along.z;
    const snap  = sampleGround(nextX, nextZ) ?? here;
    return new THREE.Vector3(along.x, (snap.y + FOOT_OFFSET) - position.y, along.z);
  }

  // 兩者皆無 → 不動
  return new THREE.Vector3();
}