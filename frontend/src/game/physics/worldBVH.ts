import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Simplified BVH implementation without three-mesh-bvh to avoid compatibility issues
let worldMesh: THREE.Mesh | null = null;

export function buildWorldBVH(meshes: THREE.Mesh[]) {
  // 將所有可碰撞地形（地面 + 山脈）合併成一個 Mesh
  const geoms: THREE.BufferGeometry[] = [];
  const temp = new THREE.Matrix4();

  for (const m of meshes) {
    if (!m.geometry) continue;
    const g = m.geometry.clone();
    temp.copy(m.matrixWorld);
    g.applyMatrix4(temp);
    geoms.push(g);
  }
  
  if (geoms.length === 0) return null;
  
  const merged = mergeGeometries(geoms, false);
  if (!merged) return null;

  worldMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ visible: false }));
  worldMesh.name = 'WorldCollisionMesh';
  return worldMesh;
}

export function getWorldCollisionMesh(): THREE.Mesh | null {
  return worldMesh;
}