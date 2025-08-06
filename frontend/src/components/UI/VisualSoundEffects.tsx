import React, { useEffect, useState } from 'react'
import { Music, Volume2, Bell, Heart, Star } from 'lucide-react'

interface SoundEffect {
  id: string
  type: 'click' | 'success' | 'chat' | 'notification' | 'collect'
  position: { x: number; y: number }
}

export const VisualSoundEffects: React.FC = () => {
  const [effects, setEffects] = useState<SoundEffect[]>([])

  // Listen for custom sound events
  useEffect(() => {
    const handleSoundEffect = (event: CustomEvent) => {
      const { type, x, y } = event.detail
      const newEffect: SoundEffect = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        position: { x, y }
      }
      
      setEffects(prev => [...prev, newEffect])
      
      // Remove effect after animation
      setTimeout(() => {
        setEffects(prev => prev.filter(e => e.id !== newEffect.id))
      }, 1000)
    }

    window.addEventListener('visualSound' as any, handleSoundEffect)
    return () => window.removeEventListener('visualSound' as any, handleSoundEffect)
  }, [])

  const renderEffect = (effect: SoundEffect) => {
    switch (effect.type) {
      case 'click':
        return (
          <div className="animate-ping absolute">
            <div className="w-8 h-8 bg-blue-400 rounded-full opacity-75" />
          </div>
        )
      
      case 'success':
        return (
          <div className="animate-tada absolute">
            <Star className="w-10 h-10 text-yellow-400" fill="currentColor" />
          </div>
        )
      
      case 'chat':
        return (
          <div className="absolute">
            <div className="flex gap-1 animate-bounce">
              <Music className="w-6 h-6 text-green-400" />
              <Music className="w-5 h-5 text-blue-400" style={{ animationDelay: '0.1s' }} />
              <Music className="w-4 h-4 text-pink-400" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        )
      
      case 'notification':
        return (
          <div className="animate-shake absolute">
            <Bell className="w-8 h-8 text-yellow-500" fill="currentColor" />
          </div>
        )
      
      case 'collect':
        return (
          <div className="animate-heartbeat absolute">
            <Heart className="w-8 h-8 text-pink-400" fill="currentColor" />
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {effects.map(effect => (
        <div
          key={effect.id}
          className="absolute"
          style={{
            left: effect.position.x,
            top: effect.position.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {renderEffect(effect)}
        </div>
      ))}
    </div>
  )
}

// Helper function to trigger visual sound effects
export const playVisualSound = (type: SoundEffect['type'], event?: MouseEvent) => {
  const x = event?.clientX || window.innerWidth / 2
  const y = event?.clientY || window.innerHeight / 2
  
  window.dispatchEvent(new CustomEvent('visualSound', {
    detail: { type, x, y }
  }))
}

// Musical Note Rain Component
export const MusicalNoteRain: React.FC<{ active: boolean }> = ({ active }) => {
  const [notes, setNotes] = useState<Array<{ id: string; left: number; delay: number }>>([])

  useEffect(() => {
    if (!active) {
      setNotes([])
      return
    }

    const interval = setInterval(() => {
      const newNote = {
        id: `note-${Date.now()}`,
        left: Math.random() * 100,
        delay: Math.random() * 2
      }
      
      setNotes(prev => [...prev, newNote])
      
      setTimeout(() => {
        setNotes(prev => prev.filter(n => n.id !== newNote.id))
      }, 5000)
    }, 500)

    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {notes.map(note => (
        <div
          key={note.id}
          className="absolute top-0 music-note-float"
          style={{
            left: `${note.left}%`,
            animationDelay: `${note.delay}s`
          }}
        >
          <Music className="w-6 h-6 text-yellow-400 opacity-80" />
        </div>
      ))}
    </div>
  )
}

// Bubble Effect Component
export const BubbleEffect: React.FC = () => {
  const [bubbles, setBubbles] = useState<Array<{ id: string; size: number; left: number; duration: number }>>([])

  useEffect(() => {
    const interval = setInterval(() => {
      const newBubble = {
        id: `bubble-${Date.now()}`,
        size: 10 + Math.random() * 30,
        left: Math.random() * 100,
        duration: 3 + Math.random() * 3
      }
      
      setBubbles(prev => [...prev.slice(-10), newBubble])
      
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== newBubble.id))
      }, newBubble.duration * 1000)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 h-screen pointer-events-none z-10">
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="ac-bubble"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            animationDuration: `${bubble.duration}s`,
            background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(126, 200, 80, 0.2))`
          }}
        />
      ))}
    </div>
  )
}

// Reaction Emojis Component
export const ReactionEmoji: React.FC<{ emoji: string; x: number; y: number }> = ({ emoji, x, y }) => {
  return (
    <div
      className="fixed pointer-events-none z-[9999] animate-float text-4xl"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        animation: 'float 2s ease-out forwards, fade-out 2s ease-out forwards'
      }}
    >
      {emoji}
    </div>
  )
}

// Interactive Sound Feedback Hook
export const useInteractiveSounds = () => {
  const triggerHoverSound = (e: React.MouseEvent) => {
    const ripple = document.createElement('div')
    ripple.className = 'absolute w-4 h-4 bg-yellow-300 rounded-full animate-ping'
    ripple.style.left = `${e.clientX}px`
    ripple.style.top = `${e.clientY}px`
    ripple.style.pointerEvents = 'none'
    document.body.appendChild(ripple)
    setTimeout(() => ripple.remove(), 500)
  }

  const triggerClickSound = (e: React.MouseEvent) => {
    playVisualSound('click', e.nativeEvent)
  }

  const triggerSuccessSound = (e: React.MouseEvent) => {
    playVisualSound('success', e.nativeEvent)
  }

  return {
    triggerHoverSound,
    triggerClickSound,
    triggerSuccessSound
  }
}