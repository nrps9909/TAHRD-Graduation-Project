/**
 * IslandShapeDrawer - 島嶼形狀繪製工具
 * 讓玩家自由繪製島嶼的形狀
 */

import { useRef, useState, useEffect } from 'react'

interface IslandShapeDrawerProps {
  onShapeChange: (shapeData: string) => void
  initialShape?: string
  width?: number
  height?: number
}

export function IslandShapeDrawer({
  onShapeChange,
  initialShape,
  width = 400,
  height = 400
}: IslandShapeDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')

  // 初始化畫布
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 設置畫布背景
    ctx.fillStyle = '#F0F0F0'
    ctx.fillRect(0, 0, width, height)

    // 如果有初始形狀，載入它
    if (initialShape) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
      }
      img.src = initialShape
    } else {
      // 繪製中心點參考
      drawCenterGuide(ctx)
    }
  }, [initialShape, width, height])

  // 繪製中心參考線
  const drawCenterGuide = (ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.strokeStyle = '#CCCCCC'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1

    // 十字線
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    // 中心圓
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }

  // 開始繪製
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  // 繪製
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)

    if (tool === 'brush') {
      ctx.fillStyle = '#4CAF50' // 島嶼綠色
      ctx.fill()
    } else {
      ctx.fillStyle = '#F0F0F0' // 背景色（橡皮擦）
      ctx.fill()
    }

    // 通知父組件形狀已改變
    const shapeData = canvas.toDataURL('image/png')
    onShapeChange(shapeData)
  }

  // 停止繪製
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // 清空畫布
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#F0F0F0'
    ctx.fillRect(0, 0, width, height)
    drawCenterGuide(ctx)

    onShapeChange('')
  }

  // 填充預設形狀
  const fillPreset = (shape: 'circle' | 'square' | 'heart' | 'star') => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空畫布
    ctx.fillStyle = '#F0F0F0'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2
    const size = 150

    ctx.fillStyle = '#4CAF50'

    switch (shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'square':
        ctx.fillRect(centerX - size, centerY - size, size * 2, size * 2)
        break

      case 'heart':
        ctx.beginPath()
        ctx.moveTo(centerX, centerY + size / 4)
        ctx.bezierCurveTo(centerX, centerY, centerX - size / 2, centerY - size / 2, centerX, centerY - size)
        ctx.bezierCurveTo(centerX + size / 2, centerY - size / 2, centerX, centerY, centerX, centerY + size / 4)
        ctx.fill()
        break

      case 'star':
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
          const radius = i % 2 === 0 ? size : size / 2
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        break
    }

    const shapeData = canvas.toDataURL('image/png')
    onShapeChange(shapeData)
  }

  return (
    <div className="space-y-4">
      {/* 工具列 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 畫筆/橡皮擦切換 */}
        <div className="flex gap-2">
          <button
            onClick={() => setTool('brush')}
            className={`px-4 py-2 rounded-cute font-bold transition-all duration-300 ${
              tool === 'brush'
                ? 'bg-gradient-to-r from-candy-pink to-candy-purple text-white shadow-cute'
                : 'bg-healing-gentle text-gray-700 hover:bg-candy-blue/20'
            }`}
          >
            🖌️ 畫筆
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-4 py-2 rounded-cute font-bold transition-all duration-300 ${
              tool === 'eraser'
                ? 'bg-gradient-to-r from-candy-pink to-candy-purple text-white shadow-cute'
                : 'bg-healing-gentle text-gray-700 hover:bg-candy-blue/20'
            }`}
          >
            🧹 橡皮擦
          </button>
        </div>

        {/* 筆刷大小 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">筆刷大小:</span>
          <input
            type="range"
            min="5"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-bold text-gray-700">{brushSize}px</span>
        </div>

        {/* 清空按鈕 */}
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-cute font-bold transition-all duration-300"
        >
          🗑️ 清空
        </button>
      </div>

      {/* 預設形狀快速填充 */}
      <div className="flex gap-2">
        <span className="text-sm text-gray-600 self-center">快速形狀:</span>
        <button
          onClick={() => fillPreset('circle')}
          className="px-3 py-1 bg-healing-gentle hover:bg-candy-blue/20 rounded-cute text-sm font-bold"
        >
          ⭕ 圓形
        </button>
        <button
          onClick={() => fillPreset('square')}
          className="px-3 py-1 bg-healing-gentle hover:bg-candy-blue/20 rounded-cute text-sm font-bold"
        >
          ⬜ 方形
        </button>
        <button
          onClick={() => fillPreset('heart')}
          className="px-3 py-1 bg-healing-gentle hover:bg-candy-blue/20 rounded-cute text-sm font-bold"
        >
          💖 愛心
        </button>
        <button
          onClick={() => fillPreset('star')}
          className="px-3 py-1 bg-healing-gentle hover:bg-candy-blue/20 rounded-cute text-sm font-bold"
        >
          ⭐ 星形
        </button>
      </div>

      {/* 畫布 */}
      <div className="border-4 border-candy-purple rounded-cute overflow-hidden shadow-cute">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair bg-healing-gentle"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* 提示 */}
      <p className="text-xs text-gray-600 text-center">
        💡 提示：在畫布上拖動滑鼠來繪製島嶼形狀，會在右側即時預覽 3D 效果
      </p>
    </div>
  )
}
