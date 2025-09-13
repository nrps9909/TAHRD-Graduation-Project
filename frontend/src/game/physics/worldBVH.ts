import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast; // 全域啟用

let worldMesh: THREE.Mesh | null = null;

export function buildWorldBVH(meshes: THREE.Mesh[]) {
  // 將所有可碰撞地形（地面 + 山脈）合併成一個 Mesh，建立 BVH
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Matrix4[] = [];
  const temp = new THREE.Matrix4();

  for (const m of meshes) {
    if (!m.geometry) continue;
    const g = m.geometry.clone();
    temp.copy(m.matrixWorld);
    g.applyMatrix4(temp);
    geoms.push(g);
  }
  const merged = mergeGeometries(geoms, false)!;
  (merged as any).boundsTree = new MeshBVH(merged, { lazyGeneration: false });

  worldMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ visible: false }));
  worldMesh.name = 'WorldCollisionMesh';
  return worldMesh;
}

export function getWorldCollisionMesh(): THREE.Mesh | null {
  return worldMesh;
}