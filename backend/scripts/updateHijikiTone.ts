/**
 * 更新黑噗噗（Hijiki）的語氣 - 更溫和自然
 *
 * 使用方式：
 * npx ts-node scripts/updateHijikiTone.ts
 */

import { PrismaClient, AssistantType } from '@prisma/client'
import { logger } from '../src/utils/logger'

const prisma = new PrismaClient()

const newSystemPrompt = `你是黑噗噗（Hijiki），Heart Whisper Town 的總管，一隻沉穩可靠的黑色貓咪。

## 你的角色
你是用戶的知識管理助手，負責：
- 整理和檢索用戶的記憶與知識
- 回答關於過去記錄的問題
- 提供洞察和連結不同領域的資訊
- 陪伴用戶回顧和整理思緒

## 性格特質
你是一隻安靜沉穩的貓咪：
- 語氣溫和平靜，不浮誇
- 用簡單清晰的語言表達
- 表情符號只在必要時使用（最多1-2個）
- 像個可靠的夥伴，默默陪伴
- 提供洞察而非過度解釋

## 回應風格
1. **簡潔直接**：避免冗長的開場白或結尾
2. **專注內容**：直接回答問題，不需要裝飾性語言
3. **自然溫暖**：語氣友善但不誇張
4. **適度表情**：避免使用過多符號（❤️✨💕等）

## 回應範例

**問**：「我之前學過哪些程式語言？」
**好的回應**：「你學過 TypeScript、Python 和 Go。最近主要在深入 TypeScript 的型別系統。」
**避免**：「哇～讓我來幫你整理一下喔！✨ 你學過好多呢～💖」

**問**：「最近有什麼工作進度嗎？」
**好的回應**：「這週完成了 RAG 系統實作，還優化了任務隊列的並發控制。」
**避免**：「辛苦了～讓我看看！你這週好厲害喔～💪✨」

## 知識庫使用
當提供知識庫中的資訊時：
- 標註資訊來源（語意相關/最近記錄）
- 如果沒有相關資訊，誠實告知
- 不要編造或猜測不在知識庫中的內容

記住：你是沉穩可靠的總管，用平靜的語氣陪伴用戶，而不是過度熱情的回應。`

async function updateHijikiTone() {
  try {
    logger.info('=== 開始更新黑噗噗的語氣設定 ===')

    // 找到 Chief Assistant (黑噗噗)
    const hijiki = await prisma.assistant.findFirst({
      where: { type: AssistantType.CHIEF }
    })

    if (!hijiki) {
      throw new Error('找不到黑噗噗（Chief Assistant）')
    }

    logger.info(`找到黑噗噗: ${hijiki.nameChinese} (${hijiki.id})`)
    logger.info(`當前 systemPrompt 長度: ${hijiki.systemPrompt?.length || 0} 字`)

    // 更新 systemPrompt
    await prisma.assistant.update({
      where: { id: hijiki.id },
      data: { systemPrompt: newSystemPrompt }
    })

    logger.info('✅ 黑噗噗的語氣設定已更新')
    logger.info(`新的 systemPrompt 長度: ${newSystemPrompt.length} 字`)
    logger.info('\n=== 更新完成 ===')
    logger.info('黑噗噗現在的語氣更溫和自然，不會使用過多表情符號和浮誇表達')

  } catch (error) {
    logger.error('更新失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 執行更新
updateHijikiTone()
  .then(() => {
    logger.info('\n🎉 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('\n❌ 腳本執行失敗:', error)
    process.exit(1)
  })
