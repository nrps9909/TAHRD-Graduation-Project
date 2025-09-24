// src/game/ground.ts
import * as THREE from 'three';

const RAY = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0,-1,0);
const UP   = new THREE.Vector3(0, 1,0);
const Q    = new THREE.Quaternion();
const UPV  = new THREE.Vector3(0,1,0);

let terrainRoot: THREE.Object3D | null = null;
const bbox = new THREE.Box3();

const EXCLUDE = ['water','wave','ocean','sea','湖','水','海','leaf','樹','sky','雲','sun','cloud'];
const INCLUDE = ['terrain','ground','地面','land','草','土','沙'];

let waiters: Array<() => void> = [];
export const waitForGroundReady = () => terrainRoot ? Promise.resolve() : new Promise<void>(r=>waiters.push(r));
export const getGroundRoot = () => terrainRoot;

export function registerGroundRoot(root: THREE.Object3D){
  // ✅ 一律註冊「整個地形 group」，不要只註冊單一小網格
  terrainRoot = root;
  terrainRoot.updateWorldMatrix(true,true);
  bbox.makeEmpty().expandByObject(terrainRoot);
  console.log('[GROUND] registered group =', root.name || '(no-name)',
              'bboxY', bbox.min.y.toFixed(1), '~', bbox.max.y.toFixed(1));
  waiters.splice(0).forEach(fn=>fn());
}

function isGroundHit(h: THREE.Intersection){
  const nm = (h.object?.name || '').toLowerCase();
  if (EXCLUDE.some(k=>nm.includes(k))) return false;
  // 使用 userData 也可直接標註：mesh.userData.isGround = true
  if ((h.object as any).userData?.isGround) return true;
  if (INCLUDE.some(k=>nm.includes(k))) return true;
  // 角度太垂直就當牆，不當地
  const n = h.face ? h.face.normal.clone().applyQuaternion(h.object.getWorldQuaternion(Q)).normalize() : UPV;
  return Math.abs(n.dot(UPV)) >= 0.35;
}

function pickGround(hits: THREE.Intersection[]){
  // 取最高的有效地面
  const ok = hits.filter(isGroundHit).sort((a,b)=> b.point.y - a.point.y);
  if (ok[0]) return ok[0];
  // 退而求其次：取第一個非 EXCLUDE 的命中，避免整段失敗
  for (const h of hits){
    const nm=(h.object?.name||'').toLowerCase();
    if (!EXCLUDE.some(k=>nm.includes(k))) return h;
  }
  return null;
}

export function getGround(x:number, z:number){
  if (!terrainRoot) return { ok:false, y:0, normal:UPV.clone() };

  const top = (isFinite(bbox.max.y)?bbox.max.y:1000)+2000;
  const bot = (isFinite(bbox.min.y)?bbox.min.y:-1000)-2000;

  const all: THREE.Intersection[] = [];
  RAY.set(new THREE.Vector3(x, top, z), DOWN); all.push(...RAY.intersectObject(terrainRoot,true));
  RAY.set(new THREE.Vector3(x, bot, z),  UP ); all.push(...RAY.intersectObject(terrainRoot,true));

  const h = pickGround(all);
  if (!h) return { ok:false, y:0, normal:UPV.clone() };

  const n = h.face ? h.face.normal.clone().applyQuaternion(h.object.getWorldQuaternion(Q)).normalize() : UPV.clone();
  return { ok:true, y:h.point.y, normal:n };
}

// 5 點採樣：取最高點，降低坑洞/裂縫抖動
export function getGroundSmoothed(x:number, z:number, r=0.35){
  const S:[number,number][]= [[0,0],[ r,0],[-r,0],[0,r],[0,-r]];
  let best=-Infinity, normal=new THREE.Vector3(), cnt=0;
  for (const [dx,dz] of S){
    const g = getGround(x+dx, z+dz);
    if (g.ok){ best=Math.max(best,g.y); normal.add(g.normal); cnt++; }
  }
  if (!cnt){ const g=getGround(x,z); return { ok:g.ok, y:g.y, normal:g.normal }; }
  return { ok:true, y:best, normal:normal.normalize() };
}

// 沿地表切線移動用
export const tangentProject = (v:THREE.Vector3, n:THREE.Vector3) =>
  v.clone().sub(n.clone().multiplyScalar(v.dot(n)));