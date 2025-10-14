# URL 處理改進 - 解決 YouTube 連結零相關性問題

## 問題描述

用戶提交 YouTube 連結（如 `https://www.youtube.com/watch?v=rBlCOLfMYfw&t=18s`）時，SubAgent 評估相關性為 0.00，導致連結不被存儲到資料庫。

### 根本原因

1. **Chief Agent 階段**：只傳遞純 URL，沒有提取元數據
2. **SubAgent 階段**：收到純 URL，無法理解內容價值 → 評分 0.00
3. **存儲決策**：0.00 < 0.4（門檻），被拒絕存儲

## 解決方案

### 1. Chief Agent - URL 元數據提取

**位置**: `backend/src/services/chiefAgentService.ts`

在 `quickClassifyForTororo()` 方法中添加 URL 元數據提取：

```typescript
// 檢測連結並提取元數據
if (input.links && input.links.length > 0) {
  logger.info(`[白噗噗] 檢測到 ${input.links.length} 個連結，開始提取元數據...`)

  const metadataPromises = input.links.map(async (link) => {
    try {
      const metadata = await multimodalProcessor.processLink(link.url, input.content)
      return {
        url: link.url,
        title: metadata.title || link.title || link.url,
        description: metadata.summary || metadata.description || '無描述'
      }
    } catch (error) {
      logger.warn(`[白噗噗] 連結元數據提取失敗: ${link.url}`, error)
      return {
        url: link.url,
        title: link.title || link.url,
        description: '無法提取元數據'
      }
    }
  })

  const extractedMetadata = await Promise.all(metadataPromises)
  linkMetadata.push(...extractedMetadata)

  // 豐富化內容：將連結元數據加入 prompt
  if (linkMetadata.length > 0) {
    enrichedContent += `\n\n📎 連結詳細資訊：\n`
    linkMetadata.forEach((meta, idx) => {
      enrichedContent += `${idx + 1}. ${meta.title}\n   ${meta.description}\n   🔗 ${meta.url}\n`
    })
    logger.info(`[白噗噗] 連結元數據提取完成，已豐富化內容`)
  }
}
```

**效果**：
- 自動檢測 `input.links` 或文本中的 URL
- 調用 `multimodalProcessor.processLink()` 提取標題和描述
- 將元數據附加到原始內容，傳給 SubAgent

### 2. SubAgent - 改進評估 Prompt

**位置**: `backend/src/services/subAgentService.ts`

在 `buildEvaluationPrompt()` 和 `buildDynamicEvaluationPrompt()` 中添加：

```typescript
**🔗 特別注意 - 資源連結評估：**
- 如果內容包含連結（URL、文章、影片等），**重點評估連結本身的價值**
- 連結標題和描述是關鍵資訊，比純 URL 更重要
- 用戶分享連結通常表示想要收藏和記錄，應給予較高評分
- YouTube、文章、教學資源等應該被視為有價值的知識來源
- 即使用戶只提供了 URL，如果連結內容有價值，也應該存儲
```

**效果**：
- 指導 AI 重點看連結標題和描述
- 提高對資源連結的評分

### 3. SubAgent - 降低資源連結存儲門檻

**位置**: `backend/src/services/subAgentService.ts` 的 `shouldStoreKnowledge()` 方法

```typescript
// 檢查是否為資源連結（有 links 或 linkTitles）
const isResourceLink = distribution && (
  (Array.isArray(distribution.links) && distribution.links.length > 0) ||
  (Array.isArray(distribution.linkTitles) && distribution.linkTitles.length > 0)
)

// 規則 2: 低相關性 → 檢查是否為資源連結
if (relevanceScore < 0.4) {
  // 🔗 特殊處理：資源連結降低門檻到 0.3
  if (isResourceLink && relevanceScore >= 0.3) {
    logger.info(`[Storage Decision] 資源連結特殊處理 - 相關性 (${relevanceScore.toFixed(2)}) ≥ 0.3 → 儲存`)
    return true
  }

  logger.info(`[Storage Decision] 低相關性 (${relevanceScore.toFixed(2)}) → 不儲存`)
  return false
}
```

**效果**：
- 一般內容：門檻 0.4
- 資源連結：門檻 0.3（降低 25%）
- 避免過度保守，確保有價值的連結被保存

## 測試步驟

### 1. 提交 YouTube 連結

