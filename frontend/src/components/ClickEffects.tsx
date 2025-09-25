import React, { useState, useEffect } from 'react';
import '../styles/click-effects.css';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const ClickEffects: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Create particles
      const newParticles: Particle[] = [];
      const emojis = ['✨', '⭐', '💫', '🌟', '✦', '★'];
      
      for (let i = 0; i < 8; i++) {
        newParticles.push({
          id: Date.now() + i,
          x: e.clientX,
          y: e.clientY,
          emoji: emojis[Math.floor(Math.random() * emojis.length)]
        });
      }

      // Create ripple effect
      const newRipple: Ripple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY
      };

      setParticles(prev => [...prev, ...newParticles]);
      setRipples(prev => [...prev, newRipple]);

      // Clean up particles after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.includes(p)));
      }, 1000);

      // Clean up ripples after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      {particles.map((particle, index) => (
        <div
          key={particle.id}
          className="click-particle"
          style={{
            left: particle.x,
            top: particle.y,
            animationDelay: `${index * 0.05}s`
          }}
        >
          {particle.emoji}
        </div>
      ))}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="click-ripple"
          style={{
            left: ripple.x,
            top: ripple.y
          }}
        />
      ))}
    </>
  );
};

// Sound effect hook
export const useClickSound = () => {
  const playClickSound = () => {
    // Create a simple click sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const playHoverSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  };

  return { playClickSound, playHoverSound };
};