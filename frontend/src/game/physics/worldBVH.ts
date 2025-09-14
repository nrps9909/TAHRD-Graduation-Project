import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { markWalkable, registerWalkable } from './walkable';

(THREE.Mesh as any).prototype.raycast = acceleratedRaycast;

let WORLD: THREE.Mesh | null = null;

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

  WORLD = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ visible: false }));
  WORLD.matrixAutoUpdate = false;
  WORLD.name = 'WorldCollisionMesh';

  // Only let Raycast hit this one
  markWalkable(WORLD, true);
  registerWalkable(WORLD);
  return WORLD;
}

export function getWorldMesh() { return WORLD; }
export function getWorldCollisionMesh() { return WORLD; }