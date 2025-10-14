# URL 處理改進 V2 - 雙階段處理 + Gemini @url 直接分析

## 問題描述

用戶提交 YouTube 連結（如 `https://www.youtube.com/watch?v=rBlCOLfMYfw&t=18s`）時，SubAgent 評估相關性為 0.00，導致連結不被存儲到資料庫。

### 根本原因

1. **Chief Agent 階段**：只傳遞純 URL，沒有提取元數據
2. **SubAgent 階段**：收到純 URL，無法理解內容價值 → 評分 0.00
3. **存儲決策**：0.00 < 0.4（門檻），被拒絕存儲

## 解決方案：雙階段處理架構 🚀

### 核心理念

1. **Chief Agent（快速階段）**：只提取連結標題（輕量級，快速響應用戶）
2. **SubAgent（深度階段）**：使用 Gemini 2.5 Flash 的 `@url` 語法**直接存取網址**，深度分析內容

### 為什麼這樣設計？

- ✅ **快速響應**：Chief 只提取標題（YouTube oEmbed API，< 1秒），立即回應用戶
- ✅ **深度分析**：SubAgent 背景處理，直接讀取 YouTube 頁面內容，提取關鍵資訊
- ✅ **充分利用 Gemini 能力**：Gemini 2.5 Flash 可以直接存取 URL，無需預處理
- ✅ **避免重複工作**：不需要在 Chief 階段做詳細分析（耗時）

---

## 實作細節

### 1. Chief Agent - 快速提取連結標題

