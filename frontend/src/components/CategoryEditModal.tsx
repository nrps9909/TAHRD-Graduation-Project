/**
 * Category Edit Modal - 編輯模態窗口
 * 包含 AI 自動生成 Prompt 功能
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLazyQuery } from '@apollo/client'
import {
  GENERATE_ISLAND_PROMPT,
  GENERATE_SUBCATEGORY_PROMPT,
  Island,
  Subcategory,
} from '../graphql/category'

interface EditModalProps {
  editState: {
    mode: 'island' | 'subcategory'
    island?: Island
    subcategory?: Subcategory
    isNew: boolean
  }
  islands: Island[]
  onClose: () => void
  onCreate: any
  onUpdate: any
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
  const [formData, setFormData] = useState<any>({
    nameChinese: '',
    emoji: '',
    color: '',
    description: '',
    keywords: [] as string[],
    systemPrompt: '',
    personality: '',
    chatStyle: '',
    islandId: '',
  })

  const [keywordInput, setKeywordInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

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
      setShowAdvanced(true) // 編輯時預設展開進階設定
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
          setFormData({
            ...formData,
            description: data.generateIslandPrompt.description,
            keywords: data.generateIslandPrompt.keywords,
          })
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
          setFormData({
            ...formData,
            description: data.generateSubcategoryPrompt.description,
            keywords: data.generateSubcategoryPrompt.keywords,
            systemPrompt: data.generateSubcategoryPrompt.systemPrompt,
            personality: data.generateSubcategoryPrompt.personality,
            chatStyle: data.generateSubcategoryPrompt.chatStyle,
          })
          setShowAdvanced(true) // 自動展開進階設定
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

  // 新增關鍵字
  const addKeyword = () => {
    const keyword = keywordInput.trim()
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keyword],
      })
      setKeywordInput('')
    }
  }

  // 移除關鍵字
  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_: any, i: number) => i !== index),
    })
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

    // 小類別必須有 systemPrompt, personality, chatStyle
    if (mode === 'subcategory') {
      if (!formData.systemPrompt.trim()) {
        alert('請輸入系統提示詞（或使用 AI 生成）')
        return
      }
      if (!formData.personality.trim()) {
        alert('請輸入個性設定（或使用 AI 生成）')
        return
      }
      if (!formData.chatStyle.trim()) {
        alert('請輸入對話風格（或使用 AI 生成）')
        return
      }
    }

    try {
      if (isNew) {
        await onCreate({
          variables: {
            input: {
              ...formData,
              name: formData.nameChinese, // 英文名稱設為與中文相同
            },
          },
        })
      } else {
        const id = mode === 'island' ? island!.id : subcategory!.id
        await onUpdate({
          variables: {
            id,
            input: formData,
          },
        })
      }

      await onRefetch()
      alert(isNew ? '創建成功！' : '更新成功！')
      onClose()
    } catch (error) {
      console.error('操作失敗:', error)
      alert('操作失敗，請查看控制台')
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
            <h4 className="font-semibold text-gray-200 text-sm">基本資訊</h4>

            {/* 名稱 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                名稱 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nameChinese}
                onChange={(e) => setFormData({ ...formData, nameChinese: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                placeholder={mode === 'island' ? '例如：學習成長島' : '例如：技術學習'}
              />
            </div>

            {/* 表情符號和顏色 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">表情符號</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-2xl text-center focus:border-[#d8c47e] focus:outline-none"
                  placeholder="🏝️"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">顏色</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-[42px] bg-[#1E1E1E] border border-gray-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* 島嶼選擇（僅小類別） */}
            {mode === 'subcategory' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  所屬島嶼 <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.islandId}
                  onChange={(e) => setFormData({ ...formData, islandId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                >
                  {islands.map((island) => (
                    <option key={island.id} value={island.id}>
                      {island.emoji} {island.nameChinese}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* AI 生成按鈕 */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h5 className="font-semibold text-purple-300 text-sm">✨ AI 智能生成</h5>
                  <p className="text-xs text-gray-400 mt-1">
                    根據名稱自動生成描述和關鍵字
                    {mode === 'subcategory' && '，以及 AI 助手設定'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.nameChinese.trim()}
                className={`w-full mt-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isGenerating || !formData.nameChinese.trim()
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'
                }`}
              >
                {isGenerating ? '⏳ AI 生成中...' : '✨ 使用 AI 生成'}
              </button>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none resize-none"
                rows={2}
                placeholder="簡短說明這個分類的用途..."
              />
            </div>

            {/* 關鍵字 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">關鍵字（用於自動分類）</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                  placeholder="輸入關鍵字後按 Enter"
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-[#d8c47e] text-[#191919] rounded-lg hover:bg-[#e0cc86] transition-colors"
                >
                  新增
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.keywords.length === 0 && (
                  <span className="text-xs text-gray-500">尚無關鍵字</span>
                )}
              </div>
            </div>
          </div>

          {/* 進階設定（僅小類別） */}
          {mode === 'subcategory' && (
            <div className="space-y-4 border-t border-gray-800 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-200"
              >
                <span>{showAdvanced ? '▼' : '▶'}</span>
                <span>AI 助手設定</span>
                <span className="text-red-400">*</span>
                <span className="text-xs text-gray-500 font-normal">
                  （可使用 AI 生成）
                </span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 pl-6">
                  {/* 系統提示詞 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      系統提示詞 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none resize-none font-mono text-sm"
                      rows={4}
                      placeholder="AI 助手的角色定位和職責..."
                    />
                  </div>

                  {/* 個性設定 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      個性設定 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personality}
                      onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                      placeholder="AI 的性格特點..."
                    />
                  </div>

                  {/* 對話風格 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      對話風格 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.chatStyle}
                      onChange={(e) => setFormData({ ...formData, chatStyle: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none"
                      placeholder="如何與用戶互動..."
                    />
                  </div>
                </div>
              )}
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
