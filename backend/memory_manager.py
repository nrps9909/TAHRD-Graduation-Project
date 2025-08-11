#!/usr/bin/env python3
"""
NPC 記憶管理系統
管理短期記憶（7天內）和長期記憶（篩選後的重要記憶）
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
import logging
import asyncio
import subprocess
from memory_filter import MemoryFilter  # 導入AI篩選器

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MemoryManager:
    """NPC記憶管理器"""
    
    def __init__(self, npc_name: str, memories_dir: str = "memories"):
        self.npc_name = npc_name.lower()
        self.memories_dir = Path(memories_dir)
        self.npc_dir = self.memories_dir / self.npc_name
        
        # 記憶檔案路徑
        self.short_term_file = self.npc_dir / "short_term_memory" / "conversations.json"
        self.long_term_file = self.npc_dir / "long_term_memory" / "memories.json"
        
        # 確保目錄存在
        self.short_term_file.parent.mkdir(parents=True, exist_ok=True)
        self.long_term_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 載入現有記憶
        self.short_term_memories = self._load_json(self.short_term_file)
        self.long_term_memories = self._load_json(self.long_term_file)
        
        # 初始化AI篩選器
        self.memory_filter = MemoryFilter(npc_name)
        
    def _load_json(self, file_path: Path) -> List[Dict]:
        """載入JSON檔案"""
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"載入檔案失敗 {file_path}: {e}")
        return []
    
    def _save_json(self, data: List[Dict], file_path: Path):
        """儲存JSON檔案"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"儲存檔案失敗 {file_path}: {e}")
    
    def add_conversation(self, player_message: str, npc_response: str, context: Dict = None):
        """添加對話到短期記憶（去重版本）"""
        
        # 檢查是否為重複對話
        if self._is_duplicate_conversation(player_message, npc_response):
            logger.info(f"跳過重複對話：{player_message[:30]}...")
            return
        
        # 簡化記憶格式，只儲存必要資訊
        conversation = {
            "timestamp": datetime.now().isoformat(),
            "player_message": player_message[:200],  # 限制長度
            "npc_response": npc_response[:200],      # 限制長度
            "emotion": self._analyze_emotion(player_message, npc_response)
        }
        
        self.short_term_memories.append(conversation)
        self._save_json(self.short_term_memories, self.short_term_file)
        logger.info(f"已儲存 {self.npc_name} 的對話記憶")
    
    def _is_duplicate_conversation(self, player_message: str, npc_response: str) -> bool:
        """檢查是否為重複對話"""
        if not self.short_term_memories:
            return False
        
        # 檢查最近5條記憶，避免重複
        recent_memories = self.short_term_memories[-5:] if len(self.short_term_memories) >= 5 else self.short_term_memories
        
        for memory in recent_memories:
            # 如果玩家訊息和NPC回應都相同，視為重複
            if (memory.get("player_message", "") == player_message[:200] and 
                memory.get("npc_response", "") == npc_response[:200]):
                return True
            
            # 如果玩家訊息相同且時間很近（1分鐘內），也視為重複
            try:
                memory_time = datetime.fromisoformat(memory["timestamp"])
                time_diff = datetime.now() - memory_time
                if (memory.get("player_message", "") == player_message[:200] and 
                    time_diff.total_seconds() < 60):
                    return True
            except:
                pass
        
        return False
        
    def _analyze_emotion(self, player_message: str, npc_response: str) -> str:
        """分析對話的情緒（簡單版本）"""
        positive_words = ["開心", "快樂", "喜歡", "愛", "好", "讚", "棒", "謝謝"]
        negative_words = ["難過", "生氣", "討厭", "不好", "糟", "傷心", "憤怒"]
        
        combined_text = player_message + npc_response
        
        positive_count = sum(1 for word in positive_words if word in combined_text)
        negative_count = sum(1 for word in negative_words if word in combined_text)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
    
    async def update_memories_at_startup(self):
        """在啟動時更新記憶（移動舊記憶到長期記憶）"""
        logger.info(f"開始更新 {self.npc_name} 的記憶...")
        
        # 取得7天前的時間
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        # 分離新舊記憶
        new_memories = []
        old_memories = []
        
        for memory in self.short_term_memories:
            memory_time = datetime.fromisoformat(memory["timestamp"])
            if memory_time < seven_days_ago:
                old_memories.append(memory)
            else:
                new_memories.append(memory)
        
        if old_memories:
            logger.info(f"發現 {len(old_memories)} 個舊記憶，準備使用 AI 篩選...")
            
            # 使用 AI 篩選重要記憶（優先）
            try:
                important_memories = await self.memory_filter.filter_memories_with_ai(old_memories)
                logger.info(f"✅ AI 成功篩選出 {len(important_memories)} 個重要記憶")
            except Exception as e:
                logger.error(f"AI 篩選失敗：{e}，降級到規則篩選")
                # 降級到原本的規則篩選
                important_memories = self._filter_important_memories(old_memories)
            
            # 添加到長期記憶
            self.long_term_memories.extend(important_memories)
            
            # 限制長期記憶數量（最多50條）
            if len(self.long_term_memories) > 50:
                # 按重要性排序，保留最重要的50條
                self.long_term_memories.sort(
                    key=lambda x: {"high": 3, "medium": 2, "low": 1}.get(x.get("importance", "low"), 0),
                    reverse=True
                )
                self.long_term_memories = self.long_term_memories[:50]
            
            self._save_json(self.long_term_memories, self.long_term_file)
            
            # 更新短期記憶（只保留7天內的）
            self.short_term_memories = new_memories
            self._save_json(self.short_term_memories, self.short_term_file)
            
            logger.info(f"已將 {len(important_memories)} 個重要記憶移到長期記憶")
        else:
            logger.info(f"{self.npc_name} 沒有需要更新的記憶")
    
    def _filter_important_memories(self, memories: List[Dict]) -> List[Dict]:
        """使用Gemini篩選重要記憶"""
        if not memories:
            return []
        
        # 準備記憶摘要
        memory_summary = self._create_memory_summary(memories)
        
        # 使用Gemini進行篩選（簡化版本，實際使用時需要調用Gemini API）
        important_memories = []
        
        for memory in memories:
            # 篩選條件：情緒強烈、包含關鍵詞、或特殊事件
            is_important = False
            
            # 1. 情緒記憶
            if memory.get("emotion") in ["positive", "negative"]:
                is_important = True
            
            # 2. 關鍵詞記憶
            keywords = ["喜歡", "愛", "討厭", "重要", "秘密", "約定", "承諾", "夢想", "希望"]
            combined_text = memory["player_message"] + memory["npc_response"]
            if any(keyword in combined_text for keyword in keywords):
                is_important = True
            
            # 3. 長對話（表示深入交流）
            if len(memory["player_message"]) > 50 or len(memory["npc_response"]) > 50:
                is_important = True
            
            if is_important:
                # 簡化記憶格式
                simplified_memory = {
                    "timestamp": memory["timestamp"],
                    "summary": self._summarize_conversation(memory),
                    "emotion": memory.get("emotion", "neutral"),
                    "importance": "high" if memory.get("emotion") != "neutral" else "medium"
                }
                important_memories.append(simplified_memory)
        
        return important_memories
    
    def _create_memory_summary(self, memories: List[Dict]) -> str:
        """創建記憶摘要"""
        summary_parts = []
        for memory in memories[:10]:  # 只取前10個避免太長
            summary_parts.append(
                f"[{memory['timestamp'][:10]}] "
                f"玩家說：{memory['player_message'][:30]}... "
                f"我回應：{memory['npc_response'][:30]}..."
            )
        return "\n".join(summary_parts)
    
    def _summarize_conversation(self, memory: Dict) -> str:
        """摘要單個對話"""
        player_msg = memory["player_message"][:50]
        npc_msg = memory["npc_response"][:50]
        emotion = memory.get("emotion", "neutral")
        
        if emotion == "positive":
            return f"愉快的對話：玩家提到「{player_msg}」，我開心地回應"
        elif emotion == "negative":
            return f"困難的對話：玩家說「{player_msg}」，我感到有些難過"
        else:
            return f"日常對話：討論了關於「{player_msg}」的話題"
    
    def get_all_memories_for_context(self) -> str:
        """獲取所有記憶作為上下文"""
        context_parts = []
        
        # 添加長期記憶
        if self.long_term_memories:
            context_parts.append("【長期記憶】")
            for memory in self.long_term_memories[-5:]:  # 只取最近5個長期記憶
                context_parts.append(
                    f"- {memory['timestamp'][:10]}: {memory['summary']} "
                    f"(情緒: {memory.get('emotion', 'neutral')})"
                )
        
        # 添加短期記憶
        if self.short_term_memories:
            context_parts.append("\n【短期記憶（最近7天）】")
            for memory in self.short_term_memories[-10:]:  # 取最近10個短期記憶
                context_parts.append(
                    f"- {memory['timestamp'][:16]}: "
                    f"玩家說「{memory['player_message'][:30]}」"
                    f"我回「{memory['npc_response'][:30]}」"
                )
        
        if not context_parts:
            return "【尚無記憶】這是我們第一次見面。"
        
        return "\n".join(context_parts)
    
    def export_memories_to_gemini_format(self) -> str:
        """將記憶導出為Gemini可讀格式"""
        output = f"""# {self.npc_name.upper()} 的記憶庫

## 個人記憶摘要
我是{self.npc_name}，這是我與玩家互動的記憶。

{self.get_all_memories_for_context()}

## 記憶統計
- 短期記憶數量：{len(self.short_term_memories)}
- 長期記憶數量：{len(self.long_term_memories)}
- 最早記憶：{self.long_term_memories[0]['timestamp'][:10] if self.long_term_memories else '無'}
- 最新互動：{self.short_term_memories[-1]['timestamp'][:16] if self.short_term_memories else '無'}
"""
        return output


# 主要功能：在啟動時更新所有NPC的記憶
async def update_all_npc_memories():
    """更新所有NPC的記憶（只在啟動時執行）"""
    npc_names = ["lupeixiu", "liuyucen", "chentingan"]
    
    for npc_name in npc_names:
        try:
            manager = MemoryManager(npc_name)
            await manager.update_memories_at_startup()
            
            # 導出記憶到Gemini格式
            memory_content = manager.export_memories_to_gemini_format()
            memory_file = Path(f"memories/{npc_name}/{npc_name}_memories.md")
            
            with open(memory_file, 'w', encoding='utf-8') as f:
                f.write(memory_content)
            
            logger.info(f"已更新並導出 {npc_name} 的記憶")
            
        except Exception as e:
            logger.error(f"更新 {npc_name} 記憶時發生錯誤: {e}")

# 同步包裝器，方便在非異步環境中調用
def update_all_npc_memories_sync():
    """同步版本的記憶更新（供 start-mcp.sh 使用）"""
    import asyncio
    asyncio.run(update_all_npc_memories())


if __name__ == "__main__":
    # 只在直接執行時更新記憶
    update_all_npc_memories_sync()