-- 清理並插入3個主要NPC
DELETE FROM npcs;

-- 插入3個核心NPC角色
INSERT INTO npcs (id, name, personality, background_story, appearance_config, current_mood, location_x, location_y, location_z) VALUES 
(
    'npc-1'::uuid,
    '小雅',
    '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化，擅長傾聽和給予建議。喜歡在清晨泡一杯香醇的咖啡，享受寧靜的時光。',
    '曾經是城市中的心理諮商師，因為想要用更輕鬆的方式幫助人們，所以來到小鎮開了這間溫馨的咖啡館。她相信一杯溫暖的咖啡和真誠的對話能治癒人心。',
    '{"color": "warm_brown", "style": "casual_elegant", "accessories": ["apron", "coffee_pin", "warm_smile"]}',
    'cheerful',
    10, 0, 15
),
(
    'npc-3'::uuid,
    '月兒',
    '充滿夢幻氣質的音樂家，經常在月光下彈奏吉他，用音樂治癒人心。她說話如詩如歌，總是能從平凡中發現美好。',
    '曾經是城市裡小有名氣的音樂人，因為想要尋找內心的平靜而來到小鎮。在這裡，她找到了真正的音樂靈感，每晚都會在星空下創作新的旋律。',
    '{"color": "moonlight_silver", "style": "artistic_bohemian", "accessories": ["moon_pendant", "guitar_pick", "flowing_dress"]}',
    'dreamy',
    0, 5, 25
),
(
    'npc-5'::uuid,
    '小晴',
    '活潑開朗的大學生，充滿青春活力，對一切新鮮事物都充滿好奇心。她的笑容總是能感染周圍的人，讓整個小鎮都充滿歡樂。',
    '來自鄰近城市的大學生，假期時會來小鎮幫忙經營家族的小店。她喜歡用相機記錄小鎮的美好瞬間，夢想成為一名旅遊部落客。',
    '{"color": "sunny_yellow", "style": "youthful_trendy", "accessories": ["backpack", "camera", "colorful_hairpins"]}',
    'excited',
    -15, 0, 20
);

-- 創建NPC之間的關係
INSERT INTO npc_relationships (npc1_id, npc2_id, relationship_type, strength) VALUES
('npc-1'::uuid, 'npc-3'::uuid, 'friend', 0.8),
('npc-1'::uuid, 'npc-5'::uuid, 'friend', 0.7),
('npc-3'::uuid, 'npc-5'::uuid, 'friend', 0.6)
ON CONFLICT (npc1_id, npc2_id) DO UPDATE SET strength = EXCLUDED.strength;

-- 為每個NPC創建心願
INSERT INTO wishes (npc_id, title, description, wish_type, priority) VALUES
('npc-1'::uuid, '溫暖的咖啡館', '希望咖啡館能成為大家心靈的避風港', 'dream', 5),
('npc-3'::uuid, '月光演奏會', '想要舉辦一場浪漫的月光音樂會', 'dream', 4),
('npc-5'::uuid, '小鎮攝影展', '想要辦一個展覽分享小鎮的美好', 'dream', 3)
ON CONFLICT DO NOTHING;