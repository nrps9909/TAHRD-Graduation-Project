# Markdown 編輯器技術債報告

## 🔴 嚴重問題（Critical）

### 1. **文件上傳僅使用 Blob URL（MemoryEditor）**
- **位置**: `MemoryEditor.tsx:225, 250, 277`
- **問題**: 使用 `URL.createObjectURL()` 創建的 Blob URL 只在當前會話有效
- **後果**:
  - 刷新頁面後圖片會丟失
  - 圖片沒有實際上傳到服務器
  - 無法分享給其他用戶
- **修復**: 需要實現真正的文件上傳到服務器（S3/Cloudflare/本地存儲）

### 2. **潛在的無限遞歸（SimpleMemoryEditor）**
- **位置**: `SimpleMemoryEditor.tsx:226-250 handleClose()`
- **問題**: 遞歸調用 `handleClose()` 等待保存完成
- **風險**: 在極端情況下可能導致調用棧溢出
- **修復**: 使用 Promise 或 async/await 模式

### 3. **handleClose 不等待保存完成（MemoryEditor）**
- **位置**: `MemoryEditor.tsx:155-172`
- **問題**: 調用 `autoSave()` 但沒有 `await`，直接關閉
- **後果**: 用戶可能丟失最後的更改
- **修復**: 添加 `await autoSave()` 並顯示保存進度

## 🟠 重要問題（High Priority）

### 4. **未使用的代碼和導入**
**SimpleMemoryEditor.tsx:**
- `onSuccess` prop 未使用（line 13, 18）
- `fileInputRef` 聲明但未使用（line 42）
- `createMemoryDirect` mutation 未使用（line 54）

**修復**: 移除或實現這些功能

### 5. **分類選擇邏輯不一致**
- **MemoryEditor**: 無法取消選擇（line 477, 609）
- **SimpleMemoryEditor**: 可以 toggle（line 408, 537）
- **修復**: 統一為 toggle 邏輯

```typescript
// 應該統一為：
onClick={() => setSubcategoryId(subcategoryId === cat.id ? null : cat.id)}
```

### 6. **缺少錯誤處理和用戶反饋（MemoryEditor）**
缺少：
- `saveError` 狀態
- `hasUnsavedChanges` 狀態
- 保存失敗時的視覺反饋

### 7. **組件卸載時沒有自動保存**
- **SimpleMemoryEditor**: 有 `beforeunload` 但沒有組件卸載保存
- **MemoryEditor**: 兩者都缺少
- **風險**: 路由切換時可能丟失數據

**修復**: 添加 useEffect cleanup 保存邏輯

```typescript
useEffect(() => {
  return () => {
    // 組件卸載時保存
    if (hasUnsavedChanges && memoryId) {
      autoSave()
    }
  }
}, [])
```

## 🟡 中等問題（Medium Priority）

### 8. **缺少初始加載狀態**
- **SimpleMemoryEditor**: `memoryLoading` 時沒有 spinner
- **用戶體驗**: 看到空白編輯器，不知道正在加載

### 9. **Split 視圖標籤輸入缺少 onBlur**
- **MemoryEditor.tsx:657**: 缺少 `onBlur={handleTagBlur}`
- **後果**: 用戶離開輸入框時標籤不會自動添加

### 10. **缺少手動保存快捷鍵（MemoryEditor）**
- SimpleMemoryEditor 有 Cmd+S（line 258-263）
- MemoryEditor 缺少
- **統一性**: 兩個編輯器應該有相同的快捷鍵

### 11. **保存狀態顯示不一致**
**SimpleMemoryEditor**: 詳細的狀態顯示
```
- 儲存中... （黃色）
- 儲存失敗 （紅色）
- 未保存 （灰色）
- 已保存 + 時間戳
```

**MemoryEditor**: 只有兩種狀態
```
- 儲存中...
- 已儲存
```

## 🔵 代碼質量問題（Code Quality）

### 12. **大量代碼重複**

#### 在同一文件內（3 個視圖模式）
每個編輯器都在 `edit`, `preview`, `split` 模式中重複：
- 標題輸入（~15 行 × 3）
- 分類選擇器（~25 行 × 3）
- 標籤管理（~30 行 × 3）

**影響**:
- 維護困難：修改一處要改三處
- 容易產生不一致（如上述的 onBlur 缺失）

#### 在兩個文件之間
SimpleMemoryEditor 和 MemoryEditor 有 80% 的代碼重複

