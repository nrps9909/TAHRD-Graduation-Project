import * as React from 'react';
import * as THREE from 'three';
import { Html, useThree } from '@react-three/drei';

type Props = {
  targetRef: React.RefObject<THREE.Object3D>; // feetPivot 根節點
  label: string;
  extraOffset?: number; // 頭頂上方再抬高
  minHeight?: number;   // 角色估計身高下限
};

export default function NameplateOverlay({
  targetRef, label, extraOffset = 0.25, minHeight = 1.4
}: Props) {
  const groupRef = React.useRef<THREE.Group>(null!);
  const [headY, setHeadY] = React.useState(minHeight);
  const { camera } = useThree();

  // 量測 feetPivot 的包圍盒 → 以 max.y 當身高
  React.useLayoutEffect(() => {
    if (!targetRef.current) return;
    const box = new THREE.Box3().setFromObject(targetRef.current);
    const h = Math.max(minHeight, box.max.y);
    setHeadY(h);
  }, [targetRef.current, minHeight]);

  // 每幀把名字牌跟到 feetPivot 上方
  React.useEffect(() => {
    let id = 0;
    const loop = () => {
      if (targetRef.current && groupRef.current) {
        targetRef.current.getWorldPosition(groupRef.current.position);
        groupRef.current.position.y += headY + extraOffset;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [headY, extraOffset, targetRef]);

  return (
    <group ref={groupRef} frustumCulled={false}>
      <Html
        center
        transform
        distanceFactor={8}            // 距離縮放
        pointerEvents="none"
        zIndexRange={[1000, 1000]}    // 疊在最上層
      >
        <div style={{
          padding: '2px 8px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}