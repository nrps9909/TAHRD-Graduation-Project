#!/usr/bin/env python3
"""
清理NPC記憶中的冗餘資料
移除重複的context和NPC間對話
"""

import json
import os
from pathlib import Path

def clean_memory_file(file_path):
    """清理單個記憶檔案"""
    if not file_path.exists():
        return
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            memories = json.load(f)
        
        cleaned_memories = []
        for memory in memories:
            # 跳過NPC間的對話
            if memory.get("player_message", "").startswith("你是「"):
                continue
            
            # 清理記憶格式
            cleaned_memory = {
                "timestamp": memory.get("timestamp"),
                "player_message": memory.get("player_message", "")[:200],
                "npc_response": memory.get("npc_response", "")[:200],
                "emotion": memory.get("emotion", "neutral")
            }
            # 移除context欄位
            
            cleaned_memories.append(cleaned_memory)
        
        # 儲存清理後的記憶
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_memories, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 清理 {file_path.name}: {len(memories)} → {len(cleaned_memories)} 條記憶")
        
    except Exception as e:
        print(f"❌ 清理失敗 {file_path}: {e}")

def main():
    """清理所有NPC的記憶"""
    memories_dir = Path("memories")
    npcs = ["lupeixiu", "liuyucen", "chentingan"]
    
    for npc in npcs:
        print(f"\n=== 清理 {npc} 的記憶 ===")
        
        # 清理短期記憶
        short_term_file = memories_dir / npc / "short_term_memory" / "conversations.json"
        clean_memory_file(short_term_file)
        
        # 清理長期記憶
        long_term_file = memories_dir / npc / "long_term_memory" / "memories.json"
        clean_memory_file(long_term_file)
    
    print("\n✅ 記憶清理完成！")

if __name__ == "__main__":
    main()