**建議重構**:
```typescript
// 提取共用組件
<EditorHeader
  title={title}
  isSaving={isSaving}
  onClose={handleClose}
  onSave={saveImmediately}
/>

<CategorySelector
  subcategories={subcategories}
  selected={subcategoryId}
  onChange={setSubcategoryId}
/>

<TagManager
  tags={tags}
  onAdd={handleAddTag}
  onRemove={handleRemoveTag}
/>

<MarkdownEditor
  content={content}
  onChange={setContent}
  viewMode={viewMode}
  onPaste={handlePaste}
  onDrop={handleDrop}
/>
```

### 13. **缺少 TypeScript 嚴格類型**
```typescript
// ❌ 當前
const [attachments, setAttachments] = useState<Array<{url: string, name: string, type: string}>>([])

// ✅ 應該定義類型
interface Attachment {
  url: string
  name: string
  type: string
  size?: number
  uploadedAt?: Date
}
```

### 14. **Magic Numbers**
```typescript
// ❌
setTimeout(() => autoSave(), 100)
setTimeout(() => autoSave(), 800)
await new Promise(resolve => setTimeout(resolve, 1000))

// ✅ 應該定義常量
const SAVE_RETRY_DELAY = 100
const AUTO_SAVE_DEBOUNCE = 800
const SAVE_TIMEOUT = 1000
```

## ⚡ 性能問題（Performance）

### 15. **ReactMarkdown 在每次輸入時重新渲染**
- **位置**: Preview 和 Split 模式
- **問題**: 沒有 memo 或 debounce
- **影響**: 在長文檔中輸入會卡頓

**修復**:
```typescript
const debouncedContent = useDebounce(content, 300)

<ReactMarkdown>
  {debouncedContent}
</ReactMarkdown>
```

### 16. **標題輸入沒有 debounce**
- 每次輸入都觸發 autoSave 的 debounce 重置
- 建議對標題也加 debounce

### 17. **Split 模式同步滾動計算開銷**
```typescript
// 每次滾動都計算
const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight)
```
- 應該使用 `throttle` 而不是每次都計算

## 🎯 功能缺失（Missing Features）

### 18. **缺少 Markdown 快捷鍵**
- 無 Cmd+B（加粗）
- 無 Cmd+I（斜體）
- 無 Cmd+K（插入連結）
- 無 Tab 縮進支持

### 19. **缺少撤銷/重做功能**
- 瀏覽器原生的 Cmd+Z 可能與自動保存衝突

### 20. **缺少字數統計**
- 專業編輯器都有字數/字符數統計

### 21. **缺少全螢幕模式**
- 長文編輯時需要

### 22. **缺少快捷鍵提示**
- 用戶不知道有哪些快捷鍵可用

## ♿ 無障礙性問題（Accessibility）

### 23. **按鈕缺少 aria-label**
```typescript
// ❌ 當前
<button onClick={handleClose}>
  <svg>...</svg>
</button>

// ✅ 應該
<button onClick={handleClose} aria-label="關閉編輯器">
  <svg aria-hidden="true">...</svg>
</button>
```

### 24. **缺少鍵盤導航**
- 無法用 Tab 在工具列按鈕間切換
- 缺少 focus 樣式

### 25. **缺少螢幕閱讀器支持**
- 保存狀態變化沒有 `aria-live` 公告
- 缺少 `role` 屬性

## 📊 建議的優先級修復順序

### Phase 1: 緊急修復（本週）
1. ✅ 修復文件上傳只用 Blob URL 的問題
2. ✅ 統一分類選擇邏輯
3. ✅ 修復 handleClose 等待邏輯
4. ✅ 添加組件卸載自動保存

### Phase 2: 重要改進（下週）
5. 移除未使用代碼
6. 添加錯誤處理和用戶反饋
7. 添加初始加載狀態
8. 統一保存狀態顯示

### Phase 3: 代碼重構（2週）
9. 提取共用組件
10. 添加 TypeScript 嚴格類型
11. 消除 Magic Numbers
12. 優化性能（debounce, memo）

### Phase 4: 功能增強（1個月）
13. 添加 Markdown 快捷鍵
14. 添加字數統計
15. 添加全螢幕模式
16. 改進無障礙性

## 🛠️ 快速修復清單

創建獨立的 issue 追蹤每個問題，並使用以下標籤：
- `🔴 critical`: 嚴重問題
- `🟠 high`: 重要問題
- `🟡 medium`: 中等問題
- `🔵 refactor`: 代碼重構
- `⚡ performance`: 性能優化
- `♿ a11y`: 無障礙性

---
**報告生成時間**: 2025-10-10
**審查者**: Claude Code
