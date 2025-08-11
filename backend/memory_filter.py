#!/usr/bin/env python3
"""
NPC 記憶篩選系統
使用 Gemini AI 智能篩選重要記憶進入長期記憶庫
"""

import json
import os
import subprocess
from typing import List, Dict, Any
from datetime import datetime
import logging
import asyncio

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MemoryFilter:
    """使用 Gemini AI 篩選記憶的智能過濾器"""
    
    def __init__(self, npc_name: str):
        self.npc_name = npc_name
        self.npc_display_names = {
            'lupeixiu': '鋁配咻',
            'liuyucen': '流羽岑',
            'chentingan': '沉停鞍'
        }
        self.display_name = self.npc_display_names.get(npc_name, npc_name)
        
    async def filter_memories_with_ai(self, memories: List[Dict]) -> List[Dict]:
        """
        使用 Gemini AI 篩選重要記憶
        
        Args:
            memories: 要篩選的記憶列表
            
        Returns:
            篩選後的重要記憶列表
        """
        if not memories:
            return []
            
        # 準備篩選提示詞
        prompt = self._create_filter_prompt(memories)
        
        try:
            # 調用 Gemini CLI 進行篩選
            result = await self._call_gemini_for_filtering(prompt)
            
            # 解析 AI 回應
            important_memories = self._parse_ai_response(result, memories)
            
            return important_memories
            
        except Exception as e:
            logger.error(f"AI 篩選失敗，使用規則篩選：{e}")
            # 降級到規則篩選
            return self._fallback_rule_based_filter(memories)
    
    def _create_filter_prompt(self, memories: List[Dict]) -> str:
        """創建記憶篩選的 Prompt"""
        
        # 將記憶轉換為編號列表
        memory_list = []
        for i, memory in enumerate(memories):
            memory_list.append(
                f"{i+1}. [{memory['timestamp'][:10]}]\n"
                f"   玩家：{memory['player_message']}\n"
                f"   {self.display_name}：{memory['npc_response']}\n"
                f"   情緒：{memory.get('emotion', 'neutral')}"
            )
        
        memories_text = "\n\n".join(memory_list)
        
        prompt = f"""你是 {self.display_name} 的記憶管理系統。請分析以下對話記錄，選出應該保存到長期記憶的重要對話。

# 篩選標準

## 必須保存的記憶（高優先級）：
1. **情感深度**：表達愛、喜歡、討厭、憤怒等強烈情感的對話
2. **個人承諾**：包含約定、承諾、答應的事項
3. **重要資訊**：玩家分享的個人秘密、重要經歷、夢想
4. **關係里程碑**：第一次見面、特殊稱呼、關係改變的時刻
5. **深度交流**：討論人生、價值觀、未來計畫的對話

## 可以保存的記憶（中優先級）：
1. **有趣互動**：特別有趣或創意的對話
2. **學習時刻**：玩家教導新知識或糾正錯誤
3. **情緒轉折**：從悲傷到開心，或其他情緒變化

## 不需保存的記憶（低優先級）：
1. **日常招呼**：簡單的你好、再見
2. **重複內容**：相似的對話內容
3. **無意義互動**：單純的表情或語氣詞

# 對話記錄

{memories_text}

# 任務

請分析以上 {len(memories)} 段對話，選出最重要的記憶（最多選擇 {min(10, len(memories)//2)} 個）。

**重要**：請以 JSON 格式回應，只包含選中的記憶編號和重要性理由。格式如下：

```json
{{
  "selected_memories": [
    {{
      "index": 1,
      "importance": "high",
      "reason": "表達了深層情感",
      "summary": "玩家分享了對繪畫的熱愛"
    }},
    {{
      "index": 3,
      "importance": "medium",
      "reason": "有趣的互動",
      "summary": "討論了天氣和心情的關係"
    }}
  ]
}}
```

只回應 JSON，不要有其他內容。"""
        
        return prompt
    
    async def _call_gemini_for_filtering(self, prompt: str) -> str:
        """調用 Gemini CLI 進行記憶篩選"""
        cmd = [
            "gemini",
            "-p", prompt,
            "--model", "gemini-2.5-flash"  # 使用快速模型降低成本
            # 移除 --json 參數，因為 CLI 不支援
        ]
        
        # 確保環境變數
        env = dict(os.environ)
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            env['GEMINI_API_KEY'] = str(api_key)
        
        try:
            # 執行 Gemini CLI
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=30
            )
            
            if result.returncode == 0:
                response = stdout.decode('utf-8').strip()
                logger.info(f"✅ Gemini AI 成功篩選 {self.npc_name} 的記憶")
                return response
            else:
                error_msg = stderr.decode('utf-8')
                logger.error(f"Gemini 篩選錯誤：{error_msg}")
                return ""
                
        except asyncio.TimeoutError:
            logger.error("Gemini 篩選超時")
            return ""
        except Exception as e:
            logger.error(f"調用 Gemini 失敗：{e}")
            return ""
    
    def _parse_ai_response(self, response: str, original_memories: List[Dict]) -> List[Dict]:
        """解析 AI 的篩選結果"""
        if not response:
            return []
        
        try:
            # 嘗試提取 JSON 部分
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            
            # 解析 JSON
            result = json.loads(response)
            selected_memories = []
            
            for item in result.get("selected_memories", []):
                index = item.get("index", 0) - 1  # 轉換為 0-based index
                
                if 0 <= index < len(original_memories):
                    memory = original_memories[index]
                    
                    # 創建長期記憶格式
                    long_term_memory = {
                        "timestamp": memory["timestamp"],
                        "summary": item.get("summary", self._create_summary(memory)),
                        "emotion": memory.get("emotion", "neutral"),
                        "importance": item.get("importance", "medium"),
                        "reason": item.get("reason", "重要對話"),
                        "original": {
                            "player": memory["player_message"][:100],
                            "npc": memory["npc_response"][:100]
                        }
                    }
                    selected_memories.append(long_term_memory)
            
            logger.info(f"AI 篩選出 {len(selected_memories)} 個重要記憶")
            return selected_memories
            
        except json.JSONDecodeError as e:
            logger.error(f"解析 AI 回應失敗：{e}")
            return []
        except Exception as e:
            logger.error(f"處理 AI 回應時發生錯誤：{e}")
            return []
    
    def _create_summary(self, memory: Dict) -> str:
        """創建記憶摘要"""
        player_msg = memory["player_message"][:50]
        emotion = memory.get("emotion", "neutral")
        
        if emotion == "positive":
            return f"愉快的對話：關於「{player_msg}」"
        elif emotion == "negative":
            return f"困難的對話：關於「{player_msg}」"
        else:
            return f"日常對話：關於「{player_msg}」"
    
    def _fallback_rule_based_filter(self, memories: List[Dict]) -> List[Dict]:
        """降級方案：基於規則的篩選"""
        logger.info("使用規則篩選作為降級方案")
        
        important_memories = []
        keywords = ["喜歡", "愛", "討厭", "重要", "秘密", "約定", "承諾", "夢想", "希望", "難過", "開心"]
        
        for memory in memories:
            is_important = False
            importance = "low"
            reason = ""
            
            combined_text = memory["player_message"] + memory["npc_response"]
            
            # 情緒判斷
            if memory.get("emotion") in ["positive", "negative"]:
                is_important = True
                importance = "high" if memory.get("emotion") == "positive" else "medium"
                reason = "情緒深刻的對話"
            
            # 關鍵詞判斷
            if any(keyword in combined_text for keyword in keywords):
                is_important = True
                importance = "high" if importance != "high" else importance
                reason = "包含重要關鍵詞"
            
            # 長度判斷
            if len(memory["player_message"]) > 50 or len(memory["npc_response"]) > 50:
                is_important = True
                importance = "medium" if importance == "low" else importance
                reason = reason or "深度交流"
            
            if is_important:
                long_term_memory = {
                    "timestamp": memory["timestamp"],
                    "summary": self._create_summary(memory),
                    "emotion": memory.get("emotion", "neutral"),
                    "importance": importance,
                    "reason": reason,
                    "original": {
                        "player": memory["player_message"][:100],
                        "npc": memory["npc_response"][:100]
                    }
                }
                important_memories.append(long_term_memory)
        
        # 限制數量
        if len(important_memories) > 10:
            # 按重要性排序
            importance_order = {"high": 3, "medium": 2, "low": 1}
            important_memories.sort(
                key=lambda x: importance_order.get(x["importance"], 0),
                reverse=True
            )
            important_memories = important_memories[:10]
        
        return important_memories


