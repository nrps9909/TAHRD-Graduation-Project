/**
 * TerrainIsland - Constants
 */

import { TerrainType, type Region } from './types'

// 7个区域的定义（不同的地形特征）
export const REGIONS: Region[] = [
  {
    id: 'learning',
    pos: [8, 12],
    type: TerrainType.TERRACE,
    height: 2.2,
    radius: 5.5,
    color: '#A8D5E6',
    name: '学习梯田' // 阶梯状书架地形
  },
  {
    id: 'inspiration',
    pos: [-8, 12],
    type: TerrainType.PEAK,
    height: 3.2,
    radius: 4.5,
    color: '#FFE5B8',
    name: '灵感高峰' // 尖锐山峰
  },
  {
    id: 'work',
    pos: [13, 0],
    type: TerrainType.GRASSLAND,
    height: 1.5,
    radius: 5,
    color: '#D8C8E8',
    name: '工作平原' // 平整的农田
  },
  {
    id: 'social',
    pos: [8, -12],
    type: TerrainType.HILL,
    height: 1.8,
    radius: 5.2,
    color: '#FFCCE5',
    name: '社交谷地' // 温和的谷地
  },
  {
    id: 'life',
    pos: [-8, -12],
    type: TerrainType.HILL,
    height: 1.6,
    radius: 5.2,
    color: '#C8E6C8',
    name: '生活丘陵' // 起伏的丘陵
  },
  {
    id: 'goals',
    pos: [-13, 0],
    type: TerrainType.MOUNTAIN,
    height: 2.0,
    radius: 4.5,
    color: '#F8C8C8',
    name: '目标山脊' // 箭头形山脊
  },
  {
    id: 'resources',
    pos: [0, 0],
    type: TerrainType.MOUNTAIN,
    height: 2.8,
    radius: 6,
    color: '#90C695',
    name: '资源高地' // 中央宝库山
  }
]
