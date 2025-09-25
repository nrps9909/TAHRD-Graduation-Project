import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { scrubWireAndEdges } from '@/game/scrubMaterials';
import { getTerrainHeight } from '@/components/3D/TerrainModel';
import { BUILDINGS, BuildingKey } from '@/assets/buildings';
import { collisionSystem } from '@/utils/collision';

type Props = {
  kind: BuildingKey;
  position: [number, number, number]; // x, y(可給 0), z
  rotY?: number;                       // 朝向
  stickToGround?: boolean;             // 預設 true
  roofColor?: string;                  // 屋頂顏色覆寫
  scale?: number;                      // 自定義縮放覆寫
};

export default function Building({ kind, position, rotY = 0, stickToGround = true, roofColor, scale }: Props) {
  const def = BUILDINGS[kind];
  const { scene } = useThree();
  const group = useRef<THREE.Group>(null!);
  const [loadedObject, setLoadedObject] = useState<THREE.Object3D | null>(null);

  // 使用 OBJ/MTL 載入器載入模型
  useEffect(() => {
    if (!def.objUrl) {
      console.warn(`⚠️ 建築 ${kind} 沒有OBJ路徑，跳過載入`);
      return;
    }

    console.log(`🏗️ 開始載入建築: ${kind}, OBJ: ${def.objUrl}, MTL: ${def.mtlUrl || '無'}`);

    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    // 先載入材質（如果有的話）
    if (def.mtlUrl) {
      mtlLoader.load(
        def.mtlUrl,
        (materials) => {
          materials.preload();
          objLoader.setMaterials(materials);

          // 載入OBJ模型
          objLoader.load(
            def.objUrl!,
            (object) => {
              // 清理線框和邊緣
              scrubWireAndEdges(object);

              // 設置陰影
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;

                  // 額外的材質清理和修復
                  if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((material, index) => {
                      if ('wireframe' in material) {
                        (material as any).wireframe = false;
                      }

                      // 屋頂顏色覆寫邏輯
                      if (roofColor && child.name && (
                        child.name.toLowerCase().includes('roof') ||
                        child.name.toLowerCase().includes('屋頂') ||
                        child.name.toLowerCase().includes('top')
                      )) {
                        if (material && 'color' in material) {
                          (material as any).color.set(roofColor);
                          material.needsUpdate = true;
                          console.log(`🏠 屋頂顏色已覆寫為: ${roofColor} (${child.name})`);
                        }
                      }

                      // 只處理真正有問題的材質：純黑色或極暗材質
                      if (material && material.color) {
                        const colorHex = material.color.getHex();
                        const avgColor = (material.color.r + material.color.g + material.color.b) / 3;

                        // 只處理真正的問題材質：純黑色或極暗色 (平均RGB < 0.05)
                        const isPureBlack = colorHex === 0x000000;
                        const isExtremelyDark = avgColor < 0.05;

                        if (isPureBlack || isExtremelyDark) {
                          console.log(`🚨 檢測到問題材質: ${child.name} RGB=(${material.color.r.toFixed(3)}, ${material.color.g.toFixed(3)}, ${material.color.b.toFixed(3)})`);

                          // 溫和的亮度調整，保持原始色調
                          const originalR = material.color.r;
                          const originalG = material.color.g;
                          const originalB = material.color.b;

                          // 如果是純黑色，設置默認顏色
                          if (isPureBlack) {
                            material.color.setRGB(0.5, 0.5, 0.5); // 中灰色
                            console.log(`🎨 純黑色材質已調整為中灰色`);
                          } else {
                            // 如果是極暗色，提升亮度但保持色調
                            const brightnessFactor = 0.3 / Math.max(avgColor, 0.01); // 提升到至少0.3的亮度
                            material.color.setRGB(
                              Math.min(originalR * brightnessFactor, 1.0),
                              Math.min(originalG * brightnessFactor, 1.0),
                              Math.min(originalB * brightnessFactor, 1.0)
                            );
                            console.log(`🎨 暗色材質亮度已調整，保持原始色調`);
                          }

                          material.needsUpdate = true;
                        }
                      }
                    });
                  }
                }
              });

              setLoadedObject(object);
              console.log(`✅ 載入建築物: ${kind} (OBJ)`);
            },
            undefined,
            (error) => {
              console.error(`❌ 載入OBJ失敗 ${kind}:`, error);
            }
          );
        },
        undefined,
        (error) => {
          console.warn(`⚠️ 載入MTL失敗 ${kind}，使用預設材質:`, error);
          // 沒有材質也嘗試載入OBJ
          objLoader.load(
            def.objUrl!,
            (object) => {
              scrubWireAndEdges(object);
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;

                  // 只在材質真的缺失或是純白色時才添加後備材質
                  if (!child.material || (child.material && child.material.color && child.material.color.getHex() === 0xffffff)) {
                    let smartColor = '#d8d1be'; // 簡單的後備色

                    // 屋頂顏色覆寫檢查
                    if (roofColor && child.name && (
                      child.name.toLowerCase().includes('roof') ||
                      child.name.toLowerCase().includes('屋頂') ||
                      child.name.toLowerCase().includes('top')
                    )) {
                      smartColor = roofColor;
                      console.log(`🏠 屋頂使用指定顏色: ${roofColor} (${child.name})`);
                    }

                    child.material = new THREE.MeshToonMaterial({
                      color: smartColor,
                      wireframe: false
                    });
                    console.log(`🎨 為無材質的mesh ${child.name} 添加後備材質`);
                  }

                  // 對已有材質的屋頂進行顏色覆寫
                  if (roofColor && child.material && child.name && (
                    child.name.toLowerCase().includes('roof') ||
                    child.name.toLowerCase().includes('屋頂') ||
                    child.name.toLowerCase().includes('top')
                  )) {
                    if ('color' in child.material) {
                      (child.material as any).color.set(roofColor);
                      child.material.needsUpdate = true;
                      console.log(`🏠 屋頂顏色已覆寫為: ${roofColor} (${child.name})`);
                    }
                  }
                }
              });
              setLoadedObject(object);
              console.log(`✅ 載入建築物: ${kind} (OBJ, 無材質)`);
            }
          );
        }
      );
    } else {
      // 直接載入OBJ
      objLoader.load(
        def.objUrl,
        (object) => {
          scrubWireAndEdges(object);
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              // 只在材質真的缺失或是純白色時才添加後備材質
              if (!child.material || (child.material && child.material.color && child.material.color.getHex() === 0xffffff)) {
                let smartColor = '#d8d1be'; // 簡單的後備色

                // 屋頂顏色覆寫檢查
                if (roofColor && child.name && (
                  child.name.toLowerCase().includes('roof') ||
                  child.name.toLowerCase().includes('屋頂') ||
                  child.name.toLowerCase().includes('top')
                )) {
                  smartColor = roofColor;
                  console.log(`🏠 屋頂使用指定顏色: ${roofColor} (${child.name})`);
                }

                child.material = new THREE.MeshToonMaterial({
                  color: smartColor,
                  wireframe: false
                });
                console.log(`🎨 為無材質的mesh ${child.name} 添加後備材質`);
              }

              // 對已有材質的屋頂進行顏色覆寫
              if (roofColor && child.material && child.name && (
                child.name.toLowerCase().includes('roof') ||
                child.name.toLowerCase().includes('屋頂') ||
                child.name.toLowerCase().includes('top')
              )) {
                if ('color' in child.material) {
                  (child.material as any).color.set(roofColor);
                  child.material.needsUpdate = true;
                  console.log(`🏠 屋頂顏色已覆寫為: ${roofColor} (${child.name})`);
                }
              }
            }
          });
          setLoadedObject(object);
          console.log(`✅ 載入建築物: ${kind} (OBJ)`);
        }
      );
    }
  }, [def.objUrl, def.mtlUrl, kind]);

  // 初始放置 & 貼地
  useEffect(() => {
    const g = group.current;
    if (!g || !loadedObject) return;

    // 清空並添加載入的模型
    g.clear();
    g.add(loadedObject);

    g.position.set(position[0], position[1] ?? 0, position[2]);
    g.rotation.set(0, rotY, 0);
    g.scale.setScalar(scale || def.scale);

    // 首次貼地，避免浮空
    if (stickToGround) {
      const gh = getTerrainHeight(g.position.x, g.position.z);
      g.position.y = gh + (def.yOffset ?? 0);
    }

    console.log(`🏠 建築物 ${kind} 已放置: (${g.position.x}, ${g.position.y.toFixed(2)}, ${g.position.z}), 縮放: ${def.scale}`);

    // 設置碰撞檢測
    const boundingBox = new THREE.Box3().setFromObject(g);
    const size = boundingBox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) / 2;

    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(g.position.x, g.position.y, g.position.z),
      radius: radius * 1.3, // 稍微擴大碰撞半徑
      type: 'building',
      id: `building_${kind}_${position[0]}_${position[2]}`,
      userData: {
        buildingName: kind,
        buildingType: 'glb_building',
        buildingScale: def.scale
      }
    });

    console.log(`🚫 建築物 ${kind} 碰撞檢測已設置: 半徑 ${(radius * 1.3).toFixed(1)}`);

    // 清理函數
    return () => {
      collisionSystem.removeCollisionObject(`building_${kind}_${position[0]}_${position[2]}`);
    };
  }, [loadedObject, position, rotY, def.scale, def.yOffset, stickToGround, kind, scale]);

  // 只要場景中仍有線段遺留，開場清一次
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scene && scrubWireAndEdges(scene);
    });
    return () => cancelAnimationFrame(id);
  }, [scene]);

  return <group ref={group} name={`Building_${kind}`} />;
}