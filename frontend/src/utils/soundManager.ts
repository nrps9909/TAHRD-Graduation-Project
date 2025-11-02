/**
 * 🔊 音效管理系统
 * 使用 Howler.js 管理所有游戏音效和背景音乐
 */

import { Howl, Howler } from 'howler'

// 音效类型定义
type SoundName = 'click' | 'hover' | 'meow' | 'purr' | 'flower' | 'soft'

// 音效配置
const SOUND_CONFIG = {
  // 点击音效
  click: {
    src: ['/sounds/click.mp3', '/sounds/click.wav'],
    volume: 0.5,
  },
  // 悬停音效
  hover: {
    src: ['/sounds/hover.mp3', '/sounds/hover.wav'],
    volume: 0.3,
  },
  // 猫叫声
  meow: {
    src: ['/sounds/meow.mp3', '/sounds/meow.wav'],
    volume: 0.6,
  },
  // 猫咪咕噜声
  purr: {
    src: ['/sounds/purr.mp3', '/sounds/purr.wav'],
    volume: 0.4,
  },
  // 花朵绽放
  flower: {
    src: ['/sounds/flower.mp3', '/sounds/flower.wav'],
    volume: 0.4,
  },
  // 柔和提示音
  soft: {
    src: ['/sounds/soft.mp3', '/sounds/soft.wav'],
    volume: 0.35,
  },
}

// 背景音乐
class BackgroundMusic {
  private bgm: Howl | null = null
  private currentTrack: string = ''
  public initialized: boolean = false

  // 播放背景音乐
  play(track: string = 'peaceful-town') {
    if (!this.initialized) {
      console.warn('🔇 背景音乐系统未初始化，跳过播放')
      return
    }

    if (this.currentTrack === track && this.bgm?.playing()) {
      return
    }

    this.stop()

    this.bgm = new Howl({
      src: [`/sounds/bgm/${track}.mp3`],
      loop: true,
      volume: 0.3,
      html5: true, // 使用 HTML5 Audio 以支持流式加载
      onloaderror: () => {
        console.log(`🎵 背景音乐 ${track} 未找到，使用静音模式`)
      },
      onload: () => {
        console.log(`🎵 背景音乐 ${track} 加载成功`)
      }
    })

    this.bgm.play()
    this.currentTrack = track
  }

  // 停止背景音乐
  stop() {
    if (this.bgm) {
      this.bgm.stop()
      this.bgm.unload()
      this.bgm = null
      this.currentTrack = ''
    }
  }

  // 调整音量
  setVolume(volume: number) {
    if (this.bgm) {
      this.bgm.volume(Math.max(0, Math.min(1, volume)))
    }
  }

  // 淡入
  fadeIn(duration: number = 1000) {
    if (this.bgm) {
      this.bgm.fade(0, 0.3, duration)
    }
  }

  // 淡出
  fadeOut(duration: number = 1000) {
    if (this.bgm) {
      this.bgm.fade(0.3, 0, duration)
    }
  }
}

// 音效管理器
class SoundEffectManager {
  private sounds: Map<SoundName, Howl> = new Map()
  private enabled: boolean = true
  private initialized: boolean = false

  constructor() {
    // 不在构造函数中初始化，等待用户交互
  }

  // 初始化音效（在用户交互后调用）
  init() {
    if (this.initialized) return
    this.initialized = true
    this.preloadSounds()
  }

  // 预加载所有音效
  private preloadSounds() {
    Object.entries(SOUND_CONFIG).forEach(([name, config]) => {
      const sound = new Howl({
        ...config,
        preload: false, // 不自动预加载，避免阻塞
        onloaderror: () => {
          // 音效文件不存在时静默失败
          console.log(`🔇 音效 ${name} 未找到`)
        },
      })
      this.sounds.set(name as SoundName, sound)
    })
  }

  // 播放音效
  play(name: SoundName) {
    if (!this.enabled) return
    if (!this.initialized) {
      console.warn('🔇 音效系统未初始化，请先调用 SFX.init()')
      return
    }

    const sound = this.sounds.get(name)
    if (sound) {
      // 如果正在播放，重新开始
      if (sound.playing()) {
        sound.stop()
      }
      sound.play()
    }
  }

  // 启用/禁用音效
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  // 调整所有音效音量
  setVolume(volume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach((sound) => {
      sound.volume(normalizedVolume)
    })
  }
}

// 导出单例
export const BGM = new BackgroundMusic()
export const SFX = new SoundEffectManager()

// 全局音量控制
export const setMasterVolume = (volume: number) => {
  Howler.volume(Math.max(0, Math.min(1, volume)))
}

// 全局静音切换
let isMuted = false
export const toggleMute = () => {
  isMuted = !isMuted
  Howler.mute(isMuted)
  return isMuted
}

// 便捷函数
export const playClickSound = () => SFX.play('click')
export const playHoverSound = () => SFX.play('hover')
export const playMeowSound = () => SFX.play('meow')
export const playPurrSound = () => SFX.play('purr')
export const playFlowerSound = () => SFX.play('flower')
export const playSoftSound = () => SFX.play('soft')

// 初始化音乐（在用户交互后调用）
export const initAudio = () => {
  // 标记为已初始化
  BGM.initialized = true
  SFX.init()

  // 尝试播放背景音乐（如果文件存在）
  BGM.play('peaceful-town')
  BGM.fadeIn(2000)

  console.log('🔊 音频系统已初始化')
}
