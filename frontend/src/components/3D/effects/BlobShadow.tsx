// src/components/3D/effects/BlobShadow.tsx
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { getGround } from '@/game/ground'; // 你現有的取地函式

type Props = {
  /** 目標角色的 group（必填） */
  target: THREE.Object3D;
  /** 陰影半徑 */
  radius?: number;        // 0.9
  /** 最大不透明度 */
  maxOpacity?: number;    // 0.5
  /** 浮起避免 z-fighting */
  lift?: number;          // 0.01
  /** 依目標高度調整大小/透明度 */
  heightAffects?: boolean;// true
};

function makeRadialTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, r * 0.0, r, r, r * 1.0);
  grd.addColorStop(0.0, 'rgba(0,0,0,0.9)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1.0, 'rgba(0,0,0,0.0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.flipY = false;
  return tex;
}

export default function BlobShadow({
  target,
  radius = 0.9,
  maxOpacity = 0.5,
  lift = 0.01,
  heightAffects = true,
}: Props) {
  const { scene } = useThree();
  const meshRef = useRef<THREE.Mesh>();
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const world = useMemo(() => new THREE.Vector3(), []);
  const tex = useMemo(() => makeRadialTexture(256), []);

  // 幾何直接在幾何層級把法線轉成 +Y（之後只需要套「傾斜四元數」）
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 1);
    g.rotateX(-Math.PI / 2); // 讓平面法線朝 +Y
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false, // 不寫深度避免把地面「蓋黑」
        opacity: maxOpacity,
      }),
    [tex, maxOpacity]
  );

  // 把陰影 mesh 直接掛在 scene（**不要**掛在角色底下）
  useEffect(() => {
    const m = new THREE.Mesh(geom, mat);
    m.renderOrder = 2;
    // 再保險避免 z-fighting
    m.material.polygonOffset = true;
    m.material.polygonOffsetFactor = -1;
    m.material.polygonOffsetUnits = -1;

    scene.add(m);
    meshRef.current = m;

    return () => {
      scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose?.();
    };
  }, [geom, mat, scene]);

  useFrame((_, dt) => {
    const m = meshRef.current;
    if (!m || !target) return;

    // 1) 取目標世界座標（**關鍵：世界座標，不是 local**）
    target.getWorldPosition(world);

    // 2) 依 XZ 射線取地（往下 1000m）
    const gh = getGround(world.x, world.z);

    // 3) 定位在地面 + lift
    const groundY = Number.isFinite(gh?.y) ? gh.y! : world.y - 0.2;
    m.position.set(world.x, groundY + lift, world.z);

    // 4) 法線對齊（幾何已經轉到 +Y，這裡只需要「up→normal」的傾斜）
    const n = gh?.normal ?? up;
    const tilt = new THREE.Quaternion().setFromUnitVectors(up, n.clone().normalize());
    m.quaternion.copy(tilt);

    // 5) 大小/透明度：高度越高越淡、略放大
    const h = Math.max(0, world.y - groundY);
    const t = THREE.MathUtils.clamp(h / 2.0, 0, 1);
    const scale = heightAffects ? THREE.MathUtils.lerp(radius, radius * 1.35, t) : radius;
    const alpha = heightAffects ? THREE.MathUtils.lerp(maxOpacity, maxOpacity * 0.25, t) : maxOpacity;

    m.scale.setScalar(scale * 2); // 半徑→直徑
    (m.material as THREE.MeshBasicMaterial).opacity = alpha;
  });

  return null; // mesh 由我們自己掛到 scene
}