import * as THREE from 'three';

export const WALKABLE_LAYER_ID = 7; // 專供地面/山脈/碰撞網

export function markWalkable(obj: THREE.Object3D, on = true) {
  if (on) {
    obj.layers.enable(WALKABLE_LAYER_ID);
  } else {
    obj.layers.disable(WALKABLE_LAYER_ID);
  }
}