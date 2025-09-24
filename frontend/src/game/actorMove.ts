// src/game/actorMove.ts
import * as THREE from 'three';
import { getGroundSmoothed } from './ground';
import { collisionSystem } from '../utils/collision';

export type MoveInput = { dir: THREE.Vector3; speed: number };

let debugCount = 0;

export function tickActorOnGround(g:THREE.Object3D, input:MoveInput, dt:number, lastSafe:THREE.Vector3){

  // 限制 dt，避免掉幀卡頓
  dt = Math.min(dt, 1/30);

  // 檢查是否有移動輸入
  const hasInput = input.dir.lengthSq() > 0.001;

  if (debugCount++ < 10 && hasInput) {
    console.log('[MOVE] Input:', input.dir.toArray(), 'speed:', input.speed);
  }

  // 1) 取得當前地面高度
  const currentGround = getGroundSmoothed(g.position.x, g.position.z);
  if (!currentGround.ok) {
    if (debugCount < 5) console.warn('[MOVE] No ground at current pos, using lastSafe');
    g.position.copy(lastSafe);
    return;
  }

  // 2) 如果有移動輸入，進行 XZ 位移
  if (hasInput) {
    // 使用簡化的移動邏輯，直接水平移動
    const move = input.dir.clone().multiplyScalar(input.speed * dt);
    const targetX = g.position.x + move.x;
    const targetZ = g.position.z + move.z;

    // 創建目標位置向量進行碰撞檢測
    const targetPosition = new THREE.Vector3(targetX, g.position.y, targetZ);

    // 檢查碰撞系統是否允許移動到新位置
    const isPositionValid = collisionSystem.isValidPosition(targetPosition, 0.5); // 玩家碰撞半徑 0.5

    if (isPositionValid) {
      // 檢查新位置地面
      const newGround = getGroundSmoothed(targetX, targetZ);
      if (newGround.ok) {
        // 移動到新位置
        g.position.x = targetX;
        g.position.z = targetZ;
        g.position.y = newGround.y;

        // 更新安全位置
        lastSafe.copy(g.position);

        // 朝向平滑
        if (move.lengthSq() > 1e-6) {
          const yaw = Math.atan2(move.x, move.z);
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
          if (g.quaternion) {
            g.quaternion.slerp(q, Math.min(1, 8 * dt));
          }
        }

        if (debugCount < 20 && debugCount % 5 === 0) {
          console.log(`[MOVE] 移動成功到 (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
        }
      } else {
        // 新位置沒有地面，不移動，但確保貼地
        g.position.y = currentGround.y;
        if (debugCount < 10) console.log('[MOVE] 新位置沒有地面，停止移動');
      }
    } else {
      // 碰撞檢測失敗，嘗試獲取最近的有效位置
      const currentPosition = new THREE.Vector3(g.position.x, g.position.y, g.position.z);
      const closestValidPosition = collisionSystem.getClosestValidPosition(currentPosition, targetPosition, 0.5);

      // 如果找到了更近的有效位置並且不是原位置
      if (closestValidPosition.distanceTo(currentPosition) > 0.1) {
        const newGround = getGroundSmoothed(closestValidPosition.x, closestValidPosition.z);
        if (newGround.ok) {
          g.position.x = closestValidPosition.x;
          g.position.z = closestValidPosition.z;
          g.position.y = newGround.y;
          lastSafe.copy(g.position);

          if (debugCount < 10) {
            console.log(`[MOVE] 碰撞阻擋，移動到最近有效位置 (${closestValidPosition.x.toFixed(1)}, ${closestValidPosition.z.toFixed(1)})`);
          }
        }
      } else {
        // 完全無法移動，確保貼地
        g.position.y = currentGround.y;
        if (debugCount < 5) {
          console.log(`[MOVE] 碰撞阻擋，無法移動到 (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
        }
      }
    }
  } else {
    // 沒有移動，確保貼地
    g.position.y = currentGround.y;
    lastSafe.copy(g.position);
  }
}