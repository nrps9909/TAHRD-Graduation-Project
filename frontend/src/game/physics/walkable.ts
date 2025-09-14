import * as THREE from 'three';

export const WALKABLE_LAYER_ID = 7;
const walkables: THREE.Object3D[] = [];

export function markWalkable(obj: THREE.Object3D, on = true) {
  if (on) obj.layers.enable(WALKABLE_LAYER_ID);
  else obj.layers.disable(WALKABLE_LAYER_ID);
}

export function registerWalkable(obj: THREE.Object3D) {
  if (obj && !walkables.includes(obj)) walkables.push(obj);
}

export function getWalkables() {
  return walkables;
}