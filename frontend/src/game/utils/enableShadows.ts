import * as THREE from 'three';

export function enableShadows(root: THREE.Object3D, {cast=true, receive=false} = {}) {
  root.traverse(obj => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
      const mat: any = m.material;
      if (mat) {
        mat.needsUpdate = true;
      }
    }
  });
}