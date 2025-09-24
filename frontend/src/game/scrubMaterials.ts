import * as THREE from 'three';

export function scrubWireAndEdges(root: THREE.Object3D) {
  const removeList: THREE.Object3D[] = [];
  root.traverse((o: any) => {
    if (o instanceof THREE.LineSegments || o instanceof THREE.Line) {
      removeList.push(o);
      return;
    }
    const mats: THREE.Material[] = [];
    if (o.material) Array.isArray(o.material) ? mats.push(...o.material) : mats.push(o.material);
    for (const m of mats) {
      // 關閉 wireframe
      if ((m as any).wireframe) (m as any).wireframe = false;
      // 確保深度設定
      if ('depthWrite' in m) (m as any).depthWrite = true;
      if ('depthTest' in m) (m as any).depthTest = true;
      // 遇到 Line 材質的 mesh 直接移除
      if (m instanceof THREE.LineBasicMaterial) removeList.push(o);
    }
  });
  removeList.forEach((n) => n.parent?.remove(n));
}

export function purgeSceneLines(scene: THREE.Scene) {
  const trash: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.LineSegments || o instanceof THREE.Line) trash.push(o);
    const name = (o as any).name?.toLowerCase?.() || '';
    if (name.includes('wire') || name.includes('edge') || name.includes('outline')) trash.push(o);
  });
  trash.forEach((n) => n.parent?.remove(n));
}