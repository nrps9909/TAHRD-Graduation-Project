/**
 * TororoTest - 白撲撲知識膠囊製造機測試頁面
 *
 * 用於測試和展示新的知識上傳介面
 * 每個知識膠囊會在島上生成一棵知識樹
 */

import { useState } from 'react'
import TororoKnowledgePanel from '@/components/TororoKnowledgePanel'
import { useTororoKnowledge, getEmotionColor, getCategoryIcon } from '@/hooks/useTororoKnowledge'
import type { KnowledgeCapsule } from '@/hooks/useTororoKnowledge'

export default function TororoTest() {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeCapsule[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const { createKnowledge, isCreating, lastCreated } = useTororoKnowledge({
    onSuccess: (capsule) => {
      console.log('✅ 知識樹已種植！', capsule)
      setKnowledgeList(prev => [capsule, ...prev])
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    },
    onError: (error) => {
      console.error('❌ 種植失敗', error)
      alert('種植失敗：' + error.message)
    }
  })

  // 統計資訊
  const stats = {
    total: knowledgeList.length,
    byEmotion: knowledgeList.reduce((acc, k) => {
      acc[k.emotion] = (acc[k.emotion] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byCategory: knowledgeList.reduce((acc, k) => {
      acc[k.category] = (acc[k.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* 頂部標題 */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🌸 白撲撲知識膠囊製造機
          </h1>
          <p className="text-gray-600">
            重新設計的知識上傳介面 - 不是 Chatbot，是知識園丁助手
          </p>
        </div>

        {/* 成功提示 */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg animate-bounce">
            ✨ 知識樹已種植成功！
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 總數 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-orange-200">
            <div className="text-center">
              <div className="text-4xl mb-2">🌳</div>
              <div className="text-3xl font-bold text-orange-600">{stats.total}</div>
              <div className="text-sm text-gray-600">棵知識樹</div>
            </div>
          </div>

          {/* 情緒分布 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200">
            <div className="text-center mb-3">
              <div className="text-xl font-bold text-pink-600">情緒花園</div>
            </div>
            <div className="space-y-1">
              {Object.entries(stats.byEmotion).map(([emotion, count]) => (
                <div key={emotion} className="flex items-center justify-between text-sm">
                  <span>{emotion}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 類型分布 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
            <div className="text-center mb-3">
              <div className="text-xl font-bold text-blue-600">知識分類</div>
            </div>
            <div className="space-y-1">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span>{getCategoryIcon(category as any)} {category}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 知識列表 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🌳 我的知識森林
          </h2>

          {knowledgeList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🌱</div>
              <p className="text-lg">還沒有種下任何知識樹</p>
              <p className="text-sm">點擊右下角的白撲撲開始吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {knowledgeList.map((knowledge, index) => (
                <KnowledgeCard key={index} knowledge={knowledge} />
              ))}
            </div>
          )}
        </div>

        {/* 使用說明 */}
        <div className="mt-8 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-2xl p-6 border-2 border-orange-300">
          <h3 className="text-xl font-bold text-orange-800 mb-3">
            📖 使用說明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-900">
            <div>
              <div className="font-bold mb-2">✨ 核心特色</div>
              <ul className="list-disc list-inside space-y-1">
                <li>不是對話，是快速記錄</li>
                <li>視覺化情緒和類型選擇</li>
                <li>即時看到知識樹生長</li>
                <li>Live2D 白撲撲陪伴</li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-2">🚀 快速流程</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>點擊右下角浮動按鈕</li>
                <li>輸入你的想法（10秒內完成）</li>
                <li>選擇心情和類型</li>
                <li>點擊「種下這棵知識樹」</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* 白撲撲知識面板 */}
      <TororoKnowledgePanel
        onCreateKnowledge={createKnowledge}
      />
    </div>
  )
}

// ============ 知識卡片組件 ============

interface KnowledgeCardProps {
  knowledge: KnowledgeCapsule
}

function KnowledgeCard({ knowledge }: KnowledgeCardProps) {
  const emotionColor = getEmotionColor(knowledge.emotion)
  const categoryIcon = getCategoryIcon(knowledge.category)

  return (
    <div
      className="border-l-4 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-all"
      style={{ borderColor: emotionColor }}
    >
      <div className="flex items-start gap-4">
        {/* 左側：情緒圖標 */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: emotionColor + '40' }}
        >
          {categoryIcon}
        </div>

        {/* 中間：內容 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-white border">
              {knowledge.emotion}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-white border">
              {categoryIcon} {knowledge.category}
            </span>
            <span className="text-xs text-gray-500">
              {knowledge.timestamp.toLocaleString('zh-TW')}
            </span>
          </div>

          <p className="text-gray-800 mb-2 whitespace-pre-wrap">
            {knowledge.content}
          </p>

          {knowledge.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {knowledge.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
