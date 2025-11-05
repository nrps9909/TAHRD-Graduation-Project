/**
 * Category Edit Modal - 編輯模態窗口
 * 包含 AI 自動生成 Prompt 功能
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MutationFunction } from '@apollo/client'
import {
  Island,
} from '../graphql/category'

// 表單數據類型
interface FormData {
  nameChinese: string
  color: string
  description: string
  name?: string
}

// 提交數據類型
interface IslandSubmitData {
  name: string
  nameChinese: string
  color: string
  description?: string
}

interface EditModalProps {
  editState: {
    island?: Island
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
  islands: _islands,
  onClose,
  onCreate,
  onUpdate,
  onRefetch,
}) => {
  const { island, isNew } = editState

  // 表單狀態
  const [formData, setFormData] = useState<FormData>({
    nameChinese: '',
    color: '',
    description: '',
  })

  // 初始化表單數據
  useEffect(() => {
    if (!isNew && island) {
      setFormData({
        nameChinese: island.nameChinese || '',
        color: island.color || '#FFB3D9',
        description: island.description || '',
      })
    } else if (isNew) {
      // 新增時的預設值
      setFormData({
        nameChinese: '',
        color: '#FFB3D9',
        description: '',
      })
    }
  }, [island, isNew])

  // 提交表單
  const handleSubmit = async () => {
    if (!formData.nameChinese.trim()) {
      alert('請輸入名稱')
      return
    }

    try {
      // 準備提交數據
      let submitData: IslandSubmitData

      if (isNew) {
        // 首次創建：提交名稱和可選的描述提示，讓後端 AI 根據提示生成更精準的內容（包括 emoji）
        submitData = {
          name: formData.nameChinese,
          nameChinese: formData.nameChinese,
          color: formData.color || '#FFB3D9',
          // 如果使用者有填寫描述，作為 AI 生成的提示
          ...(formData.description.trim() && { description: formData.description.trim() }),
        } as IslandSubmitData
      } else {
        // 編輯：提交所有欄位（使用者可能已修改，但 emoji 不可更改）
        submitData = {
          name: formData.nameChinese,
          nameChinese: formData.nameChinese,
          color: formData.color,
          description: formData.description,
        } as IslandSubmitData
      }

      if (isNew) {
        await onCreate({
          variables: { input: submitData },
        })
      } else {
        await onUpdate({
          variables: {
            id: island!.id,
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

  const title = isNew ? '新增島嶼' : '編輯島嶼'

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
              輸入名稱後，AI 會自動生成 emoji 和描述。你可以選擇性地在「描述」欄位輸入一些提示（例如：我女朋友），讓 AI 生成更精準的內容。創建後隨時可編輯。
            </div>
          )}

          {/* 基本資訊 */}
          <div className="space-y-4">
            {/* 名稱 */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                島嶼名稱 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nameChinese}
                onChange={(e) => setFormData((prev) => ({ ...prev, nameChinese: e.target.value }))}
                className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-gray-200 text-lg focus:border-[#d8c47e] focus:outline-none transition-colors"
                placeholder="例如：學習成長"
                autoFocus
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                描述
                {isNew && <span className="text-xs text-purple-400 ml-2 font-normal">（可選：輸入提示讓 AI 生成更精準）</span>}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-[#1E1E1E] border-2 border-gray-700 rounded-lg text-gray-200 focus:border-[#d8c47e] focus:outline-none resize-none"
                rows={3}
                placeholder={isNew ? '（可選）輸入一些提示，例如：我女朋友、工作相關、學習筆記等...' : '簡短說明這個分類的用途'}
              />
            </div>

            {/* 顏色 */}
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
