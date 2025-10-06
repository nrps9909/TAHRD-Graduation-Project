import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  delay: number
  duration: number
  emoji: string
}

export default function CuteDecorations() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // 创建可爱的漂浮粒子
    const emojis = ['✨', '🌸', '🌼', '🦋', '🌈', '💫', '⭐', '🌺']
    const newParticles: Particle[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
      emoji: emojis[Math.floor(Math.random() * emojis.length)]
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* 漂浮的装饰 */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute text-2xl opacity-40 animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        >
          {particle.emoji}
        </div>
      ))}

      {/* 角落装饰 */}
      <div className="absolute top-4 left-4 text-6xl opacity-20 animate-swing">
        🌸
      </div>
      <div className="absolute top-4 right-4 text-6xl opacity-20 animate-swing" style={{ animationDelay: '1s' }}>
        🦋
      </div>
      <div className="absolute bottom-4 left-4 text-6xl opacity-20 animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
        🌼
      </div>
      <div className="absolute bottom-4 right-4 text-6xl opacity-20 animate-bounce-gentle" style={{ animationDelay: '1.5s' }}>
        ✨
      </div>
    </div>
  )
}
