-- Insert NPCs with fixed IDs that match frontend expectations
-- First delete any existing NPCs to avoid conflicts
DELETE FROM npcs;

-- Insert NPCs with specific IDs
INSERT INTO npcs (id, name, personality, background_story, appearance_config, current_mood, location_x, location_y, location_z) VALUES 
(
    'npc-1'::uuid,
    '小雅',
    '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化，擅長傾聽和給予建議。',
    '曾經是城市中的心理諮商師，因為想要用更輕鬆的方式幫助人們，所以來到小鎮開了這間咖啡館。',
    '{"color": "warm_brown", "style": "casual", "accessories": ["apron", "coffee_pin"]}',
    'cheerful',
    10, 0, 15
),
(
    'npc-2'::uuid,
    '阿山',
    '內向但知識淵博的圖書館管理員，對古老的故事和歷史特別感興趣，喜歡安靜的環境。',
    '從小就生活在書香世家，繼承了家族的圖書館。雖然不擅長社交，但對真心求知的人總是特別友善。',
    '{"color": "deep_blue", "style": "scholarly", "accessories": ["glasses", "book_charm"]}',
    'calm',
    -20, 0, -10
),
(
    'npc-3'::uuid,
    '月兒',
    '充滿夢幻氣質的音樂家，經常在月光下彈奏吉他，用音樂治癒人心。',
    '曾經是城市裡小有名氣的音樂人，因為想要尋找內心的平靜而來到小鎮，在這裡找到了真正的音樂靈感。',
    '{"color": "moonlight_silver", "style": "artistic", "accessories": ["moon_pendant", "guitar_pick"]}',
    'dreamy',
    0, 5, 25
),
(
    'npc-4'::uuid,
    '老張',
    '慈祥的花園管理員，對每一朵花都如數家珍，總是能從植物的生長中看到人生的哲理。',
    '年輕時是一位探險家，走遍了世界各地。退休後選擇在小鎮定居，用餘生照顧這片美麗的花園。',
    '{"color": "earth_green", "style": "gardener", "accessories": ["straw_hat", "flower_badge"]}',
    'peaceful',
    30, 0, 0
),
(
    'npc-5'::uuid,
    '小晴',
    '活潑開朗的大學生，充滿青春活力，對一切新鮮事物都充滿好奇心。',
    '來自鄰近城市的大學生，假期時會來小鎮幫忙經營家族的小店。她的笑容總是能感染周圍的人。',
    '{"color": "sunny_yellow", "style": "youthful", "accessories": ["backpack", "camera"]}',
    'excited',
    -15, 0, 20
);

-- Also insert some initial relationships if needed
-- You might want to create initial relationships between users and NPCs here