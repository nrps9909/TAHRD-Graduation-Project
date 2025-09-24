// src/game/footOffset.ts
import * as THREE from 'three';

export function computeFootOffset(root: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(root);
  const off = -box.min.y;
  return (isFinite(off) && Math.abs(off)<10_000) ? off : 0.12;
}

export function enableCastReceiveNoCull(root: THREE.Object3D){
  root.traverse((o: any)=>{
    if (o.isMesh){
      o.castShadow = o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });
}