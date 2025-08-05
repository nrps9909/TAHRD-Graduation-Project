-- 增強記憶功能的數據庫擴展
-- 這個文件包含了 NPC 記憶系統和 NPC 間交流的額外表格

-- NPC 記憶系統表
CREATE TABLE npc_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL, -- 'conversation', 'event', 'emotion', 'relationship_change'
    content TEXT NOT NULL,
    context JSONB, -- 額外的上下文信息
    importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0.0 AND importance_score <= 1.0),
    emotional_impact FLOAT DEFAULT 0.0, -- 正負情緒影響 (-1.0 到 1.0)
    related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    related_npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    memory_embedding vector(1536), -- 用於語義搜索
    access_count INTEGER DEFAULT 0, -- 記憶被訪問的次數
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- 記憶過期時間（可選）
);

-- NPC 間對話記錄表
CREATE TABLE npc_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc1_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    npc2_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    speaker_npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE, -- 說話的 NPC
    conversation_topic VARCHAR(100), -- 對話主題
    emotional_tone VARCHAR(50), -- 對話情緒基調
    context JSONB, -- 對話的背景信息
    triggered_by VARCHAR(100), -- 觸發對話的原因
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (npc1_id != npc2_id),
    CHECK (speaker_npc_id = npc1_id OR speaker_npc_id = npc2_id)
);

-- NPC 知識共享表（NPC 間分享信息）
CREATE TABLE npc_knowledge_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    target_npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    shared_memory_id UUID REFERENCES npc_memories(id) ON DELETE CASCADE,
    sharing_method VARCHAR(50), -- 'conversation', 'observation', 'rumor'
    reliability_score FLOAT DEFAULT 1.0 CHECK (reliability_score >= 0.0 AND reliability_score <= 1.0),
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (source_npc_id != target_npc_id)
);

-- NPC 情緒狀態歷史表
CREATE TABLE npc_mood_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    mood VARCHAR(50) NOT NULL,
    intensity FLOAT DEFAULT 0.5 CHECK (intensity >= 0.0 AND intensity <= 1.0),
    trigger_event TEXT, -- 觸發情緒變化的事件
    duration_minutes INTEGER, -- 情緒持續時間（分鐘）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NPC 日程和活動表
CREATE TABLE npc_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'routine', 'social', 'special'
    activity_name VARCHAR(100) NOT NULL,
    description TEXT,
    location_x FLOAT,
    location_y FLOAT,
    location_z FLOAT,
    start_time TIME,
    end_time TIME,
    days_of_week INTEGER[], -- [1,2,3,4,5,6,7] 表示週一到週日
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引提升性能
CREATE INDEX idx_npc_memories_npc_id ON npc_memories(npc_id);
CREATE INDEX idx_npc_memories_type ON npc_memories(memory_type);
CREATE INDEX idx_npc_memories_importance ON npc_memories(importance_score DESC);
CREATE INDEX idx_npc_memories_user_id ON npc_memories(related_user_id);
CREATE INDEX idx_npc_conversations_participants ON npc_conversations(npc1_id, npc2_id);
CREATE INDEX idx_npc_conversations_timestamp ON npc_conversations(created_at);
CREATE INDEX idx_npc_knowledge_sharing_target ON npc_knowledge_sharing(target_npc_id);
CREATE INDEX idx_npc_mood_history_npc_id ON npc_mood_history(npc_id);
CREATE INDEX idx_npc_activities_npc_id ON npc_activities(npc_id);

-- 清理舊的 NPC 數據，準備插入新的 3 個主要 NPC
DELETE FROM npcs;

