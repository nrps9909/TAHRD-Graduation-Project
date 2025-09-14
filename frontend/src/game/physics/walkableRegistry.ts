import * as THREE from 'three';
import { WALKABLE_LAYER_ID } from './layers';

const targets: THREE.Object3D[] = [];

export function registerWalkable(obj: THREE.Object3D) {
  if (obj && !targets.includes(obj)) {
    targets.push(obj);
  }
}

export function getWalkables() {
  return targets;
}

export function setupRaycaster(ray: THREE.Raycaster) {
  ray.layers.set(WALKABLE_LAYER_ID);
}