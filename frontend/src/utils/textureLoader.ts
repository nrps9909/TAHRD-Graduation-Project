/**
 * 紋理加載工具
 * 用於加載和管理島嶼紋理材質
 */

import * as THREE from 'three'
import { getTextureConfig } from '../constants/textures'

/**
 * 加載的紋理集合
 */
export interface LoadedTextures {
  diffuse?: THREE.Texture
  normal?: THREE.Texture
  roughness?: THREE.Texture
  ao?: THREE.Texture
}

/**
 * 紋理加載器單例
 */
class TextureLoaderManager {
  private loader: THREE.TextureLoader
  private cache: Map<string, LoadedTextures>

  constructor() {
    this.loader = new THREE.TextureLoader()
    this.cache = new Map()
  }

  /**
   * 加載紋理集
   * @param textureId 紋理 ID
   * @returns Promise<LoadedTextures>
   */
  async loadTexture(textureId: string): Promise<LoadedTextures> {
    // 檢查緩存
    if (this.cache.has(textureId)) {
      return this.cache.get(textureId)!
    }

    const config = getTextureConfig(textureId)
    if (!config || !config.paths) {
      return {}
    }

    const textures: LoadedTextures = {}

    // 加載所有可用的紋理
    const loadPromises: Promise<void>[] = []

    if (config.paths.diffuse) {
      loadPromises.push(
        this.loadSingleTexture(config.paths.diffuse)
          .then(texture => {
            textures.diffuse = texture
          })
          .catch(() => {
            // 加載失敗時靜默處理
            console.warn(`Failed to load diffuse texture for ${textureId}`)
          })
      )
    }

    if (config.paths.normal) {
      loadPromises.push(
        this.loadSingleTexture(config.paths.normal)
          .then(texture => {
            textures.normal = texture
          })
          .catch(() => {
            console.warn(`Failed to load normal texture for ${textureId}`)
          })
      )
    }

    if (config.paths.roughness) {
      loadPromises.push(
        this.loadSingleTexture(config.paths.roughness)
          .then(texture => {
            textures.roughness = texture
          })
          .catch(() => {
            console.warn(`Failed to load roughness texture for ${textureId}`)
          })
      )
    }

    if (config.paths.ao) {
      loadPromises.push(
        this.loadSingleTexture(config.paths.ao)
          .then(texture => {
            textures.ao = texture
          })
          .catch(() => {
            console.warn(`Failed to load AO texture for ${textureId}`)
          })
      )
    }

    // 等待所有紋理加載完成
    await Promise.allSettled(loadPromises)

    // 配置紋理屬性
    Object.values(textures).forEach(texture => {
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(2, 2) // 重複紋理以增加細節
      }
    })

    // 緩存
    this.cache.set(textureId, textures)

    return textures
  }

  /**
   * 加載單個紋理
   */
  private loadSingleTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      )
    })
  }

  /**
   * 清除緩存
   */
  clearCache() {
    // 釋放紋理資源
    this.cache.forEach(textures => {
      Object.values(textures).forEach(texture => {
        if (texture) {
          texture.dispose()
        }
      })
    })
    this.cache.clear()
  }

  /**
   * 預加載所有紋理
   */
  async preloadAll() {
    const configs = [
      'grass', 'sand', 'stone', 'snow',
      'dirt', 'forest', 'desert', 'lava'
    ]

    await Promise.allSettled(
      configs.map(id => this.loadTexture(id))
    )
  }
}

// 導出單例實例
export const textureLoader = new TextureLoaderManager()

/**
 * 創建帶紋理的材質
 * @param textureId 紋理 ID
 * @param color 備用顏色
 * @returns THREE.MeshStandardMaterial
 */
export async function createTexturedMaterial(
  textureId: string,
  color: string
): Promise<THREE.MeshStandardMaterial> {
  const config = getTextureConfig(textureId)
  if (!config) {
    return new THREE.MeshStandardMaterial({ color })
  }

  const textures = await textureLoader.loadTexture(textureId)

  const material = new THREE.MeshStandardMaterial({
    color: textures.diffuse ? '#ffffff' : color,
    map: textures.diffuse,
    normalMap: textures.normal,
    roughnessMap: textures.roughness,
    aoMap: textures.ao,
    roughness: config.roughness,
    metalness: config.metalness,
  })

  return material
}

/**
 * 應用紋理到現有材質
 * @param material 材質
 * @param textureId 紋理 ID
 * @param color 備用顏色
 */
export async function applyTexture(
  material: THREE.MeshStandardMaterial,
  textureId: string,
  color: string
): Promise<void> {
  const config = getTextureConfig(textureId)
  if (!config) {
    material.color = new THREE.Color(color)
    material.map = null
    material.normalMap = null
    material.roughnessMap = null
    material.aoMap = null
    material.needsUpdate = true
    return
  }

  const textures = await textureLoader.loadTexture(textureId)

  material.color = new THREE.Color(textures.diffuse ? '#ffffff' : color)
  material.map = textures.diffuse || null
  material.normalMap = textures.normal || null
  material.roughnessMap = textures.roughness || null
  material.aoMap = textures.ao || null
  material.roughness = config.roughness
  material.metalness = config.metalness
  material.needsUpdate = true
}
