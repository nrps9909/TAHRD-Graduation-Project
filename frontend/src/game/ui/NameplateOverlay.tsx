import * as React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';

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
  const [scale, setScale] = React.useState(1);

  // 初次量測 feetPivot 的包圍盒，max.y 視為身高
  React.useLayoutEffect(() => {
    if (!targetRef.current) return;
    
    // 延遲計算以確保模型完全載入
    const timer = setTimeout(() => {
      if (!targetRef.current) return;
      const box = new THREE.Box3().setFromObject(targetRef.current);
      const h = Math.max(minHeight, box.max.y - box.min.y);
      setHeadY(h);
      console.log(`🏷️ Nameplate for "${label}": height=${h.toFixed(2)}`)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [targetRef.current, minHeight, label]);

  // 計算是否在背後並調整縮放
  useFrame(() => {
    if (!targetRef.current || !localRef.current) return;
    
    // 計算角色到相機的向量
    const toCamera = new THREE.Vector3();
    toCamera.subVectors(camera.position, targetRef.current.position);
    toCamera.y = 0; // 只考慮水平方向
    toCamera.normalize();
    
    // 計算角色朝向
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(targetRef.current.quaternion);
    forward.y = 0;
    forward.normalize();
    
    // 計算夹角
    const dot = forward.dot(toCamera);
    
    // 如果在背後，翻轉文字
    const flipScale = dot < 0 ? -1 : 1;
    setScale(flipScale);
  });
  
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
        style={{
          transform: `scaleX(${scale})`
        }}
      >
        <div style={{
          padding: '4px 12px',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.75)',
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          fontFamily: 'sans-serif'
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}