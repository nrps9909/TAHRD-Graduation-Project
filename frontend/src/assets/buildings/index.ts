export type BuildingKey = 'house_a' | 'house_b' | 'inn' | 'windmill' | 'barn' | 'house_central' | 'bell_tower_view' | 'blacksmith_large' | 'house_c';

export const BUILDINGS: Record<BuildingKey, {
  url: string;
  objUrl?: string;      // OBJ 後備方案
  mtlUrl?: string;      // MTL 材質
  scale: number;        // 模型比例（統一世界尺度）
  yOffset?: number;     // 模型原點非腳底時微調
}> = {
  house_a: {
    url: '/models/buildings/house_a.glb',
    objUrl: '/building/OBJ/House_1.obj',
    mtlUrl: '/building/OBJ/House_1.mtl',
    scale: 3.5,
    yOffset: 0
  },
  house_b: {
    url: '/models/buildings/house_b.glb',
    objUrl: '/building/OBJ/House_2.obj',
    mtlUrl: '/building/OBJ/House_2.mtl',
    scale: 3.5,
    yOffset: 0
  },
  inn: {
    url: '/models/buildings/inn.glb',
    objUrl: '/building/OBJ/Inn.obj',
    mtlUrl: '/building/OBJ/Inn.mtl',
    scale: 4.0,
    yOffset: 0
  },
  windmill: {
    url: '/models/buildings/windmill.glb',
    objUrl: '/building/OBJ/Mill.obj',
    mtlUrl: '/building/OBJ/Mill.mtl',
    scale: 3.8,
    yOffset: 0
  }, // 風車
  barn: {
    url: '/models/buildings/barn.glb',
    objUrl: '/building/OBJ/Stable.obj',
    mtlUrl: '/building/OBJ/Stable.mtl',
    scale: 3.6,
    yOffset: 0
  },
  house_central: {
    url: '/models/buildings/house_central.glb',
    objUrl: '/building/OBJ/House_4.obj',
    mtlUrl: '/building/OBJ/House_4.mtl',
    scale: 3.0,
    yOffset: 0
  },
  bell_tower_view: {
    url: '/models/buildings/bell_tower.glb',
    objUrl: '/building/OBJ/Bell_Tower.obj',
    mtlUrl: '/building/OBJ/Bell_Tower.mtl',
    scale: 2.8,
    yOffset: 0
  },
  blacksmith_large: {
    url: '/models/buildings/blacksmith_large.glb',
    objUrl: '/building/OBJ/Blacksmith.obj',
    mtlUrl: '/building/OBJ/Blacksmith.mtl',
    scale: 4.5, // 大型建築，比其他建築更大
    yOffset: 0
  },
  house_c: {
    url: '/models/buildings/house_c.glb',
    objUrl: '/building/OBJ/House_3.obj',
    mtlUrl: '/building/OBJ/House_3.mtl',
    scale: 5.5, // 增加尺寸讓它更醒目
    yOffset: 0
  },
};