在前端輸入：
```
https://www.youtube.com/watch?v=rBlCOLfMYfw&t=18s 請幫我分析這個連結並記錄
```

### 2. 觀察 Backend 日誌

應該看到：
```
[白噗噗] 檢測到 1 個連結，開始提取元數據...
[MultimodalProcessor] 使用 Gemini CLI 分析链接: https://www.youtube.com/watch?v=rBlCOLfMYfw&t=18s
[MultimodalProcessor] 处理 YouTube 链接: https://www.youtube.com/watch?v=rBlCOLfMYfw&t=18s
[MultimodalProcessor] YouTube 元数据获取成功: [視頻標題]
[白噗噗] 連結元數據提取完成，已豐富化內容
[白噗噗] 快速分類完成: RESOURCES (0.8), 是否記錄: true
[Chief Agent] 知識分發記錄創建完成，ID: xxx
[資源收藏] 開始評估知識相關性
[資源收藏] 評估完成 - 相關性: 0.65, 是否儲存: true
[Dynamic Sub-Agents] 分發處理完成 - 決策數: 1, 創建記憶數: 1
```

### 3. 驗證資料庫

查詢 `KnowledgeDistribution` 表：
```sql
SELECT
  id,
  rawContent,
  linkTitles,
  chiefSummary,
  (SELECT COUNT(*) FROM Memory WHERE distributionId = KnowledgeDistribution.id) as memoryCount
FROM KnowledgeDistribution
ORDER BY createdAt DESC
LIMIT 5;
```

應該看到：
- `linkTitles` 包含 YouTube 視頻標題（不是純 URL）
- `rawContent` 包含豐富化的內容（標題 + 描述）
- `memoryCount = 1`（已創建記憶）

### 4. 檢查前端通知

應該在左下角看到：
```
✓ 知識整理完成！
已歸類到：
📚 資源收藏
```

## 技術細節

### MultimodalProcessor

使用 Gemini CLI 的 `@url` 語法和 YouTube oEmbed API：

```typescript
// YouTube 特殊處理
private async processYouTubeLink(url: string, context?: string): Promise<LinkAnalysis> {
  // 提取視頻 ID
  const videoId = this.extractYouTubeVideoId(url)

  // 使用 oEmbed API 獲取元數據（無需 API Key）
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const response = await axios.get(oembedUrl, { timeout: 10000 })
  const metadata = response.data

  const title = metadata.title || 'YouTube 视频'
  const author = metadata.author_name || '未知作者'

  // 使用 Gemini 生成摘要
  const analysis = await this.callGeminiCLI(analysisPrompt)

  return {
    title,
    description: `作者: ${author}`,
    summary: analysis.summary,
    tags: ['YouTube', 'video', ...analysis.tags],
    url
  }
}
```

### 存儲決策邏輯

```
              相關性評分
                 │
          ┌──────┴──────┐
          │             │
      ≥ 0.7          < 0.7
      儲存             │
                 ┌─────┴─────┐
                 │           │
            0.4-0.7       < 0.4
            參考 AI         │
            建議      ┌─────┴─────┐
                     │           │
                是資源連結    普通內容
                     │           │
                ≥ 0.3       不儲存
                儲存
```

## 預期改進效果

### Before（改進前）
- YouTube 連結 → 相關性 0.00 → **不存儲** ❌
- 用戶看不到任何記錄

### After（改進後）
- YouTube 連結 → 提取標題和描述 → 相關性 0.65 → **存儲** ✅
- 用戶看到完整的記錄，包含：
  - 視頻標題
  - 作者信息
  - AI 生成的摘要
  - 相關標籤

## 相關文件

- `backend/src/services/chiefAgentService.ts` - Chief Agent 服務（URL 元數據提取）
- `backend/src/services/subAgentService.ts` - SubAgent 服務（評估邏輯改進）
- `backend/src/services/multimodalProcessor.ts` - 多模態處理器（YouTube 連結處理）

## 後續優化建議

1. **緩存連結元數據**：避免重複提取相同 URL
2. **批量處理**：對多個連結並行提取元數據
3. **錯誤處理**：當 YouTube oEmbed API 失敗時的降級方案
4. **用戶反饋**：允許用戶調整資源連結的存儲門檻
5. **更多平台支持**：擴展到 Twitter、Medium、GitHub 等平台的專用處理

## 版本信息

- 改進日期：2025-10-14
- 版本：v1.1.0
- 改進者：Claude (Sonnet 4.5)
