/**
 * Category Edit Modal - 編輯模態窗口
 * 包含 AI 自動生成 Prompt 功能
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MutationFunction } from '@apollo/client'
import {
  Island,
  Subcategory,
} from '../graphql/category'

// 表單數據類型
interface FormData {
  nameChinese: string
  emoji: string
  color: string
  description: string
  keywords: string[]
  systemPrompt: string
  personality: string
  chatStyle: string
  islandId: string
  name?: string
}

// 提交數據類型
interface IslandSubmitData {
  name: string
  nameChinese: string
  emoji: string
  color: string
  description?: string
}

interface SubcategorySubmitData {
  name: string
  nameChinese: string
  emoji: string
  color: string
  islandId: string
  description?: string
  keywords?: string[]
  systemPrompt?: string
  personality?: string
  chatStyle?: string
}

interface EditModalProps {
  editState: {
    mode: 'island' | 'subcategory'
    island?: Island
    subcategory?: Subcategory
    isNew: boolean
  }
  islands: Island[]
  onClose: () => void
  onCreate: MutationFunction
  onUpdate: MutationFunction
  onRefetch: () => void
}

export const EditModal: React.FC<EditModalProps> = ({
  editState,
  islands,
  onClose,
  onCreate,
  onUpdate,
  onRefetch,
}) => {
  const { mode, island, subcategory, isNew } = editState

  // 表單狀態
  const [formData, setFormData] = useState<FormData>({
    nameChinese: '',
    emoji: '',
    color: '',
    description: '',
    keywords: [],
    systemPrompt: '',
    personality: '',
    chatStyle: '',
    islandId: '',
  })


  // 初始化表單數據
  useEffect(() => {
    if (mode === 'island' && !isNew && island) {
      setFormData({
        nameChinese: island.nameChinese || '',
        emoji: island.emoji || '🏝️',
        color: island.color || '#FFB3D9',
        description: island.description || '',
        keywords: [],
        systemPrompt: '',
        personality: '',
        chatStyle: '',
        islandId: '',
      })
    } else if (mode === 'subcategory' && !isNew && subcategory) {
      setFormData({
        nameChinese: subcategory.nameChinese || '',
        emoji: subcategory.emoji || '📚',
        color: subcategory.color || '#FFB3D9',
        description: subcategory.description || '',
        keywords: subcategory.keywords || [],
        systemPrompt: subcategory.systemPrompt || '',
        personality: subcategory.personality || '',
        chatStyle: subcategory.chatStyle || '',
        islandId: subcategory.islandId || '',
      })
    } else if (isNew) {
      // 新增時的預設值
      setFormData({
        nameChinese: '',
        emoji: mode === 'island' ? '🏝️' : '📚',
        color: '#FFB3D9',
        description: '',
        keywords: [],
        systemPrompt: '',
        personality: '',
        chatStyle: '',
        islandId: islands[0]?.id || '',
      })
    }
  }, [mode, island, subcategory, isNew, islands])

  // 提交表單
  const handleSubmit = async () => {
    if (!formData.nameChinese.trim()) {
      alert('請輸入名稱')
      return
    }

    if (mode === 'subcategory' && !formData.islandId) {
      alert('請選擇所屬島嶼')
      return
    }

    try {
      // 準備提交數據
      let submitData: IslandSubmitData | SubcategorySubmitData

      if (isNew) {
        // 首次創建：只提交名稱和必要欄位，讓後端 AI 自動生成其他內容
        if (mode === 'island') {
          submitData = {
            name: formData.nameChinese,
            nameChinese: formData.nameChinese,
            emoji: formData.emoji || '🏝️',
            color: formData.color || '#FFB3D9',
          } as IslandSubmitData
        } else {
          submitData = {
            name: formData.nameChinese,
            nameChinese: formData.nameChinese,
            islandId: formData.islandId,
            emoji: formData.emoji || '📚',
            color: formData.color || '#FFB3D9',
          } as SubcategorySubmitData
        }
      } else {
        // 編輯：提交所有欄位（使用者可能已修改）
        const baseData = {
          name: formData.nameChinese,
          nameChinese: formData.nameChinese,
          emoji: formData.emoji,
          color: formData.color,
          description: formData.description,
        }

        submitData = mode === 'island'
          ? baseData as IslandSubmitData
          : {
              ...baseData,
              islandId: formData.islandId,
              keywords: formData.keywords,
              systemPrompt: formData.systemPrompt,
              personality: formData.personality,
              chatStyle: formData.chatStyle,
            } as SubcategorySubmitData
      }

      if (isNew) {
        await onCreate({
          variables: { input: submitData },
        })
      } else {
        const id = mode === 'island' ? island!.id : subcategory!.id
        await onUpdate({
          variables: {
            id,
            input: submitData,
          },
        })
      }

      await onRefetch()
      alert(isNew ? '✅ 創建成功！' : '✅ 更新成功！')
      onClose()
    } catch (error) {
      console.error('操作失敗:', error)
      alert('❌ 操作失敗，請查看控制台')
    }
  }

  const title = isNew
    ? mode === 'island'
      ? '新增島嶼'
      : '新增小類別'
    : mode === 'island'
    ? '編輯島嶼'
    : '編輯小類別'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#232323] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-[#2a2a2a]">
          <h3 className="text-xl font-bold text-[#d8c47e]">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 提示說明 */}
          {isNew && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-xs text-blue-300">
              <span className="font-semibold">💡 首次創建提示：</span>
              {mode === 'island'
                ? ' 輸入名稱後，AI 會自動生成描述。你可以在創建後隨時編輯。'
                : ' 輸入名稱後，AI 會自動生成描述、關鍵字和系統提示詞。你可以在創建後隨時編輯。'}
            </div>
          )}

          {/* 基本資訊 */}
          <div className="space-y-4">
            {/* 名稱 */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                {mode === 'island' ? '島嶼名稱' : '小類別名稱'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nameChinese}
                onChange={(e) => setFormData((prev) => ({ ...prev, nameChinese: e.target.value }))}
                className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-gray-200 text-lg focus:border-[#d8c47e] focus:outline-none transition-colors"
                placeholder={mode === 'island' ? '例如：學習成長' : '例如：技術學習'}
                autoFocus
              />
            </div>

            {/* 島嶼選擇（僅小類別） */}
            {mode === 'subcategory' && (
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  所屬島嶼 <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.islandId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, islandId: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                >
                  {islands.map((island) => (
                    <option key={island.id} value={island.id}>
                      {island.emoji} {island.nameChinese}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 描述 */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                描述
                {isNew && <span className="text-xs text-gray-500 ml-2 font-normal">（創建時自動生成）</span>}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none resize-none"
                rows={3}
                placeholder={isNew ? 'AI 會自動生成...' : '簡短說明這個分類的用途'}
              />
            </div>

            {/* Emoji 和顏色 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">Emoji</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emoji: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-2xl text-center focus:border-[#d8c47e] focus:outline-none"
                  placeholder={mode === 'island' ? '🏝️' : '📚'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">顏色</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-full h-[42px] rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 小類別進階設定 */}
          {mode === 'subcategory' && (
            <div className="space-y-4 border-t-2 border-gray-700 pt-4">
              {/* 關鍵字 */}
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  關鍵字
                  {isNew && <span className="text-xs text-gray-500 ml-2 font-normal">（創建時自動生成）</span>}
                </label>
                <input
                  type="text"
                  value={formData.keywords.join(', ')}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  }))}
                  className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                  placeholder={isNew ? 'AI 會自動生成...' : '用逗號分隔，例如：技術, 程式, 學習'}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  💡 Chief Agent 會根據這些關鍵字來分類知識
                </p>
              </div>

              {/* 系統提示詞 */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  <span className="text-lg mr-1">🤖</span>
                  系統提示詞
                  {isNew && <span className="text-xs text-gray-500 ml-2 font-normal">（創建時自動生成）</span>}
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-purple-700/30 rounded-lg text-gray-200 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                  rows={6}
                  placeholder={isNew ? 'AI 會自動生成...' : '例如：整理技術學習筆記時，請重點標註：\n1. 核心概念和原理\n2. 實際應用場景\n3. 常見問題和解決方案'}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  💬 告訴 SubAgent 如何分析知識、採用什麼格式、關注哪些重點
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#2a2a2a] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#d8c47e] text-[#191919] rounded-lg hover:bg-[#e0cc86] transition-colors font-medium"
          >
            {isNew ? '創建' : '更新'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
