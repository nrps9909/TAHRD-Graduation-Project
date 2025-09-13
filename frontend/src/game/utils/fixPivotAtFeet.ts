import * as THREE from 'three';

/**
 * 將 node 的最低點對齊到 y=0（腳底當原點）。
 * 回傳校正後的包裝 Group 與位移量 offsetY（>0 代表上提了多少）。
 */
export function wrapWithFeetPivot<T extends THREE.Object3D>(node: T): {
  group: THREE.Group;
  offsetY: number;
} {
  const group = new THREE.Group();
  group.name = 'FeetPivotGroup';
  
  // 放大角色模型 (2倍大小)
  node.scale.set(2, 2, 2);
  
  group.add(node);

  // 量測並把最低點提到 y=0
  const box = new THREE.Box3().setFromObject(node);
  const minY = box.min.y;                 // 可能是負的或正的
  node.position.y -= minY;                // 最低點搬到 0
  const offsetY = -minY;                  // 記錄上提量

  // 加個 bbox 可視除錯（需要時再開）
  // const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(node));
  // group.add(helper);

  (group as any).userData.pivotOffsetY = offsetY;
  return { group, offsetY };
}