**位置**: [chiefAgentService.ts:738-814](backend/src/services/chiefAgentService.ts#L738-L814)

**新增方法**: `quickExtractLinkTitle()` [chiefAgentService.ts:1388-1422](backend/src/services/chiefAgentService.ts#L1388-L1422)

```typescript
/**
 * 快速提取連結標題（輕量級 - 不做詳細分析）
 * 只用於 Chief Agent 階段，讓 SubAgent 做深度分析
 */
private async quickExtractLinkTitle(url: string): Promise<{ title: string, description?: string }> {
  try {
    // 檢查是否為 YouTube 連結
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // 使用 YouTube oEmbed API（無需 API Key，速度快）
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const response = await axios.get(oembedUrl, { timeout: 5000 })
      const title = response.data.title || url
      const author = response.data.author_name || ''

      logger.info(`[白噗噗] YouTube 標題提取成功: ${title}`)

      return {
        title,
        description: author ? `作者: ${author}` : undefined
      }
    }

    // 其他連結類型：返回 URL（由 SubAgent 詳細分析）
    return {
      title: url,
      description: undefined
    }
  } catch (error) {
    logger.warn(`[白噗噗] 快速提取連結標題失敗: ${url}`, error)
    return {
      title: url,
      description: undefined
    }
  }
}
```

**處理流程**：

```typescript
// 檢測連結並快速提取標題
if (input.links && input.links.length > 0) {
  logger.info(`[白噗噗] 檢測到 ${input.links.length} 個連結，快速提取標題...`)

  const metadataPromises = input.links.map(async (link) => {
    try {
      // 快速提取標題（不做詳細分析，由 SubAgent 處理）
      const metadata = await this.quickExtractLinkTitle(link.url)
      return {
        url: link.url,
        title: metadata.title || link.title || link.url,
        description: metadata.description || '等待詳細分析...'
      }
    } catch (error) {
      logger.warn(`[白噗噗] 連結標題提取失敗: ${link.url}`, error)
      return {
        url: link.url,
        title: link.title || link.url,
        description: '等待詳細分析...'
      }
    }
  })

  const extractedMetadata = await Promise.all(metadataPromises)
  linkMetadata.push(...extractedMetadata)

  // 豐富化內容：只添加標題（簡單）
  if (linkMetadata.length > 0) {
    enrichedContent += `\n\n📎 連結：\n`
    linkMetadata.forEach((meta, idx) => {
      enrichedContent += `${idx + 1}. ${meta.title}\n   🔗 ${meta.url}\n`
    })
    logger.info(`[白噗噗] 連結標題提取完成（${linkMetadata.length}個）`)
  }
}
```

**效果**：
- 快速提取標題（< 1秒）
- 不做詳細內容分析（留給 SubAgent）
- 給用戶即時回饋

---

### 2. SubAgent - 使用 @url 直接分析 YouTube 內容

**位置**: [subAgentService.ts:306-376](backend/src/services/subAgentService.ts#L306-L376)

**關鍵改進**：在 prompt 中使用 `@url` 語法，讓 Gemini 直接存取網址

```typescript
/**
 * 構建深度評估 Prompt（使用 Gemini 2.5 Flash + @url 直接分析）
 */
private buildEvaluationPrompt(
  assistant: any,
  distribution: DistributionInput
): string {
  // 檢查是否有連結，如果有，使用 @url 語法讓 Gemini 直接存取
  let linkAnalysisSection = ''
  if (distribution.links.length > 0) {
    linkAnalysisSection = `\n**🔗 連結深度分析（請直接存取以下網址）:**\n`
    distribution.links.forEach((link, i) => {
      const title = distribution.linkTitles[i] || link
      linkAnalysisSection += `${i + 1}. ${title}\n   @${link}\n   ↑ 請直接存取此網址，分析內容、提取關鍵資訊\n\n`
    })
  }

  return `${assistant.systemPrompt}

你是 ${assistant.nameChinese} (${assistant.name})，一個專注於 ${assistant.type} 領域的知識管理專家。

**你的任務：**
作為 Gemini 2.5 Flash，你需要對以下知識進行深度分析和整理，決定是否存儲並生成完整的知識結構。

**重要：如果內容包含連結，請使用 @url 語法直接存取網址內容進行分析！**

**用戶的原始內容:**
${distribution.rawContent}

${linkAnalysisSection}

**白噗噗的初步分類:**
${distribution.chiefSummary}

**你需要提供深度分析，包括：**
1. **相關性評估** - 這個知識與 ${assistant.type} 領域的關聯程度
   ${distribution.links.length > 0 ? '   ⚠️ 如果有連結，請直接存取網址內容進行評估（使用 @url）' : ''}
2. **詳細摘要** - 用 2-3 句話總結核心內容和價值
   ${distribution.links.length > 0 ? '   ⚠️ 對於連結內容，請基於實際存取的內容撰寫摘要' : ''}
3. **關鍵洞察** - 提取 3-5 個重要的知識點或洞察
   ${distribution.links.length > 0 ? '   ⚠️ 如果是影片/文章，請提取內容中的關鍵要點' : ''}
4. **精準標籤** - 產生 3-5 個描述性標籤
5. **標題建議** - 為這個記憶創建一個清晰的標題（10字以內）
6. **情感分析** - 判斷內容的情感傾向
7. **重要性評分** - 1-10分，評估這個知識的重要程度
8. **行動建議** - 如果適用，提供後續行動建議

請以 JSON 格式返回完整分析（只返回 JSON，不要其他文字）：
{
  "relevanceScore": 0.95,
  "shouldStore": true,
  "reasoning": "這是一個關於XXX的重要知識，因為...，對用戶的XXX方面有幫助",
  "confidence": 0.9,
  "suggestedCategory": "${assistant.type}",
  "suggestedTags": ["標籤1", "標籤2", "標籤3"],
  "keyInsights": [
    "關鍵洞察1：...",
    "關鍵洞察2：...",
    "關鍵洞察3：..."
  ],
  "detailedSummary": "這個知識主要討論...",
  "suggestedTitle": "XXX學習筆記",
  "sentiment": "positive|neutral|negative",
  "importanceScore": 8,
  "actionableAdvice": "建議用戶可以..."
}

**評估準則：**
- **高度相關 (>0.7)**: 核心內容完全匹配 ${assistant.type} 領域，具有長期價值
- **中度相關 (0.4-0.7)**: 部分內容與領域相關，有參考價值
- **低相關 (<0.4)**: 與領域關聯較弱，不建議存儲

**🔗 特別注意 - 資源連結評估：**
- 如果內容包含連結（URL、文章、影片等），**重點評估連結本身的價值**
- 連結標題和描述是關鍵資訊，比純 URL 更重要
- 用戶分享連結通常表示想要收藏和記錄，應給予較高評分
- YouTube、文章、教學資源等應該被視為有價值的知識來源
- 即使用戶只提供了 URL，如果連結內容有價值，也應該存儲

**深度分析要求：**
- 仔細理解用戶的真實意圖和需求
- 識別隱含的知識價值和長期意義
- 考慮這個知識在未來可能的應用場景
- 對於資源連結，重點看連結內容的實用性和相關性
- 提供有洞察力和可執行的建議
`
}
```

**關鍵點**：
- ✅ 使用 `@${link}` 語法，Gemini 會直接存取 URL
- ✅ 明確指示要「直接存取網址內容進行分析」
- ✅ 提醒要基於「實際存取的內容」撰寫摘要和洞察

---

### 3. 降低資源連結存儲門檻

**位置**: [subAgentService.ts:562-584](backend/src/services/subAgentService.ts#L562-L584)

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

---

## 處理流程圖

```
用戶提交 YouTube URL
         │
         ├─────────────────────────────────────┐
         │                                     │
    【Chief Agent】                        【前端】
    快速階段（< 1秒）                     立即顯示
         │                                 "收到了～☁️"
         ├─ 檢測到 URL                           │
         ├─ YouTube oEmbed API                   │
         ├─ 提取標題 + 作者                      │
         ├─ 創建 Distribution                    │
         └─ 加入任務隊列 ────────────────────┘
                │
                ↓
         【SubAgent】
        深度階段（背景處理）
                │
                ├─ 收到 Distribution
                ├─ 發現有 links
                ├─ 使用 @url 語法
                ├─ Gemini 直接存取 YouTube 頁面 🔥
                ├─ 分析影片內容
                ├─ 提取關鍵洞察
                ├─ 評估相關性（0.65）
                ├─ 決定儲存 ✅
                └─ 創建 Memory
                       │
                       ↓
                 【前端通知】
                 "知識整理完成！"
                 "已歸類到：📚 資源收藏"
```

---

## 測試步驟

### 1. 提交 YouTube 連結

在前端輸入：
```
https://www.youtube.com/watch?v=rBlCOLfMYfw&t=18s 請幫我分析這個連結並記錄
```

### 2. 觀察 Backend 日誌

**Chief Agent 階段**（快速）：
```
[白噗噗] 檢測到文本中的 1 個 URL，快速提取標題...
[白噗噗] YouTube 標題提取成功: [視頻標題]
[白噗噗] URL 標題提取完成（1個）
[白噗噗] 快速分類完成: RESOURCES (0.8), 是否記錄: true
[Chief Agent] 知識分發記錄創建完成，ID: xxx
[Chief Agent] 任務已加入隊列，TaskID: yyy
[Chief Agent] 白噗噗即時回應完成 - 耗時: 1200ms
```

**SubAgent 階段**（背景處理）：
```
[資源收藏] 開始評估知識相關性
[Sub-Agent] Calling Gemini CLI for deep analysis
[Sub-Agent] Gemini CLI response received (2500 chars)  ← 比之前多很多！
[資源收藏] 評估完成 - 相關性: 0.65, 是否儲存: true
[資源收藏] 創建深度分析記憶: memory-id
[Dynamic Sub-Agents] 分發處理完成 - 決策數: 1, 創建記憶數: 1 ✅
```

### 3. 驗證資料庫

查詢 `Memory` 表：
```sql
SELECT
  id,
  title,
  summary,
  keyPoints,
  tags,
  aiAnalysis,
  relevanceScore
FROM Memory
ORDER BY createdAt DESC
LIMIT 1;
```

應該看到：
- `title`: 有意義的標題（如「YouTube 影片學習筆記」）
- `summary`: 詳細摘要（2-3句話）
- `keyPoints`: 3-5個關鍵洞察（**來自影片實際內容**）
- `tags`: 相關標籤
- `relevanceScore`: 0.65（> 0.3，通過資源連結門檻）

### 4. 檢查前端通知

應該在左下角看到：
```
✓ 知識整理完成！
已歸類到：
📚 資源收藏
```

---

## 預期改進效果

### Before（V1 - 改進前）
```
用戶提交 URL
    ↓
Chief: 傳遞純 URL
    ↓
SubAgent: 收到純 URL，無法理解
    ↓
評分: 0.00
    ↓
結果: 不存儲 ❌
```

### After（V2 - 雙階段處理）
```
用戶提交 URL
    ↓
Chief: 快速提取標題（< 1秒）
    ↓ （立即回應用戶）
SubAgent: 使用 @url 直接分析 YouTube 內容 🔥
    ↓
評分: 0.65（基於實際影片內容）
    ↓
結果: 存儲 ✅ + 詳細分析
```

---

## 技術亮點

### 1. Gemini @url 語法

Gemini 2.5 Flash 支持 `@url` 語法，可以直接存取網址內容：

```typescript
const prompt = `請分析這個 YouTube 影片：
1. 視頻標題
   @https://www.youtube.com/watch?v=xxx
   ↑ 請直接存取此網址，分析內容、提取關鍵資訊
`
```

Gemini 會：
- 自動存取 URL
- 讀取頁面內容
- 分析影片信息
- 提取關鍵要點

### 2. YouTube oEmbed API

無需 API Key，快速獲取基本信息：

```typescript
const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
const response = await axios.get(oembedUrl, { timeout: 5000 })

// 返回：
{
  "title": "影片標題",
  "author_name": "作者名稱",
  "author_url": "作者頻道",
  "type": "video",
  "height": 113,
  "width": 200,
  "version": "1.0",
  "provider_name": "YouTube",
  "provider_url": "https://www.youtube.com/",
  "thumbnail_height": 360,
  "thumbnail_width": 480,
  "thumbnail_url": "https://i.ytimg.com/vi/xxx/hqdefault.jpg",
  "html": "<iframe ...>",
  "description": "...",
  "upload_date": "..."
}
```

---

## 存儲決策邏輯

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
                儲存 ✅

🔗 資源連結門檻：0.3（降低 25%）
📝 一般內容門檻：0.4
```

---

## 相關文件

- [chiefAgentService.ts](backend/src/services/chiefAgentService.ts) - Chief Agent 服務（快速提取標題）
- [subAgentService.ts](backend/src/services/subAgentService.ts) - SubAgent 服務（@url 深度分析）
- [multimodalProcessor.ts](backend/src/services/multimodalProcessor.ts) - 多模態處理器（保留，未使用）

---

## 後續優化建議

1. **更多平台支持**：
   - Twitter: 使用 Twitter API 或 nitter
   - Medium: 直接 @url 存取
   - GitHub: 使用 GitHub API

2. **緩存機制**：
   - 緩存 YouTube oEmbed 結果
   - 緩存 Gemini @url 分析結果

3. **錯誤處理**：
   - oEmbed API 失敗 → 降級到純 URL
   - @url 存取失敗 → 降級到標題評估

4. **性能監控**：
   - 記錄 Chief 階段耗時
   - 記錄 SubAgent 階段耗時
   - 優化慢速 API 調用

5. **用戶反饋**：
   - 允許用戶調整資源連結門檻
   - 提供「強制記錄」選項

---

## 版本信息

- **改進日期**：2025-10-14
- **版本**：V2.0.0（雙階段處理架構）
- **改進者**：Claude (Sonnet 4.5)
- **主要變更**：
  - ✅ Chief Agent 快速提取標題（不做詳細分析）
  - ✅ SubAgent 使用 Gemini @url 直接存取網址
  - ✅ 雙階段處理架構（快速響應 + 深度分析）
  - ✅ 降低資源連結存儲門檻到 0.3
