/**
 * Live2D Display Component - 僅顯示模型，不包含對話功能
 * 用於對話介面中嵌入 Live2D 模型
 */

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// Register PIXI globally for Live2D
;(window as Window & typeof globalThis & { PIXI: typeof PIXI }).PIXI = PIXI

interface Live2DDisplayProps {
  modelPath: string
  width?: number
  height?: number
  isThinking?: boolean
  isSpeaking?: boolean
}

// Type for Live2D internal model with motion manager
interface Live2DInternalModel {
  motionManager?: {
    startMotion: (group: string, index: number) => void
  }
}

interface Live2DModelWithInternal {
  internalModel?: Live2DInternalModel
  [key: string]: unknown
}

export const Live2DDisplay: React.FC<Live2DDisplayProps> = ({
  modelPath,
  width = 400,
  height = 500,
  isThinking = false,
  isSpeaking = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // 初始化 Live2D 模型
  useEffect(() => {
    if (!canvasRef.current) return

    const initLive2D = async () => {
      try {
        // 創建 PIXI Application
        const app = new PIXI.Application({
          view: document.createElement('canvas'),
          width,
          height,
          backgroundColor: 0x000000,
          backgroundAlpha: 0,
          antialias: true
        })

        canvasRef.current?.appendChild(app.view as HTMLCanvasElement)
        appRef.current = app

        // 加載 Live2D 模型
        const model = await Live2DModel.from(modelPath)

        // 設置錨點為中心
        model.anchor.set(0.5, 0.5)

        // 調整縮放和位置
        model.scale.set(0.18)
        model.x = width / 2
        model.y = height / 2

        app.stage.addChild(model as PIXI.DisplayObject)
        modelRef.current = model

        setIsLoaded(true)

        // 播放閒置動作
        playMotion('Idle')
      } catch (error) {
        console.error('[Live2D] 加載失敗:', error)
      }
    }

    initLive2D()

    // 清理函數
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true, baseTexture: true })
        appRef.current = null
      }
      modelRef.current = null
    }
  }, [modelPath, width, height])

  // 播放動作
  const playMotion = (motionName: string) => {
    const model = modelRef.current as Live2DModelWithInternal | null
    if (!model?.internalModel?.motionManager) return

    const motionMap: Record<string, { group: string; index: number }> = {
      Idle: { group: 'Idle', index: 0 },
      Tap: { group: 'TapBody', index: 0 },
      Shake: { group: 'Shake', index: 0 }
    }

    const motion = motionMap[motionName]
    if (motion) {
      model.internalModel.motionManager.startMotion(motion.group, motion.index)
    }
  }

  // 根據狀態播放動作
  useEffect(() => {
    if (!isLoaded || !modelRef.current) return

    if (isSpeaking) {
      playMotion('Tap') // 說話時播放點擊動作
    } else if (isThinking) {
      playMotion('Shake') // 思考時播放搖頭動作
    } else {
      playMotion('Idle') // 空閒時播放閒置動作
    }
  }, [isThinking, isSpeaking, isLoaded])

  return (
    <div
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative'
      }}
    />
  )
}