-- 插入 3 個主要 NPC
INSERT INTO npcs (name, personality, background_story, appearance_config, current_mood, location_x, location_y, location_z) VALUES 
(
    '艾瑪',
    '溫柔細心的咖啡店店主，善於傾聽，用溫暖的語調關心他人。她能敏銳地察覺到客人的情緒變化，總是在適當的時候提供恰到好處的關懷。',
    '曾經是城市裡的心理諮商師，因為想要用更溫暖、自然的方式幫助人們，所以來到心語小鎮開設了「暖心咖啡館」。她相信一杯好咖啡配上真誠的傾聽，能夠治癒許多心靈創傷。',
    '{"color": "warm_brown", "style": "cozy", "accessories": ["coffee_apron", "heart_pin"], "height": "medium", "hair": "brown_wavy"}',
    'warm',
    10.0, 0.0, 15.0
),
(
    '莉莉',
    '活潑陽光的花店女孩，對生活充滿好奇心和熱情。她總是能從平凡的事物中發現美好，用她的樂觀感染身邊的每一個人。',
    '從小在花園裡長大，對各種花卉植物瞭若指掌。她相信每朵花都有自己的語言，每個季節都有獨特的美麗。來到小鎮後開設了「四季花語」花店，用花朵為人們傳遞溫暖和希望。',
    '{"color": "spring_green", "style": "fresh", "accessories": ["flower_crown", "butterfly_pin"], "height": "petite", "hair": "golden_curly"}',
    'cheerful',
    -15.0, 0.0, 20.0
),
(
    '湯姆',
    '博學深思的圖書館館長，雖然話不多但充滿智慧。他相信知識的力量，認為每本書都是通往不同世界的門戶。',
    '年輕時曾經環遊世界，收集各地的故事和傳說。最終在心語小鎮安定下來，建立了「智慧之樹圖書館」。他喜歡用故事和比喻來分享人生智慧，是鎮上公認的智者。',
    '{"color": "deep_blue", "style": "scholarly", "accessories": ["vintage_glasses", "pocket_watch"], "height": "tall", "hair": "silver_beard"}',
    'contemplative',
    0.0, 0.0, -25.0
);

-- 建立 3 個 NPC 之間的關係
INSERT INTO npc_relationships (npc1_id, npc2_id, relationship_type, strength) VALUES 
((SELECT id FROM npcs WHERE name = '艾瑪'), (SELECT id FROM npcs WHERE name = '莉莉'), 'friend', 0.8),
((SELECT id FROM npcs WHERE name = '艾瑪'), (SELECT id FROM npcs WHERE name = '湯姆'), 'friend', 0.7),
((SELECT id FROM npcs WHERE name = '莉莉'), (SELECT id FROM npcs WHERE name = '湯姆'), 'friend', 0.6);

-- 為每個 NPC 設定初始心願
INSERT INTO wishes (npc_id, title, description, wish_type, priority) VALUES 
((SELECT id FROM npcs WHERE name = '艾瑪'), '打造心靈療癒的咖啡時光', '我希望咖啡館能成為大家心靈的避風港，讓每個人都能在這裡找到溫暖和安慰。', 'companion', 4),
((SELECT id FROM npcs WHERE name = '莉莉'), '讓小鎮四季都開滿美麗的花', '我夢想著讓整個小鎮變成一個巨大的花園，讓每個角落都充滿花香和色彩。', 'dream', 3),
((SELECT id FROM npcs WHERE name = '湯姆'), '建立知識傳承的橋樑', '我想要幫助年輕人發現閱讀的樂趣，讓智慧在不同世代間傳承下去。', 'growth', 4);

-- 設定 NPC 日常活動
INSERT INTO npc_activities (npc_id, activity_type, activity_name, description, location_x, location_y, location_z, start_time, end_time, days_of_week) VALUES 
-- 艾瑪的活動
((SELECT id FROM npcs WHERE name = '艾瑪'), 'routine', '準備咖啡館開張', '每天早上準備新鮮的咖啡和糕點', 10.0, 0.0, 15.0, '07:00', '09:00', '{1,2,3,4,5,6,7}'),
((SELECT id FROM npcs WHERE name = '艾瑪'), 'routine', '咖啡館營業時間', '為客人服務，提供溫暖的對話', 10.0, 0.0, 15.0, '09:00', '18:00', '{1,2,3,4,5,6,7}'),
((SELECT id FROM npcs WHERE name = '艾瑪'), 'social', '花園散步', '在花園裡散步，思考生活', -15.0, 0.0, 20.0, '18:30', '19:30', '{1,3,5}'),

