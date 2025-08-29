import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'

// 動物森友會風格材質系統
export const useAnimalCrossingMaterials = () => {
  // 載入所有貼圖
  const textures = useTexture({
    grass: './textures/grass.png',
    dirt: './textures/dirt.png', 
    wood: './textures/wood.png',
    wall: './textures/wall.png',
    roof: './textures/roof.png',
    stone: './textures/stone.png',
    toonGradient: './textures/toonGradient.png'
  })

  // 設定貼圖重複
  Object.values(textures).forEach(texture => {
    if (texture.name !== 'toonGradient') {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4, 4)
    }
  })

  // 粉彩色票
  const colors = {
    grass: '#BFE7A1',
    grassShadow: '#A7D48B', 
    grassHighlight: '#D8F1C7',
    dirt: '#C9A071',
    dirtShadow: '#9E7A52',
    dirtHighlight: '#DAB78D',
    wood: '#D8B58A',
    woodDark: '#B98C63',
    woodLight: '#E9D1B4',
    wall: '#FFF9F2',
    wallFiber: '#F0E9DF',
    roof: '#F08E8E',
    roofDark: '#D46C6C',
    roofLight: '#F7B1B1',
    stone: '#DCDDE1',
    stoneDark: '#BDC0C6',
    stoneLight: '#F1F2F6',
    outline: '#3E3A39'
  }

  const materials = useMemo(() => ({
    // 草地材質
    grass: new THREE.MeshToonMaterial({
      color: colors.grass,
      map: textures.grass,
      gradientMap: textures.toonGradient
    }),

    // 泥土小徑材質  
    dirt: new THREE.MeshToonMaterial({
      color: colors.dirt,
      map: textures.dirt,
      gradientMap: textures.toonGradient
    }),

    // 木質材質（門窗、圍籬、樹幹）
    wood: new THREE.MeshToonMaterial({
      color: colors.wood,
      map: textures.wood,
      gradientMap: textures.toonGradient,
      roughness: 0.85,
      metalness: 0.1
    }),

    // 牆面材質
    wall: new THREE.MeshToonMaterial({
      color: colors.wall,
      map: textures.wall,
      gradientMap: textures.toonGradient,
      roughness: 0.9,
      metalness: 0.05
    }),

    // 屋頂材質
    roof: new THREE.MeshToonMaterial({
      color: colors.roof,
      map: textures.roof,
      gradientMap: textures.toonGradient,
      roughness: 0.8,
      metalness: 0.15
    }),

    // 石材材質  
    stone: new THREE.MeshToonMaterial({
      color: colors.stone,
      map: textures.stone,
      gradientMap: textures.toonGradient,
      roughness: 0.9,
      metalness: 0.1
    }),

    // 人物服裝材質（粉彩純色）
    playerClothes: new THREE.MeshToonMaterial({
      color: colors.roofLight, // 粉色系
      gradientMap: textures.toonGradient,
      roughness: 0.9,
      metalness: 0.0
    }),

    // 人物皮膚材質
    playerSkin: new THREE.MeshToonMaterial({
      color: '#FDBCB4', // 溫暖膚色
      gradientMap: textures.toonGradient,
      roughness: 0.95,
      metalness: 0.0
    }),

    // 樹葉材質
    leaves: new THREE.MeshToonMaterial({
      color: colors.grassHighlight,
      gradientMap: textures.toonGradient,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    }),

    // 花朵材質
    flower: new THREE.MeshToonMaterial({
      color: '#FFB6C1', // 粉色花朵
      gradientMap: textures.toonGradient,
      roughness: 0.85,
      metalness: 0.0
    }),

    // 水面材質
    water: new THREE.MeshToonMaterial({
      color: '#87CEEB',
      gradientMap: textures.toonGradient,
      transparent: true,
      opacity: 0.8,
      roughness: 0.3,
      metalness: 0.6
    })
  }), [textures, colors])

  return { materials, colors, textures }
}

// 描邊材質 - 背面外擴版本
export const createOutlineMaterial = (originalMaterial: THREE.Material, outlineWidth = 0.02) => {
  return new THREE.MeshBasicMaterial({
    color: '#3E3A39',
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.8
  })
}

// 圓角化幾何體工具
export const createRoundedBoxGeometry = (width: number, height: number, depth: number, radius = 0.1) => {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  // 這裡可以加入圓角處理邏輯，或使用 drei 的 RoundedBox
  return geometry
}