# 測試功能
async def test_memory_filter():
    """測試記憶篩選功能"""
    
    # 創建測試記憶
    test_memories = [
        {
            "timestamp": "2025-08-01T10:00:00",
            "player_message": "我愛你",
            "npc_response": "我...我也很喜歡你呢！",
            "emotion": "positive"
        },
        {
            "timestamp": "2025-08-02T10:00:00", 
            "player_message": "你好",
            "npc_response": "你好呀！",
            "emotion": "neutral"
        },
        {
            "timestamp": "2025-08-03T10:00:00",
            "player_message": "我想告訴你一個秘密，其實我一直都很孤單",
            "npc_response": "謝謝你願意告訴我...我會一直陪著你的",
            "emotion": "negative"
        },
        {
            "timestamp": "2025-08-04T10:00:00",
            "player_message": "天氣不錯",
            "npc_response": "是啊",
            "emotion": "neutral"
        },
        {
            "timestamp": "2025-08-05T10:00:00",
            "player_message": "我們約定好，以後每天都要來這裡見面",
            "npc_response": "好的！這是我們的約定！",
            "emotion": "positive"
        }
    ]
    
    # 測試篩選
    filter = MemoryFilter("lupeixiu")
    result = await filter.filter_memories_with_ai(test_memories)
    
    print("=== 篩選結果 ===")
    for memory in result:
        print(f"- [{memory['importance']}] {memory['summary']}")
        print(f"  理由：{memory['reason']}")
    
    return result


if __name__ == "__main__":
    # 測試篩選功能
    asyncio.run(test_memory_filter())