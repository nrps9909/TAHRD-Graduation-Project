// src/game/spawn.ts
import * as THREE from 'three';
import { getGround } from './ground';

export type TreeCollider = { x: number; z: number; r: number };
export type BuildingCollider = { x: number; z: number; r: number };

const UP = new THREE.Vector3(0, 1, 0);

export interface SpawnOptions {
  count: number;                // 需要幾個出生點（玩家 + NPC）
  center?: { x: number; z: number }; // 生成中心
  startRadius?: number;         // 第一圈半徑
  step?: number;                // 每個點往外擴的步長
  minDist?: number;             // 兩點最小距離（**碰撞安全距**）
  maxSlopeDeg?: number;         // 可接受的最大坡度
  treeColliders?: TreeCollider[];
  buildingColliders?: BuildingCollider[]; // 建築物碰撞檢測
}

/** 試著把 (x,z) 貼到地面並檢查坡度是否可站 */
function snapToGroundXZ(x: number, z: number, maxSlopeDeg = 40) {
  const gh = getGround(x, z);
  const n = gh.normal || UP;
  const slopeDeg =
    Math.acos(Math.min(1, Math.max(-1, n.dot(UP)))) * (180 / Math.PI);
  const y = gh.y ?? 0;
  const ok = slopeDeg <= maxSlopeDeg && Number.isFinite(y);
  return { ok, pos: new THREE.Vector3(x, y + 0.12, z), normal: n, slopeDeg };
}

function farFromTrees(p: THREE.Vector3, trees: TreeCollider[] | undefined, pad = 0.5) {
  if (!trees || trees.length === 0) return true;
  for (const t of trees) {
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    if (Math.hypot(dx, dz) < (t.r + pad)) return false;
  }
  return true;
}

function farFromBuildings(p: THREE.Vector3, buildings: BuildingCollider[] | undefined, pad = 8.0) {
  if (!buildings || buildings.length === 0) return true;
  for (const b of buildings) {
    const dx = p.x - b.x;
    const dz = p.z - b.z;
    if (Math.hypot(dx, dz) < (b.r + pad)) return false;
  }
  return true;
}

function farFromOthers(p: THREE.Vector3, others: THREE.Vector3[], minDist: number) {
  const min2 = minDist * minDist;
  for (const q of others) {
    const dx = p.x - q.x;
    const dz = p.z - q.z;
    if (dx * dx + dz * dz < min2) return false;
  }
  return true;
}

/** 依人數產生等角螺旋（golden-angle spiral）分布的出生點，確保彼此不碰撞 */
export function generateSpawnPoints({
  count,
  center = { x: 0, z: 0 },
  startRadius = 8,
  step = 3.5,
  minDist = 3.2,
  maxSlopeDeg = 38,
  treeColliders = [],
  buildingColliders = [],
}: SpawnOptions): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle
  let i = 0;
  let radius = startRadius;

  while (out.length < count && i < count * 80) {
    const a = i * GA;
    const x = center.x + Math.cos(a) * radius;
    const z = center.z + Math.sin(a) * radius;

    const g = snapToGroundXZ(x, z, maxSlopeDeg);
    if (g.ok &&
        farFromTrees(g.pos, treeColliders, 0.6) &&
        farFromBuildings(g.pos, buildingColliders, 8.0) &&
        farFromOthers(g.pos, out, minDist)) {
      out.push(g.pos);
      // 為了讓下一個點離更遠一點，半徑逐步外擴
      radius += step * 0.35;
    } else {
      // 這個點不適合，略為外擴再試
      radius += step * 0.15;
    }
    i++;
  }

  // 若還不夠，最後保底：在外圈嘗試多幾次
  while (out.length < count) {
    radius += step;
    const a = i * GA;
    const x = center.x + Math.cos(a) * radius;
    const z = center.z + Math.sin(a) * radius;
    const g = snapToGroundXZ(x, z, maxSlopeDeg);
    if (g.ok &&
        farFromTrees(g.pos, treeColliders, 0.6) &&
        farFromBuildings(g.pos, buildingColliders, 8.0) &&
        farFromOthers(g.pos, out, minDist)) {
      out.push(g.pos);
    }
    i++;
    if (i > count * 200) break; // 避免無限迴圈
  }

  return out;
}