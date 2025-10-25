/**
 * Category Edit Modal - 編輯模態窗口
 * 包含 AI 自動生成 Prompt 功能
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLazyQuery, MutationFunction } from '@apollo/client'
import {
  GENERATE_ISLAND_PROMPT,
  GENERATE_SUBCATEGORY_PROMPT,
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

  const [isGenerating, setIsGenerating] = useState(false)

  // AI 生成查詢
  const [generateIslandPrompt] = useLazyQuery(GENERATE_ISLAND_PROMPT)
  const [generateSubcategoryPrompt] = useLazyQuery(GENERATE_SUBCATEGORY_PROMPT)

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

  // AI 生成 Prompt
  const handleGenerate = async () => {
    if (!formData.nameChinese.trim()) {
      alert('請先輸入名稱')
      return
    }

    setIsGenerating(true)
    try {
      if (mode === 'island') {
        const { data } = await generateIslandPrompt({
          variables: {
            nameChinese: formData.nameChinese,
            emoji: formData.emoji,
          },
        })

        if (data?.generateIslandPrompt) {
          setFormData((prev) => ({
            ...prev,
            description: data.generateIslandPrompt.description,
            keywords: data.generateIslandPrompt.keywords,
          }))
          alert('✨ AI 生成成功！')
        }
      } else {
        const selectedIsland = islands.find((i) => i.id === formData.islandId)
        const { data } = await generateSubcategoryPrompt({
          variables: {
            nameChinese: formData.nameChinese,
            emoji: formData.emoji,
            islandName: selectedIsland?.nameChinese,
          },
        })

        if (data?.generateSubcategoryPrompt) {
          setFormData((prev) => ({
            ...prev,
            description: data.generateSubcategoryPrompt.description,
            keywords: data.generateSubcategoryPrompt.keywords,
            systemPrompt: data.generateSubcategoryPrompt.systemPrompt,
            personality: data.generateSubcategoryPrompt.personality,
            chatStyle: data.generateSubcategoryPrompt.chatStyle,
          }))
          alert('✨ AI 生成成功！')
        }
      }
    } catch (error) {
      console.error('AI 生成失敗:', error)
      alert('AI 生成失敗，請重試')
    } finally {
      setIsGenerating(false)
    }
  }

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
      const submitData = {
        name: formData.nameChinese, // 英文名稱設為與中文相同
        nameChinese: formData.nameChinese,
        emoji: formData.emoji || (mode === 'island' ? '🏝️' : '📚'),
        color: formData.color || '#FFB3D9',
        description: formData.description || `${formData.nameChinese}相關的知識和記錄`,
        keywords: formData.keywords.length > 0 ? formData.keywords : [formData.nameChinese],
        ...(mode === 'subcategory' && {
          islandId: formData.islandId,
          systemPrompt: formData.systemPrompt || `我是你的${formData.nameChinese}助手，專門幫助你整理和管理${formData.nameChinese}相關的知識。`,
          personality: formData.personality || '友善、專業、樂於助人',
          chatStyle: formData.chatStyle || '清晰明瞭，提供實用建議',
        })
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
              <p className="text-xs text-gray-500 mt-1.5">
                {mode === 'island'
                  ? '💡 AI 會根據島嶼名稱自動生成描述和關鍵字'
                  : '💡 AI 會根據小類別名稱自動生成完整的助手設定'}
              </p>
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

            {/* AI 生成按鈕 - 極簡版 */}
            <div className="relative bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 border-2 border-purple-500/50 rounded-lg p-5 overflow-hidden">
              {/* 背景光暈效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 animate-pulse" />

              <div className="relative">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl animate-bounce">🤖</span>
                  <div className="flex-1">
                    <h5 className="font-bold text-purple-300 text-base flex items-center gap-2">
                      ✨ AI 自動設定
                      <span className="px-2 py-0.5 bg-purple-600/50 text-purple-200 rounded-full text-xs font-normal">
                        Gemini 2.5 Flash
                      </span>
                    </h5>
                    <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                      {mode === 'island'
                        ? '自動生成描述、關鍵字等所有必要資訊'
                        : '自動生成描述、關鍵字、系統提示詞等所有設定'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !formData.nameChinese.trim()}
                  className={`w-full px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
                    isGenerating || !formData.nameChinese.trim()
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
                  }`}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span>AI 生成中，請稍候...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>✨</span>
                      <span>一鍵自動生成所有設定</span>
                    </span>
                  )}
                </button>

                {!formData.nameChinese.trim() && (
                  <p className="text-xs text-amber-400 mt-2 text-center">
                    💡 請先輸入名稱後再使用 AI 生成
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 系統提示詞（僅小類別） */}
          {mode === 'subcategory' && (
            <div className="space-y-4 border-t-2 border-gray-700 pt-4">
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-xs text-blue-300">
                💡 <strong>系統提示詞</strong>決定了 SubAgent 如何分析和整理這個類別的知識。你可以在這裡指定分析格式、重點關注項目等。
              </div>

              {/* 系統提示詞 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-purple-300 mb-2">
                  <span className="text-2xl">🤖</span>
                  <span>系統提示詞</span>
                  <span className="text-xs text-gray-500 font-normal">（可選 - 留空則使用 AI 生成的預設值）</span>
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-purple-700/30 rounded-lg text-gray-200 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                  rows={6}
                  placeholder="例如：整理技術學習筆記時，請重點標註：&#10;1. 核心概念和原理&#10;2. 實際應用場景&#10;3. 常見問題和解決方案&#10;4. 相關技術棧的關聯"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💬 你可以告訴 SubAgent 如何分析知識、採用什麼格式、關注哪些重點等
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
