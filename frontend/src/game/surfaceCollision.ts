// src/game/surfaceCollision.ts
import * as THREE from 'three';
import { getSmoothedGround, getGroundRoot, projectToTangent } from './ground';
import { MAX_SLOPE_DEG, CHEST_HEIGHT, STEP_UP, STEP_DOWN } from './motionParams';

const RAY = new THREE.Raycaster();
const UP  = new THREE.Vector3(0,1,0);

/** 水平撞牆 → 位移沿牆滑動 */
export function wallSlide(from:THREE.Vector3, to:THREE.Vector3){
  const root = getGroundRoot(); if (!root) return;
  const move = new THREE.Vector3().subVectors(to, from);
  const len = move.length(); if (len<=1e-6) return;
  RAY.set(new THREE.Vector3(to.x, to.y+CHEST_HEIGHT, to.z), move.clone().normalize());
  RAY.far = len + 0.05;
  const hits = RAY.intersectObject(root, true);
  for (const h of hits){
    if (!h.face) continue;
    const n = h.face.normal.clone().applyQuaternion(h.object.getWorldQuaternion(new THREE.Quaternion())).normalize();
    if (Math.abs(n.dot(UP)) < 0.6){
      const slide = move.clone().sub(n.multiplyScalar(move.dot(n)));
      to.copy(from.add(slide)); return;
    }
  }
}

/** 坡度過陡 → 改沿等高線滑 */
export function rejectTooSteep(from:THREE.Vector3, to:THREE.Vector3){
  const g = getSmoothedGround(to.x, to.z);
  const slope = Math.acos(Math.min(1, Math.max(-1, g.normal.dot(UP))))*180/Math.PI;
  if (slope > MAX_SLOPE_DEG){
    const move = new THREE.Vector3().subVectors(to, from);
    to.copy(from.add(projectToTangent(move, g.normal)));
  }
}

/** 小台階/小落差的上下（避免卡邊） */
export function stepSolver(from:THREE.Vector3, to:THREE.Vector3){
  const a = getSmoothedGround(from.x, from.z);
  const b = getSmoothedGround(to.x,   to.z);
  const up   = b.y - a.y;
  const down = a.y - b.y;
  if (up>0 && up<=STEP_UP)   to.y = b.y;   // 可上
  if (down>0 && down<=STEP_DOWN) to.y = b.y; // 可下
}