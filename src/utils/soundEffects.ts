// 音效管理工具
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private enabled: boolean = true

  constructor() {
    // 從 localStorage 讀取音效設定
    const stored = localStorage.getItem('soundEnabled')
    this.enabled = stored !== 'false'
  }

  // 預載音效
  preload(name: string, url: string) {
    const audio = new Audio(url)
    audio.preload = 'auto'
    this.sounds.set(name, audio)
  }

  // 播放音效
  play(name: string, volume: number = 0.5) {
    if (!this.enabled) return

    const sound = this.sounds.get(name)
    if (sound) {
      sound.volume = volume
      sound.currentTime = 0
      sound.play().catch(e => {
        // 忽略自動播放錯誤
        console.warn('Sound play failed:', e)
      })
    }
  }

  // 播放按鈕點擊音效
  playClick() {
    this.createAndPlay(440, 0.1, 'sine', 0.3)
  }

  // 播放成功音效
  playSuccess() {
    this.createAndPlay(523, 0.2, 'sine', 0.4)
    setTimeout(() => {
      this.createAndPlay(659, 0.2, 'sine', 0.4)
    }, 100)
    setTimeout(() => {
      this.createAndPlay(784, 0.3, 'sine', 0.4)
    }, 200)
  }

  // 播放錯誤音效
  playError() {
    this.createAndPlay(200, 0.2, 'sawtooth', 0.3)
  }

  // 播放打字音效
  playTyping() {
    this.createAndPlay(800, 0.05, 'square', 0.1)
  }

  // 使用 Web Audio API 創建簡單音效
  private createAndPlay(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.5
  ) {
    if (!this.enabled) return

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration
      )

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (e) {
      // 忽略音頻 API 錯誤
      console.warn('Audio creation failed:', e)
    }
  }

  // 切換音效開關
  toggle() {
    this.enabled = !this.enabled
    localStorage.setItem('soundEnabled', String(this.enabled))
    return this.enabled
  }

  // 獲取當前狀態
  isEnabled() {
    return this.enabled
  }
}

// 單例模式
export const soundManager = new SoundManager()

// 音效 Hook
import { useCallback } from 'react'

export const useSoundEffects = () => {
  const playClick = useCallback(() => soundManager.playClick(), [])
  const playSuccess = useCallback(() => soundManager.playSuccess(), [])
  const playError = useCallback(() => soundManager.playError(), [])
  const playTyping = useCallback(() => soundManager.playTyping(), [])
  const toggleSound = useCallback(() => soundManager.toggle(), [])
  const isSoundEnabled = useCallback(() => soundManager.isEnabled(), [])

  return {
    playClick,
    playSuccess,
    playError,
    playTyping,
    toggleSound,
    isSoundEnabled,
  }
}
