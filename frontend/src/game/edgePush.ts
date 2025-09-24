// src/game/edgePush.ts
import * as THREE from 'three';
import { getGroundRoot } from './ground';

const RAY=new THREE.Raycaster(), UP=new THREE.Vector3(0,1,0);

export function pushOutFromWalls(pos:THREE.Vector3, chest=0.9, skin=0.25, iterations=3){
  const root=getGroundRoot(); if(!root) return;

  // 檢測多個高度，確保不會從上方或下方穿過
  const heights = [0.2, chest, chest*1.5]; // 腳部、胸部、頭部

  for(let it=0; it<iterations; it++){
    let total=new THREE.Vector3();

    for(const h of heights) {
      const origin=new THREE.Vector3(pos.x, pos.y+h, pos.z);

      // 16方向檢測，更密集的檢測
      for(let i=0;i<16;i++){
        const a=i/16*Math.PI*2;
        const d=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
        RAY.set(origin,d);
        RAY.far=skin+0.1;

        const hit=RAY.intersectObject(root,true)[0];
        if(!hit||!hit.face) continue;

        const n=hit.face.normal.clone()
          .applyQuaternion(hit.object.getWorldQuaternion(new THREE.Quaternion()))
          .normalize();

        // 檢查是否為牆面（非地面）
        if (Math.abs(n.dot(UP))>=0.7) continue;

        const penetration=skin-hit.distance;
        if(penetration>0) {
          // 增加推離力度
          total.add(n.multiplyScalar(penetration+0.01));
        }
      }
    }

    if(total.lengthSq()<1e-10) break;
    pos.add(total);
  }
}