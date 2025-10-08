export default function CuteDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* 飄浮的貓咪表情 */}
      <div className="absolute top-20 left-10 text-4xl animate-float opacity-40">
        🐱
      </div>
      <div className="absolute top-40 right-20 text-3xl animate-float-delayed opacity-30">
        😺
      </div>
      <div className="absolute bottom-32 left-1/4 text-3xl animate-gentle-float opacity-35">
        🐾
      </div>
      <div className="absolute top-1/3 right-10 text-2xl animate-float opacity-25">
        💕
      </div>
      <div className="absolute bottom-40 right-1/3 text-3xl animate-float-delayed opacity-30">
        ✨
      </div>

      {/* 角落裝飾 - 寶寶粉和鵝黃色 */}
      <div className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{
        background: 'radial-gradient(circle, #FFB3D9 0%, transparent 70%)'
      }} />
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20" style={{
        background: 'radial-gradient(circle, #FFFACD 0%, transparent 70%)'
      }} />
      <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full blur-3xl opacity-20" style={{
        background: 'radial-gradient(circle, #FFE5F0 0%, transparent 70%)'
      }} />
      <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{
        background: 'radial-gradient(circle, #FFF5E1 0%, transparent 70%)'
      }} />
    </div>
  )
}
