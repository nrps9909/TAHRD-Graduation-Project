import React from 'react'
import * as THREE from 'three'
import Building from './Building'
import { getTerrainHeight } from './TerrainModel'

// 簡化的建築配置類型
type BrightBuildingConfig = {
  id: string
  objUrl: string
  mtlUrl?: string
  pos: [number, number, number]
  ry?: number
  scale?: number
  enabled?: boolean
}

// === 明亮建築配置 - 移除黑色線條建築，只保留亮色款 ===
let brightBuildingsConfig: BrightBuildingConfig[] = [
  // 明亮房屋 - 替換醜陋的黑灰建築
  {
    id: 'bright_house_main',
    objUrl: '/building/OBJ/House_1.obj',
    mtlUrl: '/building/OBJ/House_1.mtl',
    pos: [25, 0, -15],
    ry: 0.1 * Math.PI,
    scale: 1.6
  },

  // 明亮旅館
  {
    id: 'bright_inn',
    objUrl: '/building/OBJ/Inn.obj',
    mtlUrl: '/building/OBJ/Inn.mtl',
    pos: [32, 0, -8],
    ry: 0.25 * Math.PI,
    scale: 1.5
  },

  // 小巧房屋
  {
    id: 'bright_house_small',
    objUrl: '/building/OBJ/House_2.obj',
    mtlUrl: '/building/OBJ/House_2.mtl',
    pos: [18, 0, -22],
    ry: -0.15 * Math.PI,
    scale: 1.4
  },

  // 額外的明亮建築 - 創造更豐富的村莊感
  {
    id: 'bright_house_cottage',
    objUrl: '/building/OBJ/House_3.obj',
    mtlUrl: '/building/OBJ/House_3.mtl',
    pos: [15, 0, -5],
    ry: 0.3 * Math.PI,
    scale: 1.5
  },

  {
    id: 'bright_stable',
    objUrl: '/building/OBJ/Stable.obj',
    mtlUrl: '/building/OBJ/Stable.mtl',
    pos: [40, 0, -18],
    ry: -0.2 * Math.PI,
    scale: 1.4
  },

  // 新增更多建築創造活躍村莊
  {
    id: 'bright_mill',
    objUrl: '/building/OBJ/Mill.obj',
    mtlUrl: '/building/OBJ/Mill.mtl',
    pos: [10, 0, 25],
    ry: 0.4 * Math.PI,
    scale: 1.6
  }

  // 注意：任何「黑色線條框架感」建築都已從配置中移除
]

// === 定義「道路走廊」：一條或多條線段 + 半寬（禁放區寬度的一半）===
// 根據地圖佈局定義主要道路，建築會自動避開這些區域
const ROAD_CORRIDORS: { a: [number, number]; b: [number, number]; halfWidth: number }[] = [
  // 主幹道：從西到東（橫穿地圖中心）
  { a: [-60, 0], b: [60, 0], halfWidth: 8 },

  // 南北向道路：從南到北
  { a: [0, -40], b: [0, 40], halfWidth: 7 },

  // 東南向支線道路
  { a: [20, -30], b: [50, -10], halfWidth: 6 },

  // 西南向支線道路
  { a: [-20, -30], b: [-50, -10], halfWidth: 6 },
]

// === 2D：點到線段距離與投影參數 t（0~1）===
function distPointToSegment2D(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az
  const wx = px - ax, wz = pz - az
  const vv = vx*vx + vz*vz || 1e-6
  const t = Math.max(0, Math.min(1, (wx*vx + wz*vz) / vv))
  const cx = ax + t*vx, cz = az + t*vz
  const dx = px - cx, dz = pz - cz
  return { d: Math.hypot(dx, dz), nx: dx, nz: dz, t }
}

// === 把建築從「道路走廊」推到外面（保留一點緩衝）===
function pushOutOfRoads(list: BrightBuildingConfig[], margin = 1.2) {
  for (const b of list) {
    let x = b.pos[0], z = b.pos[2]

    for (const r of ROAD_CORRIDORS) {
      const { d, nx, nz } = distPointToSegment2D(x, z, r.a[0], r.a[1], r.b[0], r.b[1])
      const limit = r.halfWidth + margin

      if (d < limit) {
        const k = (limit - d) + 1e-3
        const nlen = Math.hypot(nx, nz) || 1e-6
        x += (nx / nlen) * k
        z += (nz / nlen) * k
      }
    }

    b.pos = [x, 0, z]
  }
}

// === 彼此拉開（XZ 最小距離）===
function spreadApart(list: BrightBuildingConfig[], minDist = 12) {
  const pts = list.map((b) => new THREE.Vector2(b.pos[0], b.pos[2]))
  const iterations = 15

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j]
        const dx = b.x - a.x, dz = b.y - a.y
        const d = Math.hypot(dx, dz) || 1e-6

        if (d < minDist) {
          const push = (minDist - d) * 0.5
          const nx = dx / d, nz = dz / d
          a.x -= nx * push; a.y -= nz * push
          b.x += nx * push; b.y += nz * push
        }
      }
    }
  }

  // 寫回到配置中
  list.forEach((b, i) => (b.pos = [pts[i].x, 0, pts[i].y]))
}

// ===== 依序處理：先推離道路 → 再彼此拉開 → 最後貼地 =====
console.log('🛣️ 開始處理建築佈局：避開道路 + 拉開距離')

// 1. 先推離道路走廊
pushOutOfRoads(brightBuildingsConfig, 1.5) // 不要擋在路中間，留1.5米緩衝

// 2. 建築彼此拉開距離
spreadApart(brightBuildingsConfig, 14) // 建築之間至少14米距離

console.log('🏘️ 明亮建築佈局已完成，配置如下:')
brightBuildingsConfig.forEach(b =>
  console.log(`  ${b.id}: (${b.pos[0].toFixed(1)}, ${b.pos[1]}, ${b.pos[2].toFixed(1)}) 避開道路後`)
)

export default function BrightBuildings() {
  return (
    <group name="BrightBuildings">
      {brightBuildingsConfig
        .filter((b) => b.enabled !== false)
        .map((b) => {
          // 讓建築 y 一律貼地（地面高度 + 基座偏移）
          const groundHeight = getTerrainHeight(b.pos[0], b.pos[2])
          const y = (groundHeight ?? 0) + 0.04

          return (
            <Building
              key={b.id}
              id={b.id}
              objUrl={b.objUrl}
              mtlUrl={b.mtlUrl}
              position={[b.pos[0], y, b.pos[2]]}
              rotationY={b.ry ?? 0}
              scale={b.scale ?? 1.5}
              baseOffset={0.04}
            />
          )
        })}
    </group>
  )
}

// 導出配置供外部修改
export { brightBuildingsConfig, spreadApart, pushOutOfRoads, ROAD_CORRIDORS }
export type { BrightBuildingConfig }