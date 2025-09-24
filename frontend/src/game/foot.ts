// src/game/foot.ts
import * as THREE from 'three';
export function mountModelAndLiftFeet(container:THREE.Group, glb:THREE.Object3D){
  console.log('[FOOT] Mounting model:', glb);
  container.add(glb);

  // 計算邊界框來調整腳底
  const box = new THREE.Box3().setFromObject(glb);
  const foot = -box.min.y;

  console.log('[FOOT] BBox:', box.min.toArray(), box.max.toArray(), 'foot offset:', foot.toFixed(2));

  // 只有在合理範圍內才應用腳底偏移，避免模型消失
  if (isFinite(foot) && foot > -10 && foot < 10) {
    glb.position.y = foot;
    console.log('[FOOT] Applied foot offset:', foot.toFixed(2));
  } else {
    console.warn('[FOOT] Invalid foot offset, skipping:', foot);
  }

  // 確保所有網格可見
  let meshCount = 0;
  container.traverse((o:any)=>{
    if(o.isMesh){
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      o.visible = true;
      meshCount++;
    }
  });

  console.log('[FOOT] Model mounted with', meshCount, 'meshes');
}