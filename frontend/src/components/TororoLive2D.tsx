import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  Suspense
} from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// Register PIXI globally for Live2D
;(window as any).PIXI = PIXI

interface TororoLive2DProps {
  modelPath?: string
  width?: number
  height?: number
  scale?: number
  className?: string
}

export interface TororoLive2DRef {
  triggerMotion: (motion?: string) => void
  triggerExpression: (expression?: string) => void
}

const TororoLive2D = forwardRef<TororoLive2DRef, TororoLive2DProps>(
  (
    {
      modelPath = '/models/tororo_white/tororo.model3.json',
      width = 400,
      height = 400,
      scale = 0.2,
      className = ''
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const modelRef = useRef<Live2DModel | null>(null)
    const [showFallback, setShowFallback] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // 暴露給父組件的方法
    useImperativeHandle(ref, () => ({
      triggerMotion: (motion?: string) => {
        if (!modelRef.current) return
        try {
          const internalModel = (modelRef.current as any).internalModel
          if (internalModel && internalModel.motionManager) {
            const motionGroup = motion || 'idle'
            internalModel.motionManager.startRandomMotion(motionGroup)
          }
        } catch (e) {
          console.warn('Motion trigger failed:', e)
        }
      },
      triggerExpression: (expression?: string) => {
        if (!modelRef.current) return
        try {
          const internalModel = (modelRef.current as any).internalModel
          if (internalModel && internalModel.expression) {
            const exp = expression || 'f01'
            internalModel.expression(exp)
          }
        } catch (e) {
          console.warn('Expression trigger failed:', e)
        }
      }
    }))

    // 初始化 PIXI Application 和 Live2D Model
    useEffect(() => {
      if (!containerRef.current) return

      let isMounted = true

      const initLive2D = async () => {
        try {
          // 創建 PIXI Application
          const app = new PIXI.Application({
            width,
            height,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
          })

          if (!isMounted) {
            app.destroy(true)
            return
          }

          containerRef.current?.appendChild(app.view as any)
          appRef.current = app

          // 載入 Live2D 模型
          const model = await Live2DModel.from(modelPath, {
            autoInteract: true,
            autoUpdate: true
          })

          if (!isMounted) {
            model.destroy()
            app.destroy(true)
            return
          }

          modelRef.current = model

          // 設置模型縮放和位置
          model.scale.set(scale)
          model.x = width / 2
          model.y = height / 2
          model.anchor.set(0.5, 0.5)

          app.stage.addChild(model as any)

          // 添加互動效果
          model.on('hit', (hitAreas: string[]) => {
            if (hitAreas.includes('body') || hitAreas.includes('head')) {
              const internalModel = (model as any).internalModel
              if (internalModel && internalModel.motionManager) {
                internalModel.motionManager.startRandomMotion('tap_body')
              }
            }
          })

          setIsLoading(false)
          setShowFallback(false)

          // 自動播放 idle 動畫
          const internalModel = (model as any).internalModel
          if (internalModel && internalModel.motionManager) {
            internalModel.motionManager.startRandomMotion('idle')
          }

        } catch (error) {
          console.error('Failed to load Live2D model:', error)
          if (isMounted) {
            setShowFallback(true)
            setIsLoading(false)
          }
        }
      }

      initLive2D()

      // Cleanup
      return () => {
        isMounted = false
        if (modelRef.current) {
          modelRef.current.destroy()
          modelRef.current = null
        }
        if (appRef.current) {
          appRef.current.destroy(true)
          appRef.current = null
        }
      }
    }, [modelPath, width, height, scale])

    if (showFallback) {
      return (
        <div
          className={`flex items-center justify-center bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full shadow-2xl ${className}`}
          style={{ width, height }}
        >
          <div className="text-center">
            <div className="text-6xl mb-2 animate-bounce">🐱</div>
            <div className="text-sm text-gray-600 font-medium">Tororo</div>
          </div>
        </div>
      )
    }

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full shadow-2xl"
            style={{ width, height }}
          >
            <div className="text-center">
              <div className="text-pink-600 text-lg font-medium animate-pulse">
                🐱 載入中...
              </div>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out'
          }}
        />
      </div>
    )
  }
)

TororoLive2D.displayName = 'TororoLive2D'

export default TororoLive2D
