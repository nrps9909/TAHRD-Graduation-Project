-- 新增共享記憶表格
-- 用於儲存 NPC 之間共享的記憶

-- NPC 共享記憶表
CREATE TABLE IF NOT EXISTS "SharedMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL, -- 'player_interaction', 'npc_conversation', 'world_event'
    "content" TEXT NOT NULL,
    "summary" TEXT, -- AI 生成的記憶摘要
    "emotionalTone" TEXT, -- 情緒標記
    "importance" DECIMAL(3,2) DEFAULT 0.5, -- 0-1 重要性分數
    "participants" TEXT[], -- 參與者 ID 列表
    "tags" TEXT[], -- 標籤（用於快速檢索）
    "embedding" vector(1536), -- 向量嵌入（用於語義搜尋）
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER DEFAULT 0
);

-- NPC 記憶關聯表（哪些 NPC 知道這個記憶）
CREATE TABLE IF NOT EXISTS "NPCMemoryAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "npcId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "accessLevel" TEXT DEFAULT 'knows', -- 'experienced', 'knows', 'heard'
    "personalNote" TEXT, -- NPC 對此記憶的個人註解
    "emotionalImpact" DECIMAL(3,2) DEFAULT 0, -- -1 到 1
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE CASCADE,
    FOREIGN KEY ("memoryId") REFERENCES "SharedMemory"("id") ON DELETE CASCADE,
    UNIQUE("npcId", "memoryId")
);

-- 會話上下文快取表
CREATE TABLE IF NOT EXISTS "ConversationContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionMessages" JSONB NOT NULL, -- 當前會話的所有訊息
    "relevantMemories" TEXT[], -- 相關記憶 ID
    "npcMood" TEXT,
    "relationshipSnapshot" JSONB, -- 關係狀態快照
    "lastUpdated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

-- 索引優化
CREATE INDEX IF NOT EXISTS "SharedMemory_type_idx" ON "SharedMemory"("type");
CREATE INDEX IF NOT EXISTS "SharedMemory_participants_idx" ON "SharedMemory" USING GIN("participants");
CREATE INDEX IF NOT EXISTS "SharedMemory_tags_idx" ON "SharedMemory" USING GIN("tags");
CREATE INDEX IF NOT EXISTS "SharedMemory_importance_idx" ON "SharedMemory"("importance" DESC);
CREATE INDEX IF NOT EXISTS "SharedMemory_createdAt_idx" ON "SharedMemory"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "NPCMemoryAccess_npcId_idx" ON "NPCMemoryAccess"("npcId");
CREATE INDEX IF NOT EXISTS "NPCMemoryAccess_memoryId_idx" ON "NPCMemoryAccess"("memoryId");
CREATE INDEX IF NOT EXISTS "ConversationContext_conversationId_idx" ON "ConversationContext"("conversationId");

-- 向量搜尋函數（找出語義相似的記憶）
CREATE OR REPLACE FUNCTION search_similar_memories(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        sm.content,
        1 - (sm.embedding <=> query_embedding) AS similarity
    FROM "SharedMemory" sm
    WHERE 1 - (sm.embedding <=> query_embedding) > match_threshold
    ORDER BY sm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;