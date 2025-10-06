#!/usr/bin/env python3
"""
NPC 記憶篩選系統
使用 Gemini AI 智能篩選重要記憶進入長期記憶庫
整合到 louis_lu 分支的資料庫架構
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
            'lupeixiu': '陸培修',
            'liuyucen': '劉宇岑',
            'chentingan': '陳庭安'
        }
        self.display_name = self.npc_display_names.get(npc_name, npc_name)

    async def filter_memories_with_ai(self, conversations: List[Dict]) -> List[Dict]:
        """
        使用 Gemini AI 篩選重要記憶

        Args:
            conversations: 要篩選的對話記錄列表（Prisma Conversation 格式）

        Returns:
            篩選後的重要記憶列表，包含 importance_score 和 ai_summary
        """
        if not conversations:
            return []

        # 準備篩選提示詞
        prompt = self._create_filter_prompt(conversations)

        try:
            # 調用 Gemini CLI 進行篩選
            result = await self._call_gemini_for_filtering(prompt)

            # 解析 AI 回應
            important_conversations = self._parse_ai_response(result, conversations)

            return important_conversations

        except Exception as e:
            logger.error(f"AI 篩選失敗，使用規則篩選：{e}")
            # 降級到規則篩選
            return self._fallback_rule_based_filter(conversations)

    def _create_filter_prompt(self, conversations: List[Dict]) -> str:
        """創建記憶篩選的 Prompt"""

        # 將對話轉換為編號列表
        conversation_list = []
        for i, conv in enumerate(conversations):
            # 處理資料庫格式的對話
            timestamp = conv.get('timestamp', conv.get('createdAt', datetime.now()))
            if isinstance(timestamp, str):
                timestamp_str = timestamp[:10]
            else:
                timestamp_str = timestamp.strftime('%Y-%m-%d')

            speaker_type = conv.get('speakerType', 'PLAYER')
            content = conv.get('content', '')
            emotion = conv.get('emotionTag', 'neutral')

            conversation_list.append(
                f"{i+1}. [{timestamp_str}] {speaker_type}: {content}\n"
                f"   情緒：{emotion}"
            )

        conversations_text = "\n\n".join(conversation_list)

        prompt = f"""你是心語小鎮 {self.display_name} 的記憶管理系統。請分析以下對話記錄，選出應該保存到長期記憶的重要對話。

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

{conversations_text}

# 任務

請分析以上 {len(conversations)} 段對話，選出最重要的記憶（最多選擇 {min(10, max(3, len(conversations)//3))} 個）。

**重要**：請以 JSON 格式回應，只包含選中的對話編號和重要性評估。格式如下：

```json
{{
  "selected_conversations": [
    {{
      "index": 1,
      "importance_score": 0.9,
      "emotional_impact": 0.8,
      "summary": "玩家表達了深層情感",
      "keywords": ["愛", "情感"]
    }},
    {{
      "index": 3,
      "importance_score": 0.6,
      "emotional_impact": 0.5,
      "summary": "討論了未來的計畫",
      "keywords": ["夢想", "計畫"]
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
                logger.info(f"✅ Gemini AI 成功篩選 {self.display_name} 的記憶")
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

    def _parse_ai_response(self, response: str, original_conversations: List[Dict]) -> List[Dict]:
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
            selected_conversations = []

            for item in result.get("selected_conversations", []):
                index = item.get("index", 0) - 1  # 轉換為 0-based index

                if 0 <= index < len(original_conversations):
                    conversation = original_conversations[index].copy()

                    # 添加 AI 評估的欄位
                    conversation['ai_importance_score'] = item.get("importance_score", 0.5)
                    conversation['ai_emotional_impact'] = item.get("emotional_impact", 0.0)
                    conversation['ai_summary'] = item.get("summary", "")
                    conversation['ai_keywords'] = item.get("keywords", [])
                    conversation['is_long_term_memory'] = True

                    selected_conversations.append(conversation)

            logger.info(f"AI 篩選出 {len(selected_conversations)} 個重要記憶")
            return selected_conversations

        except json.JSONDecodeError as e:
            logger.error(f"解析 AI 回應失敗：{e}")
            logger.debug(f"原始回應：{response[:500]}")
            return []
        except Exception as e:
            logger.error(f"處理 AI 回應時發生錯誤：{e}")
            return []

    def _fallback_rule_based_filter(self, conversations: List[Dict]) -> List[Dict]:
        """降級方案：基於規則的篩選"""
        logger.info("使用規則篩選作為降級方案")

        important_conversations = []
        keywords = ["喜歡", "愛", "討厭", "重要", "秘密", "約定", "承諾", "夢想", "希望", "難過", "開心"]

        for conversation in conversations:
            content = conversation.get('content', '')
            emotion = conversation.get('emotionTag', 'neutral')

            is_important = False
            importance_score = 0.0
            emotional_impact = 0.0

            # 情緒判斷
            if emotion in ['happy', 'joy', 'excited']:
                is_important = True
                importance_score = 0.7
                emotional_impact = 0.6
            elif emotion in ['sad', 'angry', 'worried']:
                is_important = True
                importance_score = 0.8
                emotional_impact = 0.7

            # 關鍵詞判斷
            found_keywords = [kw for kw in keywords if kw in content]
            if found_keywords:
                is_important = True
                importance_score = max(importance_score, 0.7)
                emotional_impact = max(emotional_impact, 0.5)

            # 長度判斷（深度對話）
            if len(content) > 50:
                is_important = True
                importance_score = max(importance_score, 0.6)

            if is_important:
                conv_copy = conversation.copy()
                conv_copy['ai_importance_score'] = importance_score
                conv_copy['ai_emotional_impact'] = emotional_impact
                conv_copy['ai_summary'] = f"關於：{content[:30]}..."
                conv_copy['ai_keywords'] = found_keywords
                conv_copy['is_long_term_memory'] = True

                important_conversations.append(conv_copy)

        # 限制數量並排序
        if len(important_conversations) > 10:
            important_conversations.sort(
                key=lambda x: x['ai_importance_score'],
                reverse=True
            )
            important_conversations = important_conversations[:10]

        return important_conversations


# 同步包裝函數，供 TypeScript 調用
def filter_conversations_sync(npc_name: str, conversations_json: str) -> str:
    """
    同步版本的記憶篩選函數

    Args:
        npc_name: NPC 名稱 (lupeixiu, liuyucen, chentingan)
        conversations_json: 對話記錄的 JSON 字串

    Returns:
        篩選後的對話記錄 JSON 字串
    """
    try:
        conversations = json.loads(conversations_json)
        filter_instance = MemoryFilter(npc_name)

        # 在新的 event loop 中執行異步函數
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                filter_instance.filter_memories_with_ai(conversations)
            )
            return json.dumps(result, ensure_ascii=False)
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"同步篩選失敗：{e}")
        return json.dumps({"error": str(e)})


# 命令行接口
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("使用方式：python memory_filter.py <npc_name> <conversations_json_file>")
        sys.exit(1)

    npc_name = sys.argv[1]
    json_file = sys.argv[2]

    with open(json_file, 'r', encoding='utf-8') as f:
        conversations_json = f.read()

    result = filter_conversations_sync(npc_name, conversations_json)
    print(result)
