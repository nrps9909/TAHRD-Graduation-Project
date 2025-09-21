import { useGameStore } from '@/stores/gameStore'

export interface PhoneApp {
  id: string
  name: string
  icon: string
  color: string
  action: () => void
}

export const createPhoneApps = (): PhoneApp[] => {
  const store = useGameStore.getState()
  
  return [
    {
      id: 'map',
      name: '地圖',
      icon: '🗺️',
      color: 'from-green-400 to-green-600',
      action: () => {
        store.setShowMap(true)
      }
    },
    {
      id: 'inventory',
      name: '道具',
      icon: '🎒',
      color: 'from-amber-400 to-amber-600',
      action: () => {
        store.setShowInventory(true)
      }
    },
    {
      id: 'diary',
      name: '日記',
      icon: '📖',
      color: 'from-pink-400 to-pink-600',
      action: () => {
        store.setShowDiary(true)
      }
    },
    {
      id: 'camera',
      name: '相機',
      icon: '📸',
      color: 'from-blue-400 to-blue-600',
      action: () => console.log('Camera opened!')
    },
    {
      id: 'chat',
      name: '對話',
      icon: '💬',
      color: 'from-purple-400 to-purple-600',
      action: () => {
        if (store.selectedNpc) {
          store.setShowDialogue(true)
        }
      }
    },
    {
      id: 'friends',
      name: '好友',
      icon: '👥',
      color: 'from-indigo-400 to-indigo-600',
      action: () => console.log('Friends opened!')
    },
    {
      id: 'settings',
      name: '設定',
      icon: '⚙️',
      color: 'from-gray-400 to-gray-600',
      action: () => {
        store.setShowSettings(true)
      }
    },
    {
      id: 'help',
      name: '說明',
      icon: '❓',
      color: 'from-cyan-400 to-cyan-600',
      action: () => {
        // This will be handled by parent component
        console.log('Help opened!')
      }
    }
  ]
}

// Create a singleton instance
export const phoneApps = createPhoneApps()