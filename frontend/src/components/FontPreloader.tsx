import { useEffect } from 'react'

export const FontPreloader = () => {
  useEffect(() => {
    // Preload font by creating a temporary element with the font
    const preloadFont = async () => {
      try {
        // Create a temporary element to force font loading
        const tempDiv = document.createElement('div')
        tempDiv.style.fontFamily = 'GameFont'
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.visibility = 'hidden'
        tempDiv.innerHTML = '測試字體載入 Test Font Loading 0123456789'
        document.body.appendChild(tempDiv)
        
        // Force font loading using Font Loading API if available
        if ('fonts' in document) {
          await document.fonts.load('1em GameFont')
          console.log('GameFont loaded successfully')
        }
        
        // Remove temp element after a delay
        setTimeout(() => {
          document.body.removeChild(tempDiv)
        }, 100)
      } catch (error) {
        console.error('Failed to preload GameFont:', error)
      }
    }
    
    preloadFont()
  }, [])
  
  return null
}