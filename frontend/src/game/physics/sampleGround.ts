import * as THREE from 'three';
import { getWalkables, WALKABLE_LAYER_ID } from './walkable';

const ray = new THREE.Raycaster();
ray.layers.set(WALKABLE_LAYER_ID);
ray.far = 2000;

const UP = new THREE.Vector3(0, 1, 0);
export const FOOT_OFFSET = 0.1;  // Slightly higher offset for better ground clearance
export const MIN_Y = -10;   // Actual ground range based on terrain scale
export const MAX_Y = 30;    // Maximum terrain height with 5x Y scale

export function sampleGround(x: number, z: number): { y: number; normal: THREE.Vector3 } | null {
  const objs = getWalkables();
  if (!objs.length) return null;

  const origins = [
    new THREE.Vector3(x, 100, z),  // Start from reasonable height
    new THREE.Vector3(x + 0.25, 100, z),
    new THREE.Vector3(x - 0.12, 100, z + 0.22),
    new THREE.Vector3(x - 0.12, 100, z - 0.22),
  ];

  let hitCount = 0, ySum = 0;
  const nSum = new THREE.Vector3();

  for (const o of origins) {
    ray.set(o, new THREE.Vector3(0, -1, 0));
    const h = ray.intersectObjects(objs, true).find(h => {
      const n = h.face?.normal?.clone()?.transformDirection(h.object.matrixWorld) ?? UP;
      const upDot = n.dot(UP);
      return upDot > 0.2 && h.point.y > MIN_Y && h.point.y < MAX_Y;
    });
    if (h) {
      hitCount++;
      ySum += h.point.y;
      if (h.face) {
        const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
        nSum.add(n);
      }
    }
  }
  if (hitCount === 0) return null;
  const normal = nSum.lengthSq() > 1e-6 ? nSum.normalize() : UP.clone();
  return { y: ySum / hitCount, normal };
}

let lastGoodY = 5;  // Default ground level

export function clampToGroundSafe(pos: THREE.Vector3, vy: { value: number }, dt: number) {
  // If height is ridiculous, force sample immediately
  if (pos.y > MAX_Y || pos.y < MIN_Y) {
    const s = sampleGround(pos.x, pos.z);
    if (s) {
      pos.y = s.y + FOOT_OFFSET;
      vy.value = 0;
      lastGoodY = pos.y;
      return;
    }
  }

  const s = sampleGround(pos.x, pos.z);
  if (s) {
    const target = s.y + FOOT_OFFSET;
    // Ignore instant jumps > 2.5m (noise)
    if (Math.abs(target - pos.y) > 2.5) {
      pos.y = (target > pos.y) ? pos.y + 0.5 : pos.y - 0.5;
    } else {
      pos.y = target;
    }
    vy.value = 0;
    lastGoodY = pos.y;
  } else {
    // Sample failed → only apply gravity downward, avoid sticking to sky
    vy.value = (Number.isFinite(vy.value) ? vy.value : 0) - 18 * dt;
    pos.y += vy.value * dt;
    // Don't let it float upward
    if (pos.y > lastGoodY + 1.5) pos.y = lastGoodY + 1.5;
  }
}

// Initial spawn: snap all characters to ground
export function snapOnSpawn(pos: THREE.Vector3) {
  // Force initial position to reasonable ground height first
  if (pos.y > MAX_Y || pos.y < MIN_Y) {
    pos.y = 5;  // Default ground level
  }

  const s = sampleGround(pos.x, pos.z);
  if (s) {
    pos.y = s.y + FOOT_OFFSET;
    lastGoodY = pos.y;
  } else {
    // If no ground found, set to default safe height
    pos.y = 5;
    lastGoodY = 5;
  }

  console.log(`[SnapOnSpawn] Final position: ${pos.toArray().map(v => v.toFixed(2)).join(', ')}`);
}