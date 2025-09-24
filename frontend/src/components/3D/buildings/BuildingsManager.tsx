import * as THREE from 'three';
import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import Building from './Building';
import { BUILDINGS, BuildingKey } from '@/assets/buildings';
import { getTerrainHeight, getTerrainNormal, isMountainArea } from '@/components/3D/TerrainModel';
import { purgeSceneLines } from '@/game/scrubMaterials';

type Spawn = { kind: BuildingKey; x: number; z: number; rotY?: number };

const MIN_DIST = 14;     // 建物間最小間距（世界單位）
const SAFE_RADIUS = 20;  // 與玩家出生點距離（避免擋路）
const TRY_MAX = 50;      // 亂數重試次數

export default function BuildingsManager() {
  const { scene } = useThree();

  //—— 一次性清場中遺留線段 ——//
  useMemo(() => {
    purgeSceneLines(scene as THREE.Scene);
  }, [scene]);

  // 精心設計的建築位置 - 避免山脈和隨機性造成的問題
  const seeds: Spawn[] = useMemo(() => {
    const list: Spawn[] = [
      // 主建築 - Inn旅館，玩家前方可見位置（平地）
      {
        kind: 'inn',
        x: -15,
        z: -45,
        rotY: 0
      },
      // 東南方 - 風車（遠離山脈的平地）
      {
        kind: 'windmill',
        x: 45,
        z: -60,
        rotY: -Math.PI / 4
      },
      // 西南方 - 房屋A（平地區域）
      {
        kind: 'house_a',
        x: -55,
        z: -45,
        rotY: Math.PI / 3
      },
      // 東北方 - 倉庫（避開北方山脈）
      {
        kind: 'barn',
        x: 35,
        z: 25,
        rotY: Math.PI
      },
      // 西北方 - 房屋B（平地區域）
      {
        kind: 'house_b',
        x: -45,
        z: 25,
        rotY: 3 * Math.PI / 4
      },
      // 新增建築2 - Bell Tower 起始視野內
      {
        kind: 'bell_tower_view',
        x: -5,
        z: -5,
        rotY: -Math.PI / 4
      },
      // 新增建築3 - 大型鐵匠鋪，位於右側
      {
        kind: 'blacksmith_large',
        x: 5,
        z: -25,
        rotY: Math.PI / 6 // 30度角度，面向玩家
      }
    ];

    // 驗證所有位置都滿足距離要求
    const validatedList: Spawn[] = [];
    for (const spawn of list) {
      const { x, z } = spawn;

      // 檢查與玩家出生點的距離（假設 [-15, -15]）
      const distFromPlayer = Math.hypot(-15 - x, -15 - z);
      if (distFromPlayer < SAFE_RADIUS && spawn.kind !== 'inn') {
        console.warn(`⚠️ 建築 ${spawn.kind} 太靠近玩家出生點，跳過`);
        continue;
      }

      // 檢查與其他建築的距離
      const tooClose = validatedList.some(existing =>
        Math.hypot(existing.x - x, existing.z - z) < MIN_DIST
      );
      if (tooClose) {
        console.warn(`⚠️ 建築 ${spawn.kind} 與其他建築太近，跳過`);
        continue;
      }

      // 首先檢查是否在山脈區域
      const inMountainArea = isMountainArea(x, z);
      if (inMountainArea) {
        console.warn(`⚠️ 建築 ${spawn.kind} 位置在山脈區域 (${x}, ${z})，跳過`);
        continue;
      }

      // 檢查地形適宜性
      const gh = getTerrainHeight(x, z);
      const normal = getTerrainNormal(x, z);
      const slopeDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1)));

      if (slopeDeg > 25) {
        console.warn(`⚠️ 建築 ${spawn.kind} 位置太陡峭 (${slopeDeg.toFixed(1)}°)，跳過`);
        continue;
      }

      // 檢查高度是否合理（避免過高或過低的區域）
      if (gh > 15 || gh < -2) {
        console.warn(`⚠️ 建築 ${spawn.kind} 高度不合理 (${gh.toFixed(1)})，跳過`);
        continue;
      }

      validatedList.push(spawn);
      console.log(`✅ 建築 ${spawn.kind} 位置驗證通過: (${x}, ${z}), 坡度: ${slopeDeg.toFixed(1)}°`);
    }

    console.log(`🏘️ BuildingsManager: 成功驗證 ${validatedList.length}/${list.length} 個建築位置`);
    return validatedList;
  }, []);

  return (
    <group name="BuildingsManager">
      {seeds.map((s, i) => (
        <Building
          key={`${s.kind}-${i}`}
          kind={s.kind}
          position={[s.x, 0, s.z]}
          rotY={s.rotY}
          stickToGround
        />
      ))}
    </group>
  );
}