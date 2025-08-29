import { useMemo } from 'react'
import * as THREE from 'three'

// === Chibi 角色材質系統 ===

// === 色票定義 ===
export const CHIBI_COLORS = {
  skin: '#FFE7D6',
  eyeWhite: '#FFF9F2',
  eyePupil: '#3E3A39',
  blush: '#F7B1B1',
  outline: '#3E3A39',
  
  // 玩家配色
  playerTop: '#87CEEB',
  playerBottom: '#4682B4',
  playerHair: '#D4AF37',
  
  // NPC配色
  npcTopA: '#F7B1B1',
  npcTopB: '#A7D48B',
  npcTopC: '#D8B58A',
  npcHairA: '#8B4513',
  npcHairB: '#D4AF37',
  npcHairC: '#FFE5CC'
}

// === Toon 五階漸層 ===
const TOON_LEVELS = [1.00, 0.82, 0.62, 0.42, 0.22]

// === 創建 Toon 漸層貼圖 ===
export const createToonGradient = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 5
  canvas.height = 1
  const ctx = canvas.getContext('2d')!
  
  TOON_LEVELS.forEach((level, i) => {
    const gray = Math.floor(level * 255)
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`
    ctx.fillRect(i, 0, 1, 1)
  })
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  return texture
}

// === Toon 材質創建器 ===
export const createToonMaterial = (baseColor: string, map?: THREE.Texture) => {
  const gradientMap = createToonGradient()
  return new THREE.MeshToonMaterial({
    color: baseColor,
    map,
    gradientMap
  })
}

// === 程序化臉部貼圖 ===
export const createChibiFaceTexture = (
  eyeStyle: 'round' | 'almond' | 'droopy' = 'round',
  blushIntensity: number = 0.6,
  isBlinking: boolean = false
) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  
  // 基底膚色
  ctx.fillStyle = CHIBI_COLORS.skin
  ctx.fillRect(0, 0, 512, 512)
  
  // 繪製眼睛
  const drawEye = (centerX: number, centerY: number) => {
    if (isBlinking) {
      // 眨眼時畫一條線
      ctx.strokeStyle = CHIBI_COLORS.eyePupil
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(centerX - 40, centerY)
      ctx.lineTo(centerX + 40, centerY)
      ctx.stroke()
      return
    }
    
    // 眼白
    ctx.fillStyle = CHIBI_COLORS.eyeWhite
    ctx.beginPath()
    if (eyeStyle === 'round') {
      ctx.ellipse(centerX, centerY, 45, 38, 0, 0, Math.PI * 2)
    } else if (eyeStyle === 'almond') {
      ctx.ellipse(centerX, centerY, 50, 35, 0, 0, Math.PI * 2)
    } else { // droopy
      ctx.ellipse(centerX, centerY + 5, 48, 33, 0, 0, Math.PI * 2)
    }
    ctx.fill()
    
    // 上眼線（厚）
    ctx.strokeStyle = CHIBI_COLORS.eyePupil
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(centerX, centerY - 10, 42, 0.2, Math.PI - 0.2)
    ctx.stroke()
    
    // 瞳孔
    ctx.fillStyle = CHIBI_COLORS.eyePupil
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, 25, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 大高光點
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.ellipse(centerX - 8, centerY - 12, 8, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 小高光點
    ctx.beginPath()
    ctx.ellipse(centerX + 10, centerY - 8, 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 雙眼
  drawEye(165, 210) // 左眼
  drawEye(347, 210) // 右眼
  
  // 鼻子（小圓點）
  ctx.fillStyle = new THREE.Color(CHIBI_COLORS.skin).multiplyScalar(0.9).getStyle()
  ctx.beginPath()
  ctx.arc(256, 275, 3, 0, Math.PI * 2)
  ctx.fill()
  
  // 嘴巴（微笑弧線）
  ctx.strokeStyle = CHIBI_COLORS.eyePupil
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(256, 315, 20, 0.3, Math.PI - 0.3)
  ctx.stroke()
  
  // 腮紅
  if (blushIntensity > 0) {
    ctx.fillStyle = CHIBI_COLORS.blush
    ctx.globalAlpha = blushIntensity * 0.6
    
    // 左腮紅
    ctx.beginPath()
    ctx.ellipse(120, 275, 25, 20, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 右腮紅
    ctx.beginPath()
    ctx.ellipse(392, 275, 25, 20, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.globalAlpha = 1
  }
  
  return new THREE.CanvasTexture(canvas)
}

// === 程序化髮型貼圖 ===
export const createChibiHairTexture = (hairColor: string, style: 'short' | 'wavy' | 'bob' = 'short') => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  
  const baseColor = new THREE.Color(hairColor)
  const darkColor = baseColor.clone().multiplyScalar(0.75)
  const lightColor = baseColor.clone().multiplyScalar(1.25)
  
  // 基底髮色
  ctx.fillStyle = baseColor.getStyle()
  ctx.fillRect(0, 0, 256, 256)
  
  // 髮絲紋理
  if (style === 'short') {
    // 直短髮
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = darkColor.getStyle()
      ctx.fillRect(i * 21, 0, 3, 256)
      ctx.fillStyle = lightColor.getStyle()
      ctx.fillRect(i * 21 + 10, 0, 2, 256)
    }
  } else if (style === 'wavy') {
    // 波浪髮
    ctx.lineWidth = 4
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = darkColor.getStyle()
      ctx.beginPath()
      ctx.moveTo(i * 32, 0)
      for (let y = 0; y < 256; y += 20) {
        ctx.lineTo(i * 32 + Math.sin(y / 20) * 8, y)
      }
      ctx.stroke()
    }
  } else { // bob
    // 波波頭
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = darkColor.getStyle()
      ctx.fillRect(i * 25, 0, 4, 256)
      ctx.fillStyle = lightColor.getStyle()
      ctx.fillRect(i * 25 + 12, 0, 2, 256)
    }
  }
  
  return new THREE.CanvasTexture(canvas)
}

// === 程序化服裝貼圖 ===
export const createChibiClothingTexture = (baseColor: string, pattern: 'solid' | 'stripes' | 'dots' = 'solid') => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  
  const color = new THREE.Color(baseColor)
  ctx.fillStyle = color.getStyle()
  ctx.fillRect(0, 0, 256, 256)
  
  if (pattern === 'stripes') {
    ctx.fillStyle = color.clone().multiplyScalar(0.9).getStyle()
    for (let y = 0; y < 256; y += 20) {
      ctx.fillRect(0, y, 256, 6)
    }
  } else if (pattern === 'dots') {
    ctx.fillStyle = color.clone().multiplyScalar(0.92).getStyle()
    for (let x = 25; x < 256; x += 50) {
      for (let y = 25; y < 256; y += 50) {
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  
  return new THREE.CanvasTexture(canvas)
}

// === Chibi 幾何體創建器 ===
export const createChibiGeometries = () => {
  // Chibi 比例：頭大、身小、四肢短
  const headGeometry = new THREE.SphereGeometry(0.35, 16, 12) // 頭部更大
  headGeometry.scale(1, 0.95, 1) // 稍微壓扁
  
  const bodyGeometry = new THREE.CapsuleGeometry(0.25, 0.4, 8, 16) // 身體較小
  const limbGeometry = new THREE.CapsuleGeometry(0.08, 0.25, 6, 12) // 四肢短粗
  const handGeometry = new THREE.SphereGeometry(0.07, 8, 8) // 手套式小手
  const footGeometry = new THREE.CapsuleGeometry(0.08, 0.15, 6, 8) // 圓頭厚底鞋
  
  return {
    head: headGeometry,
    body: bodyGeometry,
    limb: limbGeometry,
    hand: handGeometry,
    foot: footGeometry
  }
}

// === Hook：Chibi 材質系統 ===
export const useChibiMaterials = (
  characterType: 'player' | 'npcA' | 'npcB' | 'npcC',
  isBlinking: boolean = false
) => {
  return useMemo(() => {
    let topColor, hairColor, eyeStyle: 'round' | 'almond' | 'droopy', hairStyle: 'short' | 'wavy' | 'bob'
    
    switch (characterType) {
      case 'player':
        topColor = CHIBI_COLORS.playerTop
        hairColor = CHIBI_COLORS.playerHair
        eyeStyle = 'round'
        hairStyle = 'short'
        break
      case 'npcA':
        topColor = CHIBI_COLORS.npcTopA
        hairColor = CHIBI_COLORS.npcHairA
        eyeStyle = 'almond'
        hairStyle = 'wavy'
        break
      case 'npcB':
        topColor = CHIBI_COLORS.npcTopB
        hairColor = CHIBI_COLORS.npcHairB
        eyeStyle = 'round'
        hairStyle = 'short'
        break
      case 'npcC':
        topColor = CHIBI_COLORS.npcTopC
        hairColor = CHIBI_COLORS.npcHairC
        eyeStyle = 'droopy'
        hairStyle = 'bob'
        break
      default:
        topColor = CHIBI_COLORS.playerTop
        hairColor = CHIBI_COLORS.playerHair
        eyeStyle = 'round'
        hairStyle = 'short'
    }
    
    const faceTexture = createChibiFaceTexture(eyeStyle, 0.6, isBlinking)
    const hairTexture = createChibiHairTexture(hairColor, hairStyle)
    const topTexture = createChibiClothingTexture(topColor, 'stripes')
    const bottomTexture = createChibiClothingTexture(CHIBI_COLORS.playerBottom, 'solid')
    
    return {
      skin: createToonMaterial(CHIBI_COLORS.skin, faceTexture),
      hair: createToonMaterial(hairColor, hairTexture),
      top: createToonMaterial(topColor, topTexture),
      bottom: createToonMaterial(CHIBI_COLORS.playerBottom, bottomTexture),
      shoe: createToonMaterial('#8B4513')
    }
  }, [characterType, isBlinking])
}