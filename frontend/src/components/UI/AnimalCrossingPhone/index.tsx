import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { PhoneContainer } from './PhoneContainer'
import { PhoneHint } from './PhoneHint'
import { BootScreen } from './BootScreen'
import { ControlsHelp } from './ControlsHelp'
import { phoneApps } from './phoneApps'

interface AnimalCrossingPhoneProps {
  showControls: boolean
  setShowControls: (show: boolean) => void
}

export const AnimalCrossingPhone = ({ showControls, setShowControls }: AnimalCrossingPhoneProps) => {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [showBootScreen, setShowBootScreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [clickedApp, setClickedApp] = useState<string | null>(null)

  // Handle TAB key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (!isPhoneOpen) {
          setShowBootScreen(true)
          setTimeout(() => {
            setShowBootScreen(false)
            setIsPhoneOpen(true)
          }, 1800)
        } else {
          setIsPhoneOpen(false)
        }
      }
      if (e.key === 'Escape' && isPhoneOpen) {
        setIsPhoneOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPhoneOpen])

  return (
    <>
      {/* TAB Hint */}
      <PhoneHint visible={!isPhoneOpen && !showBootScreen} />

      {/* Boot Screen */}
      <BootScreen visible={showBootScreen} />

      {/* Phone UI */}
      <PhoneContainer
        visible={isPhoneOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        apps={phoneApps}
        clickedApp={clickedApp}
        setClickedApp={setClickedApp}
        onClose={() => setIsPhoneOpen(false)}
      />

      {/* Controls Help */}
      <ControlsHelp 
        visible={showControls} 
        onClose={() => setShowControls(false)} 
      />
    </>
  )
}