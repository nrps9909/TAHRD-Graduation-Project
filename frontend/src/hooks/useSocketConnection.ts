import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '@/stores/gameStore'

export const useSocketConnection = () => {
  const socketRef = useRef<Socket | null>(null)
  const { addMessage, setTyping, updateNpcMood, updateNpcConversation } = useGameStore()

  useEffect(() => {
    // Use separate WebSocket URL from environment variable
    const socketUrl = import.meta.env.VITE_WS_URL?.replace('ws://', 'http://') || 
                      import.meta.env.VITE_API_URL || 
                      'http://localhost:4000'
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'], // Prefer websocket first
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000, // 20 second timeout for initial connection
      autoConnect: true,
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
    
    // NPC 之間的對話事件
    socket.on('npc-conversation', (data) => {
      if (data.type === 'message') {
        // 更新說話者的對話泡泡
        updateNpcConversation(data.speakerId, data.listenerId, data.content)
        
        // 3秒後清除對話泡泡
        setTimeout(() => {
          updateNpcConversation(data.speakerId, null, null)
        }, 3000)
      } else if (data.type === 'ended') {
        // 對話結束，清除兩個NPC的對話狀態
        console.log(`NPC conversation ended: ${data.npc1} and ${data.npc2} discussed ${data.topic}`)
      }
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [addMessage, setTyping, updateNpcMood, updateNpcConversation])

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