// 聲音管理器 - 管理背景音樂和音效
export class SoundManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()
  private backgroundMusic: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private enabled = true

  constructor() {
    // 初始化 Audio Context
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = 0.3 // 默認音量
    }
  }

  // 預載聲音資源
  async loadSound(name: string, url: string) {
    if (!this.audioContext) return

    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.sounds.set(name, audioBuffer)
    } catch (error) {
      console.error(`Failed to load sound: ${name}`, error)
    }
  }

  // 播放音效
  playSound(name: string, volume = 1) {
    if (!this.enabled || !this.audioContext || !this.gainNode) return

    const buffer = this.sounds.get(name)
    if (!buffer) return

    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    
    source.buffer = buffer
    gainNode.gain.value = volume
    
    source.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    source.start(0)
  }

  // 播放背景音樂
  playBackgroundMusic(name: string, loop = true) {
    if (!this.enabled || !this.audioContext || !this.gainNode) return

    // 停止當前音樂
    this.stopBackgroundMusic()

    const buffer = this.sounds.get(name)
    if (!buffer) return

    this.backgroundMusic = this.audioContext.createBufferSource()
    this.backgroundMusic.buffer = buffer
    this.backgroundMusic.loop = loop
    this.backgroundMusic.connect(this.gainNode)
    this.backgroundMusic.start(0)
  }

  // 停止背景音樂
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
      this.backgroundMusic = null
    }
  }

  // 設置音量
  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  // 切換靜音
  toggleMute() {
    this.enabled = !this.enabled
    if (this.gainNode) {
      this.gainNode.gain.value = this.enabled ? 0.3 : 0
    }
  }

  // 根據時間播放不同的背景音樂
  setTimeBasedMusic(hour: number) {
    let musicName = 'day'
    
    if (hour >= 6 && hour < 12) {
      musicName = 'morning'
    } else if (hour >= 12 && hour < 18) {
      musicName = 'afternoon'
    } else if (hour >= 18 && hour < 22) {
      musicName = 'evening'
    } else {
      musicName = 'night'
    }

    // 如果音樂已載入，播放對應的背景音樂
    if (this.sounds.has(musicName)) {
      this.playBackgroundMusic(musicName)
    }
  }

  // 播放腳步聲
  playFootstep() {
    const stepSounds = ['footstep1', 'footstep2', 'footstep3']
    const randomStep = stepSounds[Math.floor(Math.random() * stepSounds.length)]
    this.playSound(randomStep, 0.2)
  }

  // 播放環境音效
  playAmbientSound(weather: string) {
    switch (weather) {
      case 'rainy':
        this.playSound('rain', 0.4)
        break
      case 'windy':
        this.playSound('wind', 0.3)
        break
      default:
        this.playSound('birds', 0.2)
    }
  }
}

// 創建全局實例
export const soundManager = new SoundManager()

// 初始化聲音（在實際專案中，這些URL應該指向真實的音頻文件）
export const initializeSounds = async () => {
  // 背景音樂
  // await soundManager.loadSound('morning', '/sounds/morning-bgm.mp3')
  // await soundManager.loadSound('afternoon', '/sounds/afternoon-bgm.mp3')
  // await soundManager.loadSound('evening', '/sounds/evening-bgm.mp3')
  // await soundManager.loadSound('night', '/sounds/night-bgm.mp3')
  
  // 音效
  // await soundManager.loadSound('footstep1', '/sounds/footstep1.mp3')
  // await soundManager.loadSound('footstep2', '/sounds/footstep2.mp3')
  // await soundManager.loadSound('footstep3', '/sounds/footstep3.mp3')
  // await soundManager.loadSound('rain', '/sounds/rain.mp3')
  // await soundManager.loadSound('wind', '/sounds/wind.mp3')
  // await soundManager.loadSound('birds', '/sounds/birds.mp3')
  
  console.log('Sound system initialized (sounds need to be added)')
}