/**
 * 島嶼形狀預設庫
 * 提供常見的島嶼形狀範本
 */

export interface ShapePreset {
  id: string
  name: string
  description: string
  icon: string
  points: Array<{ x: number; y: number }>
}

export const islandShapePresets: ShapePreset[] = [
  {
    id: 'heart',
    name: '❤️ 心形',
    description: '浪漫的心形島嶼',
    icon: '❤️',
    points: [
      { x: 0, y: 0.3 },
      { x: -0.3, y: 0.6 },
      { x: -0.6, y: 0.5 },
      { x: -0.7, y: 0.2 },
      { x: -0.6, y: -0.1 },
      { x: 0, y: -0.8 },
      { x: 0.6, y: -0.1 },
      { x: 0.7, y: 0.2 },
      { x: 0.6, y: 0.5 },
      { x: 0.3, y: 0.6 }
    ]
  },
  {
    id: 'star',
    name: '⭐ 星形',
    description: '閃耀的星星島嶼',
    icon: '⭐',
    points: [
      { x: 0, y: 0.8 },
      { x: 0.2, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.3, y: -0.15 },
      { x: 0.5, y: -0.7 },
      { x: 0, y: -0.35 },
      { x: -0.5, y: -0.7 },
      { x: -0.3, y: -0.15 },
      { x: -0.75, y: 0.25 },
      { x: -0.2, y: 0.25 }
    ]
  },
  {
    id: 'circle',
    name: '⭕ 圓形',
    description: '經典的圓形島嶼',
    icon: '⭕',
    points: Array.from({ length: 32 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2
      return {
        x: Math.cos(angle) * 0.7,
        y: Math.sin(angle) * 0.7
      }
    })
  },
  {
    id: 'paw',
    name: '🐾 貓掌',
    description: '可愛的貓咪肉球',
    icon: '🐾',
    points: [
      // 中央掌心 (心形)
      { x: 0, y: 0.2 },
      { x: -0.3, y: 0.3 },
      { x: -0.4, y: 0.1 },
      { x: -0.3, y: -0.2 },
      { x: 0, y: -0.4 },
      { x: 0.3, y: -0.2 },
      { x: 0.4, y: 0.1 },
      { x: 0.3, y: 0.3 },
      // 左上腳趾
      { x: 0.1, y: 0.5 },
      { x: -0.2, y: 0.7 },
      { x: -0.4, y: 0.6 },
      { x: -0.5, y: 0.4 },
      { x: -0.4, y: 0.3 },
      // 右上腳趾
      { x: -0.3, y: 0.5 },
      { x: -0.1, y: 0.8 },
      { x: 0.1, y: 0.8 },
      { x: 0.3, y: 0.5 },
      // 右腳趾
      { x: 0.4, y: 0.4 },
      { x: 0.5, y: 0.4 },
      { x: 0.6, y: 0.6 },
      { x: 0.4, y: 0.7 },
      { x: 0.2, y: 0.5 }
    ]
  },
  {
    id: 'crescent',
    name: '🌙 月牙',
    description: '神秘的月牙島嶼',
    icon: '🌙',
    points: Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 1.5 - Math.PI * 0.25
      const radius = 0.7
      const innerRadius = 0.5
      if (i < 12) {
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        }
      } else {
        const innerAngle = ((23 - i) / 24) * Math.PI * 1.5 - Math.PI * 0.25
        return {
          x: Math.cos(innerAngle) * innerRadius + 0.15,
          y: Math.sin(innerAngle) * innerRadius
        }
      }
    })
  },
  {
    id: 'butterfly',
    name: '🦋 蝴蝶',
    description: '優雅的蝴蝶形島嶼',
    icon: '🦋',
    points: [
      // 左翅上半
      { x: 0, y: 0 },
      { x: -0.3, y: 0.3 },
      { x: -0.6, y: 0.5 },
      { x: -0.7, y: 0.3 },
      { x: -0.6, y: 0.1 },
      // 左翅下半
      { x: -0.7, y: -0.1 },
      { x: -0.6, y: -0.4 },
      { x: -0.3, y: -0.3 },
      { x: 0, y: -0.1 },
      // 右翅下半
      { x: 0.3, y: -0.3 },
      { x: 0.6, y: -0.4 },
      { x: 0.7, y: -0.1 },
      // 右翅上半
      { x: 0.6, y: 0.1 },
      { x: 0.7, y: 0.3 },
      { x: 0.6, y: 0.5 },
      { x: 0.3, y: 0.3 }
    ]
  },
  {
    id: 'flower',
    name: '🌸 花朵',
    description: '美麗的花朵島嶼',
    icon: '🌸',
    points: Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2
      const petalCount = 6
      const petalAngle = angle * petalCount
      const radius = 0.5 + Math.cos(petalAngle) * 0.3
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      }
    })
  },
  {
    id: 'leaf',
    name: '🍃 葉子',
    description: '自然的葉子形狀',
    icon: '🍃',
    points: [
      { x: 0, y: 0.8 },
      { x: 0.2, y: 0.6 },
      { x: 0.4, y: 0.3 },
      { x: 0.5, y: 0 },
      { x: 0.4, y: -0.3 },
      { x: 0.2, y: -0.6 },
      { x: 0, y: -0.8 },
      { x: -0.2, y: -0.6 },
      { x: -0.4, y: -0.3 },
      { x: -0.5, y: 0 },
      { x: -0.4, y: 0.3 },
      { x: -0.2, y: 0.6 }
    ]
  }
]
