import * as THREE from 'three';

export const EPS = 1e-6;

export function lerpVec2(a: THREE.Vector2, b: THREE.Vector2, t: number) {
  a.x += (b.x - a.x) * t;
  a.y += (b.y - a.y) * t;
  return a;
}

export function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  a.x += (b.x - a.x) * t;
  a.y += (b.y - a.y) * t;
  a.z += (b.z - a.z) * t;
  return a;
}

export function expSmoothing(dt: number, halflife = 0.08) {  // 80ms 半衰期的平滑
  return 1 - Math.pow(2, -dt / halflife);
}