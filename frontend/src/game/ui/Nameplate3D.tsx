import * as React from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';

type Props = {
  /** 指向角色「物理根節點」（feetPivotRef） */
  targetRef: React.RefObject<THREE.Object3D>;
  /** 顯示的名字 */
  label: string;
  /** 角色身高提示（取樣失敗時採用），單位=世界單位 */
  heightHint?: number; // default 1.6
  /** 額外上移量（讓字在頭上再高一點） */
  extraOffset?: number; // default 0.2
  /** 字體大小 */
  fontSize?: number; // default 0.28
};

export default function Nameplate3D({
  targetRef,
  label,
  heightHint = 1.6,
  extraOffset = 0.2,
  fontSize = 0.28,
}: Props) {
  const [headY, setHeadY] = React.useState<number>(heightHint);
  const groupRef = React.useRef<THREE.Group>(null!);
  const textRef = React.useRef<any>(null);

  // 量測角色當前高度（feetPivot 的 y=0 → 高度 = box.max.y）
  React.useLayoutEffect(() => {
    if (!targetRef.current) return;
    const box = new THREE.Box3().setFromObject(targetRef.current);
    const h = Math.max(0.5, box.max.y); // 腳在0，上界即身高
    setHeadY(h);
  }, [targetRef.current]);

  // 讓文字永不被遮蔽 & 排序在最上層
  React.useEffect(() => {
    const t = textRef.current;
    if (t?.material) {
      t.material.depthTest = false;
      t.renderOrder = 9999;
    }
  }, []);

  return (
    <group ref={groupRef} frustumCulled={false} position={[0, headY + extraOffset, 0]}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          ref={textRef}
          anchorX="center"
          anchorY="bottom"
          fontSize={fontSize}
          maxWidth={3}
          color="#ffffff"
          outlineWidth={0.04}
          outlineColor="#222222"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}