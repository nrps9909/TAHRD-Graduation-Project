/**
 * IslandDrawer - 島嶼繪製工具
 * 讓玩家在 2D 畫布上繪製島嶼形狀，然後生成 3D 島嶼
 */

import { useRef, useState, useEffect } from 'react'

interface Point {
  x: number
  y: number
}

interface IslandDrawerProps {
  onComplete: (points: Point[]) => void
  onCancel: () => void
}

export function IslandDrawer({ onComplete, onCancel }: IslandDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空畫布
    ctx.fillStyle = '#f0f8ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 繪製網格
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    // 繪製中心參考線
    ctx.strokeStyle = '#ffb6c1'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0)
    ctx.lineTo(canvas.width / 2, canvas.height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, canvas.height / 2)
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()
    ctx.setLineDash([])

    // 繪製已有的路徑
    if (currentPath.length > 0) {
      ctx.strokeStyle = '#4a90e2'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(currentPath[0].x, currentPath[0].y)
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y)
      }
      ctx.stroke()

      // 繪製控制點
      ctx.fillStyle = '#4a90e2'
      currentPath.forEach(point => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })

      // 如果接近起點，顯示閉合提示
      if (currentPath.length > 3) {
        const lastPoint = currentPath[currentPath.length - 1]
        const firstPoint = currentPath[0]
        const distance = Math.sqrt(
          Math.pow(lastPoint.x - firstPoint.x, 2) + Math.pow(lastPoint.y - firstPoint.y, 2)
        )
        if (distance < 20) {
          ctx.strokeStyle = '#50c878'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(firstPoint.x, firstPoint.y, 15, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }
  }, [currentPath])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 檢查是否點擊接近起點（閉合形狀）
    if (currentPath.length > 3) {
      const firstPoint = currentPath[0]
      const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2))
      if (distance < 20) {
        handleComplete()
        return
      }
    }

    setIsDrawing(true)
    setCurrentPath([...currentPath, { x, y }])
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 添加點（間隔一定距離）
    const lastPoint = currentPath[currentPath.length - 1]
    const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2))
    if (distance > 5) {
      setCurrentPath([...currentPath, { x, y }])
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleComplete = () => {
    if (currentPath.length < 4) {
      alert('請繪製更多點以形成完整的島嶼形狀！')
      return
    }

    // 歸一化座標到 -1 到 1 的範圍
    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const scale = Math.min(canvas.width, canvas.height) / 2

    const normalizedPoints = currentPath.map(point => ({
      x: (point.x - centerX) / scale,
      y: -(point.y - centerY) / scale // Y軸翻轉（Canvas Y軸向下，Three.js Z軸向上）
    }))

    onComplete(normalizedPoints)
  }

  const handleClear = () => {
    setCurrentPath([])
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">🎨 繪製你的島嶼形狀</h2>

        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">使用說明：</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 在畫布上<strong>點擊並拖動</strong>來繪製島嶼輪廓</li>
            <li>• 繪製完成後，<strong>點擊起點</strong>閉合形狀（會出現綠色圓圈提示）</li>
            <li>• 或者點擊下方的<strong>「完成繪製」</strong>按鈕</li>
            <li>• 粉色十字線是中心參考線</li>
          </ul>
        </div>

        <div className="border-4 border-gray-300 rounded-lg overflow-hidden mb-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair bg-white"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            已繪製 <span className="font-bold text-blue-600">{currentPath.length}</span> 個點
          </div>
          <div className="space-x-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              清空重畫
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleComplete}
              disabled={currentPath.length < 4}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              ✨ 完成繪製
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
