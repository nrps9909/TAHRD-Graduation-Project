/**
 * 🔊 useSound Hook - 音效系统 React Hook
 * 提供便捷的音效控制接口
 */

import { useCallback, useState, useEffect } from 'react'
import {
  BGM,
  SFX,
  setMasterVolume,
  toggleMute,
  playClickSound,
  playHoverSound,
  playMeowSound,
  playPurrSound,
  playFlowerSound,
  playSoftSound,
  initAudio,
} from '../utils/soundManager'

export const useSound = () => {
  const [bgmPlaying, setBgmPlaying] = useState(false)
  const [masterVolume, setMasterVolumeState] = useState(1)
  const [sfxEnabled, setSfxEnabled] = useState(true)

  // 初始化音频（在用户首次交互后）
  const init = useCallback(() => {
    initAudio()
    setBgmPlaying(true)
  }, [])

  // 播放背景音乐
  const playBGM = useCallback((track?: string) => {
    BGM.play(track)
    setBgmPlaying(true)
  }, [])

  // 停止背景音乐
  const stopBGM = useCallback(() => {
    BGM.stop()
    setBgmPlaying(false)
  }, [])

  // 调整背景音乐音量
  const setBGMVolume = useCallback((volume: number) => {
    BGM.setVolume(volume)
  }, [])

  // 调整主音量
  const setVolume = useCallback((volume: number) => {
    setMasterVolume(volume)
    setMasterVolumeState(volume)
  }, [])

  // 切换静音
  const mute = useCallback(() => {
    return toggleMute()
  }, [])

  // 启用/禁用音效
  const toggleSFX = useCallback(() => {
    const newState = !sfxEnabled
    SFX.setEnabled(newState)
    setSfxEnabled(newState)
  }, [sfxEnabled])

  // 便捷的音效播放函数
  const sounds = {
    click: playClickSound,
    hover: playHoverSound,
    meow: playMeowSound,
    purr: playPurrSound,
    flower: playFlowerSound,
    soft: playSoftSound,
  }

  // Live2DCat 需要的播放函数
  const play = useCallback((soundName: string) => {
    // 映射音效名称到实际的播放函数
    const soundMap: Record<string, () => void> = {
      'button_click': playClickSound,
      'notification': playSoftSound,
      'meow_greeting': playMeowSound,
      'meow_curious': playPurrSound,
      'meow_happy': playMeowSound,
      'meow_sad': playPurrSound,
      'typing': playClickSound,
    }

    const soundFunc = soundMap[soundName]
    if (soundFunc) {
      soundFunc()
    }
  }, [])

  const playRandomMeow = useCallback(() => {
    playMeowSound()
  }, [])

  const playTypingSequence = useCallback(() => {
    playClickSound()
  }, [])

  return {
    // 背景音乐控制
    bgm: {
      play: playBGM,
      stop: stopBGM,
      setVolume: setBGMVolume,
      isPlaying: bgmPlaying,
    },

    // 音效控制
    sfx: {
      enabled: sfxEnabled,
      toggle: toggleSFX,
      ...sounds,
    },

    // 全局控制
    init,
    setVolume,
    mute,
    masterVolume,

    // Live2DCat 需要的方法
    play,
    playRandomMeow,
    playTypingSequence,
    enabled: sfxEnabled,
    toggleSound: toggleSFX,
  }
}