-- 莉莉的活動
((SELECT id FROM npcs WHERE name = '莉莉'), 'routine', '照料花店', '澆水、修剪、整理花卉', -15.0, 0.0, 20.0, '08:00', '11:00', '{1,2,3,4,5,6,7}'),
((SELECT id FROM npcs WHERE name = '莉莉'), 'routine', '花店營業', '為客人推薦最適合的花朵', -15.0, 0.0, 20.0, '11:00', '17:00', '{1,2,3,4,5,6}'),
((SELECT id FROM npcs WHERE name = '莉莉'), 'social', '咖啡時光', '到艾瑪的咖啡館聊天', 10.0, 0.0, 15.0, '15:00', '16:00', '{2,4,6}'),

-- 湯姆的活動
((SELECT id FROM npcs WHERE name = '湯姆'), 'routine', '整理圖書館', '分類書籍，準備新的推薦清單', 0.0, 0.0, -25.0, '09:00', '10:00', '{1,2,3,4,5,6}'),
((SELECT id FROM npcs WHERE name = '湯姆'), 'routine', '圖書館服務', '協助讀者，分享知識', 0.0, 0.0, -25.0, '10:00', '17:00', '{1,2,3,4,5,6}'),
((SELECT id FROM npcs WHERE name = '湯姆'), 'social', '花園閱讀', '在花園裡閱讀和思考', -15.0, 0.0, 20.0, '17:30', '18:30', '{1,3,5,7}');

-- 插入一些初始記憶示例
INSERT INTO npc_memories (npc_id, memory_type, content, importance_score, emotional_impact, context) VALUES 
((SELECT id FROM npcs WHERE name = '艾瑪'), 'event', '今天莉莉送來了一束美麗的向日葵來裝飾咖啡館', 0.7, 0.8, '{"location": "coffee_shop", "time": "morning", "mood": "grateful"}'),
((SELECT id FROM npcs WHERE name = '莉莉'), 'event', '湯姆向我請教關於薰衣草的花語，原來他想要推薦一本關於草本植物的書', 0.6, 0.5, '{"location": "flower_shop", "time": "afternoon", "mood": "helpful"}'),
((SELECT id FROM npcs WHERE name = '湯姆'), 'event', '艾瑪今天看起來有些疲憊，我推薦了一本關於冥想的書給她', 0.8, 0.3, '{"location": "library", "time": "evening", "mood": "concerned"}');

-- 插入一些 NPC 間的初始對話
INSERT INTO npc_conversations (npc1_id, npc2_id, content, speaker_npc_id, conversation_topic, emotional_tone, context) VALUES 
((SELECT id FROM npcs WHERE name = '艾瑪'), (SELECT id FROM npcs WHERE name = '莉莉'), '你的向日葵真的很美，它們讓整個咖啡館都充滿了陽光的味道。', (SELECT id FROM npcs WHERE name = '艾瑪'), 'flowers', 'grateful', '{"location": "coffee_shop", "time": "morning"}'),
((SELECT id FROM npcs WHERE name = '艾瑪'), (SELECT id FROM npcs WHERE name = '莉莉'), '我就知道你會喜歡！向日葵代表著希望和溫暖，就像你的咖啡館一樣。', (SELECT id FROM npcs WHERE name = '莉莉'), 'flowers', 'cheerful', '{"location": "coffee_shop", "time": "morning"}'),
((SELECT id FROM npcs WHERE name = '莉莉'), (SELECT id FROM npcs WHERE name = '湯姆'), '湯姆，你今天想要什麼樣的花呢？我有新鮮的薰衣草哦！', (SELECT id FROM npcs WHERE name = '莉莉'), 'flowers', 'friendly', '{"location": "flower_shop", "time": "afternoon"}'),
((SELECT id FROM npcs WHERE name = '莉莉'), (SELECT id FROM npcs WHERE name = '湯姆'), '薰衣草...它象徵著寧靜和智慧，很適合圖書館的氛圍。', (SELECT id FROM npcs WHERE name = '湯姆'), 'flowers', 'thoughtful', '{"location": "flower_shop", "time": "afternoon"}');