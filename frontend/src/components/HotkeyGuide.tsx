import React, { useState, useEffect } from 'react'

interface HotkeyGuideProps {
  isVisible: boolean
  onClose: () => void
}

export const HotkeyGuide: React.FC<HotkeyGuideProps> = ({ isVisible, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = 4

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        previousPage()
      } else if (e.key === 'ArrowRight') {
        nextPage()
      }
    }

    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, currentPage, onClose])

  const goToPage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= totalPages) return
    setCurrentPage(pageIndex)
  }

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  if (!isVisible) return null

  return (
    <div className="hotkey-guide-overlay">
      <style>{`
        .hotkey-guide-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .guide-container {
          width: 90vw;
          height: 80vh;
          max-width: 1200px;
          max-height: 900px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          animation: slideIn 0.4s ease;
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .guide-header {
          background: linear-gradient(90deg, #4CAF50 0%, #81C784 100%);
          color: white;
          padding: 20px 32px;
          text-align: center;
          flex-shrink: 0;
          position: relative;
        }

        .guide-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .guide-header p {
          font-size: 14px;
          opacity: 0.9;
        }

        .close-btn {
          position: absolute;
          top: 50%;
          right: 24px;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 18px;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-50%) scale(1.1);
        }

        .page-indicator {
          position: absolute;
          left: 32px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .page-dots {
          display: flex;
          gap: 6px;
        }

        .page-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .page-dot.active {
          background: white;
          transform: scale(1.2);
        }

        .content-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .page {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          padding: 40px;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.5s ease;
          overflow-y: auto;
        }

        .page.active {
          opacity: 1;
          transform: translateX(0);
        }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 32px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .main-functions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          height: calc(100% - 100px);
        }

        .function-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border-left: 6px solid var(--card-color);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .function-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 48px rgba(0,0,0,0.15);
        }

        .function-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .hotkey-btn {
          background: var(--card-color);
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }

        .function-info h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .function-subtitle {
          font-size: 14px;
          color: #64748b;
        }

        .function-list {
          list-style: none;
          flex: 1;
          margin: 0;
          padding: 0;
        }

        .function-list li {
          padding: 8px 0;
          color: #374151;
          font-size: 16px;
          position: relative;
          padding-left: 20px;
          line-height: 1.4;
        }

        .function-list li::before {
          content: '▸';
          color: var(--card-color);
          font-weight: bold;
          position: absolute;
          left: 0;
        }

        .page-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          height: calc(100% - 100px);
        }

        .movement-section {
          background: white;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border-left: 6px solid var(--section-color);
        }

        .movement-title {
          font-size: 24px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .movement-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .movement-item {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f8fafc;
          padding: 16px 20px;
          border-radius: 12px;
          border-left: 4px solid var(--section-color);
          transition: all 0.3s ease;
        }

        .movement-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }

        .movement-key {
          background: var(--section-color);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          min-width: 100px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .movement-desc {
          font-size: 16px;
          color: #374151;
          font-weight: 500;
        }

        .system-section {
          background: white;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border-left: 6px solid var(--section-color);
        }

        .system-grid {
          display: grid;
          gap: 16px;
        }

        .system-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          padding: 16px 24px;
          border-radius: 12px;
          border-left: 4px solid var(--section-color);
          transition: all 0.3s ease;
        }

        .system-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }

        .system-key {
          background: var(--section-color);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .system-desc {
          font-size: 16px;
          color: #374151;
          font-weight: 500;
          flex: 1;
          margin-left: 20px;
        }

        .tips-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          height: calc(100% - 100px);
          overflow-y: auto;
        }

        .tip-category {
          background: white;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border-left: 6px solid var(--tip-color);
        }

        .tip-category h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tip-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .tip-list li {
          padding: 12px 0;
          color: #374151;
          font-size: 16px;
          line-height: 1.5;
          position: relative;
          padding-left: 24px;
        }

        .tip-list li::before {
          content: '💡';
          position: absolute;
          left: 0;
        }

        .tip-list strong {
          color: var(--tip-color);
        }

        .navigation {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 16px;
        }

        .nav-btn {
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid #e2e8f0;
          color: #64748b;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
        }

        .nav-btn:hover {
          background: white;
          border-color: #4CAF50;
          color: #4CAF50;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-btn:disabled:hover {
          transform: none;
          background: rgba(255, 255, 255, 0.9);
          border-color: #e2e8f0;
          color: #64748b;
        }

        .esc-hint {
          position: absolute;
          top: 16px;
          right: 80px;
          background: rgba(255, 255, 255, 0.9);
          color: #64748b;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          backdrop-filter: blur(5px);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        /* 顏色主題 */
        .game-menu { --card-color: #3b82f6; }
        .social-features { --card-color: #10b981; }
        .world-exploration { --card-color: #f59e0b; }
        .game-settings { --card-color: #8b5cf6; }
        .movement-control { --section-color: #ef4444; }
        .system-control { --section-color: #6b7280; }
        .tips-page { --tip-color: #f59e0b; }

        @media (max-width: 768px) {
          .guide-container {
            width: 95vw;
            height: 90vh;
          }
          
          .page {
            padding: 20px;
          }
          
          .page-content {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .main-functions-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .movement-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="guide-container">
        <div className="guide-header">
          <h1>🎮 遊戲快捷鍵指南</h1>
          <p>掌握所有快捷鍵，提升您的遊戲體驗</p>
          <div className="page-indicator">
            <span>{currentPage + 1} / {totalPages}</span>
            <div className="page-dots">
              {Array.from({ length: totalPages }, (_, index) => (
                <div
                  key={index}
                  className={`page-dot ${index === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(index)}
                />
              ))}
            </div>
          </div>
          <div className="esc-hint">按 ESC 關閉</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="content-wrapper">
          {/* 第1頁：主要功能區域 */}
          <div className={`page ${currentPage === 0 ? 'active' : ''}`}>
            <div className="page-title">
              <span>🎯</span>
              <span>主要功能區域</span>
            </div>
            <div className="main-functions-grid">
              <div className="function-card game-menu">
                <div className="function-header">
                  <div className="hotkey-btn">G</div>
                  <div className="function-info">
                    <h3>遊戲選單</h3>
                    <div className="function-subtitle">🎮 遊戲模式</div>
                  </div>
                </div>
                <ul className="function-list">
                  <li>單人模式</li>
                  <li>多人模式</li>
                  <li>挑戰任務</li>
                  <li>教學引導</li>
                </ul>
              </div>

              <div className="function-card social-features">
                <div className="function-header">
                  <div className="hotkey-btn">C</div>
                  <div className="function-info">
                    <h3>社交功能</h3>
                    <div className="function-subtitle">👥 社群互動</div>
                  </div>
                </div>
                <ul className="function-list">
                  <li>AI聊天室 (12位專業助手)</li>
                  <li>好友列表</li>
                  <li>郵件系統</li>
                  <li>社區活動</li>
                </ul>
              </div>

              <div className="function-card world-exploration">
                <div className="function-header">
                  <div className="hotkey-btn">X</div>
                  <div className="function-info">
                    <h3>探索世界</h3>
                    <div className="function-subtitle">🌍 世界冒險</div>
                  </div>
                </div>
                <ul className="function-list">
                  <li>我的島嶼</li>
                  <li>拜訪朋友</li>
                  <li>世界地圖</li>
                  <li>特殊活動</li>
                </ul>
              </div>

              <div className="function-card game-settings">
                <div className="function-header">
                  <div className="hotkey-btn">Z</div>
                  <div className="function-info">
                    <h3>遊戲設定</h3>
                    <div className="function-subtitle">⚙️ 系統設定</div>
                  </div>
                </div>
                <ul className="function-list">
                  <li>音效設定</li>
                  <li>畫面設定</li>
                  <li>操作設定</li>
                  <li>遊戲性設定</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 第2頁：移動控制 */}
          <div className={`page ${currentPage === 1 ? 'active' : ''}`}>
            <div className="page-title">
              <span>🎲</span>
              <span>移動控制</span>
            </div>
            <div className="page-content">
              <div className="movement-section movement-control">
                <div className="movement-title">
                  <span>🚶‍♂️</span>
                  <span>角色移動</span>
                </div>
                <div className="movement-grid">
                  <div className="movement-item">
                    <div className="movement-key">W A S D</div>
                    <div className="movement-desc">移動角色</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">滑鼠</div>
                    <div className="movement-desc">控制視角</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">Shift</div>
                    <div className="movement-desc">潛行模式</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">Ctrl</div>
                    <div className="movement-desc">跑步加速</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">Space</div>
                    <div className="movement-desc">跳躍/互動</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">E</div>
                    <div className="movement-desc">與NPC對話</div>
                  </div>
                </div>
              </div>
              <div className="movement-section movement-control">
                <div className="movement-title">
                  <span>🎯</span>
                  <span>特殊操作</span>
                </div>
                <div className="movement-grid">
                  <div className="movement-item">
                    <div className="movement-key">左鍵</div>
                    <div className="movement-desc">選擇/確認</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">右鍵</div>
                    <div className="movement-desc">取消/返回</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">滾輪</div>
                    <div className="movement-desc">縮放視角</div>
                  </div>
                  <div className="movement-item">
                    <div className="movement-key">F</div>
                    <div className="movement-desc">跟隨/鎖定</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第3頁：系統控制 */}
          <div className={`page ${currentPage === 2 ? 'active' : ''}`}>
            <div className="page-title">
              <span>🔧</span>
              <span>系統控制</span>
            </div>
            <div className="page-content">
              <div className="system-section system-control">
                <div className="movement-title">
                  <span>📱</span>
                  <span>介面管理</span>
                </div>
                <div className="system-grid">
                  <div className="system-item">
                    <div className="system-key">ESC</div>
                    <div className="system-desc">關閉當前選單/退出對話</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">Tab</div>
                    <div className="system-desc">關閉所有選單</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">Ctrl+H</div>
                    <div className="system-desc">返回開始畫面</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">I</div>
                    <div className="system-desc">開啟/關閉背包</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">M</div>
                    <div className="system-desc">開啟/關閉地圖</div>
                  </div>
                </div>
              </div>
              <div className="system-section system-control">
                <div className="movement-title">
                  <span>💡</span>
                  <span>特殊功能</span>
                </div>
                <div className="system-grid">
                  <div className="system-item">
                    <div className="system-key">Enter</div>
                    <div className="system-desc">確認選項</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">H / ?</div>
                    <div className="system-desc">顯示幫助說明</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">F1</div>
                    <div className="system-desc">遊戲幫助</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">F5</div>
                    <div className="system-desc">重新載入</div>
                  </div>
                  <div className="system-item">
                    <div className="system-key">F11</div>
                    <div className="system-desc">全螢幕模式</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第4頁：使用技巧 */}
          <div className={`page ${currentPage === 3 ? 'active' : ''}`}>
            <div className="page-title">
              <span>💡</span>
              <span>使用技巧</span>
            </div>
            <div className="tips-grid">
              <div className="tip-category tips-page">
                <h3>🎯 新手建議</h3>
                <ul className="tip-list">
                  <li><strong>開始遊戲：</strong> 建議先熟悉基本操作後再進入遊戲</li>
                  <li><strong>練習模式：</strong> 使用教學引導模式練習移動和基本操作</li>
                  <li><strong>儲存設定：</strong> 完成基本設定後記得保存，避免重複設定</li>
                </ul>
              </div>

              <div className="tip-category tips-page">
                <h3>⚡ 效率提升</h3>
                <ul className="tip-list">
                  <li><strong>快速導航：</strong> 使用G、C、X、Z快速切換不同功能區域</li>
                  <li><strong>組合按鍵：</strong> 熟練使用Ctrl、Shift組合鍵可以大幅提升體驗</li>
                  <li><strong>自訂快捷鍵：</strong> 在設定選單中可以自訂適合自己的按鍵配置</li>
                </ul>
              </div>

              <div className="tip-category tips-page">
                <h3>🆘 問題解決</h3>
                <ul className="tip-list">
                  <li><strong>緊急退出：</strong> 按ESC可快速關閉當前介面，Tab可關閉所有選單</li>
                  <li><strong>重新載入：</strong> 遊戲卡頓時可按F5重新載入，或Ctrl+H返回主畫面</li>
                  <li><strong>尋求幫助：</strong> 按H或?可隨時顯示幫助說明</li>
                </ul>
              </div>

              <div className="tip-category tips-page">
                <h3>👥 社交互動</h3>
                <ul className="tip-list">
                  <li><strong>AI助手：</strong> 按C進入社交選單，與12位AI助手聊天獲得協助</li>
                  <li><strong>好友系統：</strong> 多利用好友功能，與其他玩家一起探索遊戲世界</li>
                  <li><strong>社區活動：</strong> 定期參與社區活動，獲得獨特獎勵和遊戲體驗</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="navigation">
          <button 
            className="nav-btn" 
            onClick={previousPage}
            disabled={currentPage === 0}
          >
            ⬅ 上一頁
          </button>
          <button 
            className="nav-btn" 
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
          >
            下一頁 ➡
          </button>
        </div>
      </div>
    </div>
  )
}