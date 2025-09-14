import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { markWalkable, registerWalkable } from './walkable';

(THREE.Mesh as any).prototype.raycast = acceleratedRaycast;

let worldMesh: THREE.Mesh | null = null;

export function buildWorldBVH(meshes: THREE.Mesh[]) {
  const geoms: THREE.BufferGeometry[] = [];
  for (const m of meshes) {
    if (!m?.geometry) continue;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    geoms.push(g);
  }
  const merged = mergeGeometries(geoms, false)!;
  (merged as any).boundsTree = new MeshBVH(merged, { lazyGeneration: false });

  worldMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ visible: false }));
  worldMesh.name = 'WorldCollisionMesh';
  worldMesh.matrixAutoUpdate = false;

  // Only let Raycast hit this one
  markWalkable(worldMesh, true);
  registerWalkable(worldMesh);
  return worldMesh;
}

export function getWorldCollisionMesh() { return worldMesh; }