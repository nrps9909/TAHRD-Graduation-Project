#!/usr/bin/env python3
"""
測試長短期記憶管理系統
"""

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from memory_manager import MemoryManager
from memory_filter import MemoryFilter

async def test_memory_system():
    """測試記憶系統的完整流程"""
    
    print("=== 心語小鎮記憶系統測試 ===\n")
    
    # 測試 NPC
    test_npc = "lupeixiu"
    print(f"📋 測試對象：陸培修 (lupeixiu)")
    
    # 1. 初始化記憶管理器
    print("\n1️⃣ 初始化記憶管理器...")
    memory_manager = MemoryManager(test_npc)
    print(f"   ✅ 短期記憶數量：{len(memory_manager.short_term_memories)}")
    print(f"   ✅ 長期記憶數量：{len(memory_manager.long_term_memories)}")
    
    # 2. 添加測試對話
    print("\n2️⃣ 添加測試對話...")
    test_conversations = [
        {
            "player": "我愛你，培修",
            "npc": "我...我也很喜歡你呢！謝謝你的真心",
            "context": {"emotion": "愛情告白", "importance": "high"}
        },
        {
            "player": "今天天氣真好",
            "npc": "是啊，陽光很溫暖呢",
            "context": {"emotion": "日常", "importance": "low"}
        },
        {
            "player": "我想告訴你一個秘密，我其實很害怕孤獨",
            "npc": "謝謝你願意告訴我...我會一直陪著你的，你並不孤單",
            "context": {"emotion": "秘密分享", "importance": "high"}
        },
        {
            "player": "你好嗎？",
            "npc": "我很好，謝謝關心",
            "context": {"emotion": "日常", "importance": "low"}
        },
        {
            "player": "我們約定好，以後每天都要一起看夕陽",
            "npc": "好的！這是我們的約定！每天夕陽時分，我都會在這裡等你",
            "context": {"emotion": "約定", "importance": "high"}
        },
        {
            "player": "早安",
            "npc": "早安呀！今天也要加油喔",
            "context": {"emotion": "日常", "importance": "low"}
        },
        {
            "player": "你的夢想是什麼？",
            "npc": "我想成為能夠療癒他人心靈的人，用我的畫作和陪伴讓大家感到溫暖",
            "context": {"emotion": "夢想", "importance": "medium"}
        }
    ]
    
    for i, conv in enumerate(test_conversations, 1):
        memory_manager.add_conversation(
            player_message=conv["player"],
            npc_response=conv["npc"],
            context=conv["context"]
        )
        print(f"   ✅ 添加對話 {i}: {conv['player'][:20]}...")
    
    print(f"\n   短期記憶更新為：{len(memory_manager.short_term_memories)} 條")
    
    # 3. 測試 AI 記憶篩選
    print("\n3️⃣ 測試 AI 記憶篩選...")
    memory_filter = MemoryFilter(test_npc)
    
    # 模擬舊記憶（超過7天）
    old_memories = []
    for conv in test_conversations:
        old_memory = {
            "timestamp": (datetime.now() - timedelta(days=8)).isoformat(),
            "player_message": conv["player"],
            "npc_response": conv["npc"],
            "emotion": conv["context"].get("emotion", "neutral")
        }
        old_memories.append(old_memory)
    
    print(f"   準備篩選 {len(old_memories)} 條舊記憶...")
    
    try:
        # 使用 AI 篩選
        important_memories = await memory_filter.filter_memories_with_ai(old_memories)
        print(f"   ✅ AI 篩選結果：{len(important_memories)} 條重要記憶")
        
        print("\n   篩選出的重要記憶：")
        for mem in important_memories:
            print(f"      - [{mem['importance']}] {mem['summary']}")
            print(f"        理由：{mem['reason']}")
            
    except Exception as e:
        print(f"   ⚠️ AI 篩選失敗，降級到規則篩選：{e}")
        important_memories = memory_filter._fallback_rule_based_filter(old_memories)
        print(f"   ✅ 規則篩選結果：{len(important_memories)} 條重要記憶")
        
        print("\n   篩選出的重要記憶：")
        for mem in important_memories:
            print(f"      - [{mem['importance']}] {mem['summary']}")
    
    # 4. 模擬記憶更新流程
    print("\n4️⃣ 模擬記憶更新流程...")
    
    # 將篩選後的記憶加入長期記憶
    memory_manager.long_term_memories.extend(important_memories)
    print(f"   ✅ 長期記憶更新為：{len(memory_manager.long_term_memories)} 條")
    
    # 5. 導出記憶為 Gemini 格式
    print("\n5️⃣ 導出記憶為 Gemini 格式...")
    memory_content = memory_manager.export_memories_to_gemini_format()
    
    # 保存到文件
    memory_file = Path(f"memories/{test_npc}/{test_npc}_memories_test.md")
    memory_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(memory_file, 'w', encoding='utf-8') as f:
        f.write(memory_content)
    
    print(f"   ✅ 記憶已導出到：{memory_file}")
    
    # 6. 顯示記憶內容預覽
    print("\n6️⃣ 記憶內容預覽：")
    print("=" * 50)
    print(memory_content[:1000])  # 只顯示前1000字符
    if len(memory_content) > 1000:
        print("... (內容過長，已截斷)")
    print("=" * 50)
    
    # 7. 測試記憶去重功能
    print("\n7️⃣ 測試記憶去重功能...")
    
    # 嘗試添加重複對話
    memory_manager.add_conversation(
        player_message="我愛你，培修",
        npc_response="我...我也很喜歡你呢！謝謝你的真心",
        context={"emotion": "愛情告白"}
    )
    
    print(f"   ✅ 去重測試完成，短期記憶仍為：{len(memory_manager.short_term_memories)} 條")
    
    print("\n🎉 記憶系統測試完成！")
    
    # 返回測試結果
    return {
        "npc": test_npc,
        "short_term_count": len(memory_manager.short_term_memories),
        "long_term_count": len(memory_manager.long_term_memories),
        "important_memories": len(important_memories),
        "memory_file": str(memory_file)
    }


if __name__ == "__main__":
    # 執行測試
    result = asyncio.run(test_memory_system())
    
    print("\n📊 測試結果摘要：")
    print(json.dumps(result, ensure_ascii=False, indent=2))