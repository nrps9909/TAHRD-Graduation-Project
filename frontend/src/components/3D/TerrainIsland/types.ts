/**
 * TerrainIsland - Type definitions
 */

// 地形类型枚举
export enum TerrainType {
  OCEAN = 'ocean',           // 深海
  SHALLOW = 'shallow',       // 浅水
  BEACH = 'beach',           // 沙滩
  GRASSLAND = 'grassland',   // 草地
  TERRACE = 'terrace',       // 梯田
  HILL = 'hill',             // 丘陵
  MOUNTAIN = 'mountain',     // 山地
  PEAK = 'peak'              // 山峰
}

export interface Region {
  id: string
  pos: [number, number]
  type: TerrainType
  height: number
  radius: number
  color: string
  name: string
}
