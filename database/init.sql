-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- NPCs table
CREATE TABLE npcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    personality TEXT NOT NULL,
    background_story TEXT,
    appearance_config JSONB,
    current_mood VARCHAR(50) DEFAULT 'neutral',
    location_x FLOAT DEFAULT 0,
    location_y FLOAT DEFAULT 0,
    location_z FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    speaker_type VARCHAR(10) CHECK (speaker_type IN ('user', 'npc')),
    emotion_tag VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context_embedding vector(1536) -- For semantic search
);

-- Relationships table (user-npc relationships)
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    relationship_level INTEGER DEFAULT 1 CHECK (relationship_level >= 1 AND relationship_level <= 10),
    trust_level FLOAT DEFAULT 0.0 CHECK (trust_level >= 0.0 AND trust_level <= 1.0),
    affection_level FLOAT DEFAULT 0.0 CHECK (affection_level >= 0.0 AND affection_level <= 1.0),
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_interactions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, npc_id)
);

-- Memory flowers (記憶花園系統)
CREATE TABLE memory_flowers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    flower_type VARCHAR(50) NOT NULL,
    emotion_color VARCHAR(50) NOT NULL,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    position_z FLOAT NOT NULL,
    growth_stage INTEGER DEFAULT 1 CHECK (growth_stage >= 1 AND growth_stage <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NPC relationships (NPC間的關係)
CREATE TABLE npc_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc1_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    npc2_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- friend, rival, romantic, family
    strength FLOAT DEFAULT 0.5 CHECK (strength >= 0.0 AND strength <= 1.0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (npc1_id != npc2_id),
    UNIQUE(npc1_id, npc2_id)
);

-- Wishes system (心願系統)
CREATE TABLE wishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    wish_type VARCHAR(50) NOT NULL, -- companion, reconciliation, growth, dream
    is_fulfilled BOOLEAN DEFAULT false,
    fulfillment_method TEXT,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at TIMESTAMP
);

-- User wish progress
CREATE TABLE user_wish_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wish_id UUID REFERENCES wishes(id) ON DELETE CASCADE,
    progress FLOAT DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0),
    notes TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, wish_id)
);

-- Letters system (信件系統)
CREATE TABLE letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_type VARCHAR(10) CHECK (sender_type IN ('user', 'npc')),
    sender_id UUID NOT NULL, -- user_id or npc_id
    recipient_type VARCHAR(10) CHECK (recipient_type IN ('user', 'npc')),
    recipient_id UUID NOT NULL, -- user_id or npc_id
    subject VARCHAR(200),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Player diary entries
CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    mood VARCHAR(50),
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game world state
CREATE TABLE world_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    weather VARCHAR(50) DEFAULT 'sunny',
    time_of_day INTEGER DEFAULT 12 CHECK (time_of_day >= 0 AND time_of_day < 24),
    season VARCHAR(20) DEFAULT 'spring',
    special_events JSONB DEFAULT '[]',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_conversations_user_npc ON conversations(user_id, npc_id);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX idx_relationships_user_id ON relationships(user_id);
CREATE INDEX idx_memory_flowers_user_id ON memory_flowers(user_id);
CREATE INDEX idx_letters_recipient ON letters(recipient_type, recipient_id);
CREATE INDEX idx_diary_entries_user_id ON diary_entries(user_id);

-- Insert initial NPCs
INSERT INTO npcs (name, personality, background_story, appearance_config, location_x, location_y, location_z) VALUES 
(
    '小雅',
    '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化，擅長傾聽和給予建議。',
    '曾經是城市中的心理諮商師，因為想要用更輕鬆的方式幫助人們，所以來到小鎮開了這間咖啡館。',
    '{"color": "warm_brown", "style": "casual", "accessories": ["apron", "coffee_pin"]}',
    10.0, 0.0, 15.0
),
(
    '阿山',
    '內向的圖書館管理員，博學多聞但不善表達，對於故事和歷史有著深厚的熱愛。',
    '從小就喜歡閱讀，認為每本書都是一個世界。雖然話不多，但總能推薦最適合的書給需要的人。',
    '{"color": "deep_blue", "style": "scholarly", "accessories": ["glasses", "book"]}',
    -20.0, 0.0, -10.0
),
(
    '月兒',
    '夢幻的音樂家，情感豐富且富有創造力，時常沉浸在自己的音樂世界中。',
    '自小學習各種樂器，用音樂表達內心世界。相信音樂能夠治癒人心，連結不同的靈魂。',
    '{"color": "soft_purple", "style": "artistic", "accessories": ["musical_note", "headphones"]}',
    0.0, 5.0, 25.0
),
(
    '老張',
    '慈祥的花園管理員，對植物瞭若指掌，相信每一株植物都有自己的故事。',
    '退休後來到小鎮照顧花園，見證了無數段美好的友誼和愛情在花園中萌芽。',
    '{"color": "earth_green", "style": "rustic", "accessories": ["hat", "watering_can"]}',
    30.0, 0.0, 0.0
),
(
    '小晴',
    '活潑開朗的學生，對世界充滿好奇心，總是能用樂觀的態度面對困難。',
    '剛來到小鎮的交換學生，雖然有時候會想家，但正努力適應新環境，結交新朋友。',
    '{"color": "bright_yellow", "style": "youthful", "accessories": ["backpack", "smile"]}',
    -15.0, 0.0, 20.0
);

-- Insert initial wishes
INSERT INTO wishes (npc_id, title, description, wish_type, priority) VALUES 
((SELECT id FROM npcs WHERE name = '小雅'), '幫助更多人找到心靈平靜', '我希望能夠透過咖啡館這個溫暖的空間，讓更多人感受到被理解和關愛。', 'companion', 3),
((SELECT id FROM npcs WHERE name = '阿山'), '找到志同道合的讀書夥伴', '雖然我喜歡安靜，但有時候也希望能和別人分享閱讀的樂趣。', 'companion', 2),
((SELECT id FROM npcs WHERE name = '月兒'), '創作一首能夠撫慰人心的樂曲', '我想創作一首歌，能夠幫助那些在黑暗中的人們看見希望。', 'dream', 4),
((SELECT id FROM npcs WHERE name = '老張'), '讓記憶花園更加繁榮', '希望更多的美好回憶能在這個花園中生根發芽，成為永恆的見證。', 'growth', 3),
((SELECT id FROM npcs WHERE name = '小晴'), '克服思鄉的情緒', '雖然這裡很美好，但有時候還是會想念家鄉的朋友和家人。', 'growth', 2);