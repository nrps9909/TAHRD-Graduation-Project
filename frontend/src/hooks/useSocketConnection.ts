import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '@/stores/gameStore'

export const useSocketConnection = () => {
  const socketRef = useRef<Socket | null>(null)
  const { addMessage, setTyping, updateNpcMood } = useGameStore()

  useEffect(() => {
    // Use the API URL for socket connection (socket.io handles the ws:// protocol)
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'], // Allow fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    const socket = socketRef.current

    // 連接事件
    socket.on('connect', () => {
      console.log('Connected to server')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    // 遊戲事件
    socket.on('npc-message', (data) => {
      addMessage({
        id: data.id,
        npcId: data.npcId,
        content: data.content,
        speakerType: 'npc',
        timestamp: new Date(data.timestamp),
        emotionTag: data.emotionTag,
      })
      setTyping(false)
    })

    socket.on('npc-typing', (data) => {
      setTyping(data.isTyping)
    })

    socket.on('npc-mood-change', (data) => {
      updateNpcMood(data.npcId, data.mood)
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [addMessage, setTyping, updateNpcMood])

  const sendMessage = (npcId: string, content: string) => {
    if (socketRef.current) {
      socketRef.current.emit('user-message', { npcId, content })
      
      // 立即添加用戶消息到本地狀態
      addMessage({
        id: `user-${Date.now()}`,
        npcId,
        content,
        speakerType: 'user',
        timestamp: new Date(),
      })
    }
  }

  const joinRoom = (roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { roomId })
    }
  }

  const leaveRoom = (roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId })
    }
  }

  return {
    socket: socketRef.current,
    sendMessage,
    joinRoom,
    leaveRoom,
  }
}