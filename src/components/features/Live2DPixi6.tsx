import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// Register PIXI globally for Live2D
window.PIXI = PIXI

interface Live2DPixi6Props {
  modelPath: string
  fallbackImage?: string
  width?: number
  height?: number
  scale?: number
  triggerMotion?: boolean
  mood?: string
  onInteraction?: (action: string) => void
}

export interface Live2DRef {
  triggerAction: (action: 'speed' | 'cute' | 'beginner' | 'ai') => void
}

const Live2DPixi6 = forwardRef<Live2DRef, Live2DPixi6Props>(
  (
    {
      modelPath,
      fallbackImage = '/models/hijiki/hijiki.2048/texture_00.png',
      width = 256,
      height = 256,
      scale = 0.5,
      triggerMotion = false,
      onInteraction,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const modelRef = useRef<Live2DModel | null>(null)
    const [showFallback, setShowFallback] = useState(false)

    // 觸發特定動作的函數
    const triggerSpecificAction = (
      action: 'speed' | 'cute' | 'beginner' | 'ai'
    ) => {
      if (!modelRef.current) return

      try {
        const internalModel = (modelRef.current as any).internalModel

        if (internalModel && internalModel.motionManager) {
          let motionGroup: string
          let expressions: string[]

          switch (action) {
            case 'speed':
              // 極速上手 - 快速興奮的動作
              motionGroup = 'pinch_out' // 快速動作
              expressions = ['f02', 'f03'] // 興奮表情
              break
            case 'cute':
              // 可愛陪伴 - 溫柔親密的動作
              motionGroup = 'tap_body' // 溫柔觸摸
              expressions = ['f01', 'f04'] // 可愛表情
              break
            case 'beginner':
              // 零基礎 - 鼓勵支持的動作
              motionGroup = 'idle' // 溫和動作
              expressions = ['f01', 'f02'] // 鼓勵表情
              break
            case 'ai':
              // AI助力 - 智能思考的動作
              motionGroup = 'flick_head' // 思考動作
              expressions = ['f03', 'f04'] // 聰明表情
              break
            default:
              motionGroup = 'idle'
              expressions = ['f01']
          }

          // 嘗試觸發動作
          try {
            internalModel.motionManager.startRandomMotion(motionGroup)
          } catch (e) {
            // 如果動作失敗，嘗試備用動作
            internalModel.motionManager.startRandomMotion('idle')
          }

          // 改變表情
          try {
            const randomExp =
              expressions[Math.floor(Math.random() * expressions.length)]
            internalModel.expression(randomExp)
          } catch (e) {
            // 忽略表情錯誤
          }

          // 通知父組件
          if (onInteraction) {
            onInteraction(action)
          }
        }
      } catch (e) {
        console.log('Action trigger error:', e)
      }
    }

    // 暴露方法給父組件
    useImperativeHandle(ref, () => ({
      triggerAction: triggerSpecificAction,
    }))

    // Trigger talking animation when dialogue changes
    useEffect(() => {
      if (modelRef.current && triggerMotion) {
        try {
          // Try multiple motion groups for talking animation
          const motionGroups = [
            'tap_body',
            'idle',
            'tap',
            'flick_head',
            'pinch_in',
            'pinch_out',
            'shake',
          ]
          const internalModel = (modelRef.current as any).internalModel

          if (internalModel && internalModel.motionManager) {
            // Try to find a valid motion group
            let motionStarted = false
            for (const group of motionGroups) {
              try {
                const result =
                  internalModel.motionManager.startRandomMotion(group)
                if (result) {
                  motionStarted = true
                  console.log(`Started motion: ${group}`)
                  break
                }
              } catch (e) {
                // Try next motion group
              }
            }

            // If no predefined motion works, try to trigger expression change
            if (!motionStarted && internalModel.coreModel) {
              try {
                // Trigger mouth movement for talking effect
                const expressions = ['f01', 'f02', 'f03', 'f04']
                const randomExp =
                  expressions[Math.floor(Math.random() * expressions.length)]
                internalModel.expression(randomExp)
              } catch (e) {
                // Ignore expression errors
              }
            }
          }

          // Also try direct motion triggering through model
          if ((modelRef.current as any).motion) {
            try {
              ;(modelRef.current as any).motion('tap_body')
            } catch (e) {
              // Ignore direct motion errors
            }
          }
        } catch (e) {
          console.log('Motion trigger error:', e)
        }
      }
    }, [triggerMotion])

    useEffect(() => {
      let cleanup: (() => void) | null = null

      const init = async () => {
        if (!containerRef.current) return

        try {
          // Register PIXI ticker
          Live2DModel.registerTicker(PIXI.Ticker)

          // Create PIXI Application (v6 syntax)
          const app = new PIXI.Application({
            width,
            height,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
          })

          appRef.current = app
          containerRef.current.appendChild(app.view)

          // Load Live2D model
          try {
            const model = await Live2DModel.from(modelPath)
            modelRef.current = model

            // Set scale and position
            model.scale.set(scale)
            // Center the model in the canvas
            model.position.set(width / 2, height / 2)
            model.anchor.set(0.5, 0.5)

            // Add to stage
            app.stage.addChild(model)

            // Update loop
            app.ticker.add(() => {
              if (modelRef.current) {
                const deltaTime = app.ticker.deltaTime
                // Update Live2D model
                modelRef.current.update(deltaTime)
              }
            })
          } catch (modelError) {
            console.warn(
              'Failed to load Live2D model, showing fallback:',
              modelError
            )
            setShowFallback(true)
          }
        } catch (error) {
          console.error('Failed to initialize PIXI:', error)
          setShowFallback(true)
        }
      }

      // Initialize after a small delay
      const timer = setTimeout(() => {
        init()
      }, 100)

      cleanup = () => {
        clearTimeout(timer)

        if (modelRef.current) {
          try {
            modelRef.current.destroy()
          } catch (e) {}
          modelRef.current = null
        }

        if (appRef.current) {
          try {
            appRef.current.destroy(true)
          } catch (e) {}
          appRef.current = null
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      }

      return () => {
        if (cleanup) cleanup()
      }
    }, [modelPath, width, height, scale])

    if (showFallback && fallbackImage) {
      return (
        <div style={{ width, height, position: 'relative' }}>
          <img
            src={fallbackImage}
            alt="Character"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'pixelated',
            }}
          />
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        style={{
          width,
          height,
          position: 'relative',
          pointerEvents: 'none',
        }}
      />
    )
  }
)

Live2DPixi6.displayName = 'Live2DPixi6'

export default Live2DPixi6
