import * as THREE from 'three';

export const EPS = 1e-6;

export function safeNormalize2(v: THREE.Vector2): THREE.Vector2 {
  const l = v.length();
  if (!Number.isFinite(l) || l < EPS) { v.set(0, 0); return v; }
  v.divideScalar(l);
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) v.set(0, 0);
  return v;
}

export function clampDt(dt: number): number {
  return Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0.016; // 0~50ms
}

export function isFiniteVec2(v: THREE.Vector2): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y);
}

export function isFiniteVec3(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

export function sanitizeVec3(v: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  if (!isFiniteVec3(v)) { v.copy(fallback); }
  return v;
}