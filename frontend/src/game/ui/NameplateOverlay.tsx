import * as React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

type Props = {
  targetRef: React.RefObject<THREE.Object3D>; // 角色物理根：feetPivotRef
  label: string;
  extraOffset?: number;  // 頭頂再上移
  minHeight?: number;    // 估計身高下限
};

export default function NameplateOverlay({ targetRef, label, extraOffset = 0.25, minHeight = 1.5 }: Props) {
  const [headY, setHeadY] = React.useState(minHeight);
  const localRef = React.useRef<THREE.Group>(null!);
  const { camera } = useThree();

  // 初次量測 feetPivot 的包圍盒，max.y 視為身高
  React.useLayoutEffect(() => {
    if (!targetRef.current) return;
    const box = new THREE.Box3().setFromObject(targetRef.current);
    const h = Math.max(minHeight, box.max.y);
    setHeadY(h);
  }, [targetRef.current, minHeight]);

  // 跟著 feetPivot 移動（掛在 feetPivot 的 child；只要設相對位置即可）
  return (
    <group ref={localRef} position={[0, headY + extraOffset, 0]} frustumCulled={false}>
      <Html
        center
        transform
        distanceFactor={8}
        pointerEvents="none"
        zIndexRange={[1000, 1000]}   // 疊在最上層
        occlude={false}
      >
        <div style={{
          padding: '2px 8px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}