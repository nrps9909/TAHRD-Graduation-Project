import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

// Register PIXI globally for Live2D
window.PIXI = PIXI;

interface Live2DPixi6Props {
  modelPath: string;
  fallbackImage?: string;
  width?: number;
  height?: number;
  scale?: number;
  triggerMotion?: boolean;
  mood?: string;
}

const Live2DPixi6 = ({
  modelPath,
  fallbackImage = '/models/hijiki/hijiki.2048/texture_00.png',
  width = 256,
  height = 256,
  scale = 0.5,
  triggerMotion = false
}: Live2DPixi6Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModel | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Trigger talking animation when dialogue changes
  useEffect(() => {
    if (modelRef.current && triggerMotion) {
      try {
        // Try multiple motion groups for talking animation
        const motionGroups = ['tap_body', 'idle', 'tap', 'flick_head', 'pinch_in', 'pinch_out', 'shake'];
        const internalModel = (modelRef.current as any).internalModel;

        if (internalModel && internalModel.motionManager) {
          // Try to find a valid motion group
          let motionStarted = false;
          for (const group of motionGroups) {
            try {
              const result = internalModel.motionManager.startRandomMotion(group);
              if (result) {
                motionStarted = true;
                console.log(`Started motion: ${group}`);
                break;
              }
            } catch (e) {
              // Try next motion group
            }
          }

          // If no predefined motion works, try to trigger expression change
          if (!motionStarted && internalModel.coreModel) {
            try {
              // Trigger mouth movement for talking effect
              const expressions = ['f01', 'f02', 'f03', 'f04'];
              const randomExp = expressions[Math.floor(Math.random() * expressions.length)];
              internalModel.expression(randomExp);
            } catch (e) {
              // Ignore expression errors
            }
          }
        }

        // Also try direct motion triggering through model
        if ((modelRef.current as any).motion) {
          try {
            (modelRef.current as any).motion('tap_body');
          } catch (e) {
            // Ignore direct motion errors
          }
        }
      } catch (e) {
        console.log('Motion trigger error:', e);
      }
    }
  }, [triggerMotion]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const init = async () => {
      if (!containerRef.current) return;

      try {
        // Register PIXI ticker
        Live2DModel.registerTicker(PIXI.Ticker);

        // Create PIXI Application (v6 syntax)
        const app = new PIXI.Application({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        appRef.current = app;
        containerRef.current.appendChild(app.view);

        // Load Live2D model
        try {
          const model = await Live2DModel.from(modelPath);
          modelRef.current = model;

          // Set scale and position
          model.scale.set(scale);
          // Center the model in the canvas
          model.position.set(width / 2, height / 2);
          model.anchor.set(0.5, 0.5);

          // Add to stage
          app.stage.addChild(model);

          // Update loop
          app.ticker.add(() => {
            if (modelRef.current) {
              const deltaTime = app.ticker.deltaTime;
              // Update Live2D model
              modelRef.current.update(deltaTime);
            }
          });

        } catch (modelError) {
          console.warn('Failed to load Live2D model, showing fallback:', modelError);
          setShowFallback(true);
        }

      } catch (error) {
        console.error('Failed to initialize PIXI:', error);
        setShowFallback(true);
      }
    };

    // Initialize after a small delay
    const timer = setTimeout(() => {
      init();
    }, 100);

    cleanup = () => {
      clearTimeout(timer);

      if (modelRef.current) {
        try {
          modelRef.current.destroy();
        } catch (e) {}
        modelRef.current = null;
      }

      if (appRef.current) {
        try {
          appRef.current.destroy(true);
        } catch (e) {}
        appRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };

    return () => {
      if (cleanup) cleanup();
    };
  }, [modelPath, width, height, scale]);

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
            imageRendering: 'pixelated'
          }}
        />
      </div>
    );
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
  );
};

export default Live2DPixi6;