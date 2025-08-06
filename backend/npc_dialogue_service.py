#!/usr/bin/env python3
"""
心語小鎮 NPC 對話生成服務
使用 Gemini CLI 生成個性化的 NPC 對話回應
"""

import os
import json
import subprocess
import sys
import argparse
import logging
from typing import Dict, Any, Optional

# 嘗試載入 python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 配置
GEMINI_CLI_COMMAND = "gemini"
CLI_EXECUTION_TIMEOUT = 60

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NPCDialogueService:
    """NPC 對話生成服務"""
    
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("未設定 GEMINI_API_KEY 環境變數")
        
        os.environ['GEMINI_API_KEY'] = self.api_key
    
    def generate_response(self, user_message: str, npc_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成 NPC 回應"""
        try:
            # 建構 prompt
            prompt = self._build_prompt(user_message, npc_data)
            
            # 呼叫 Gemini CLI
            response = self._call_gemini_cli(prompt)
            
            # 處理回應
            processed = self._process_response(response, npc_data)
            
            # 檢查是否已經是結構化回應
            try:
                json_response = json.loads(processed)
                if isinstance(json_response, dict) and 'content' in json_response:
                    return json_response
            except:
                pass
            
            # 如果不是，生成結構化回應
            return self._generate_structured_response(processed, npc_data)
            
        except Exception as e:
            logger.error(f"生成失敗：{e}")
            return self._get_fallback_response_json(npc_data)
    
    def _build_prompt(self, user_message: str, npc_data: Dict[str, Any]) -> str:
        """建構對話 prompt"""
        system_prompt = """你是心語小鎮的 NPC 角色。請完全以指定的角色身份回應，並以JSON格式返回。

回應規則：
1. 保持角色的個性和背景設定
2. 回應要溫暖、友善、充滿同理心
3. 用繁體中文回答
4. 簡短自然（1-3句話）
5. 根據情緒調整語氣

請以以下JSON格式回應：
{
  "content": "你的回應內容",
  "emotionTag": "當前情緒狀態",
  "suggestedActions": ["建議的行動1", "建議的行動2"],
  "memoryFlowerData": {
    "type": "花朵類型",
    "intensity": 0.5,
    "description": "這段對話的意義"
  },
  "relationshipImpact": {
    "trustChange": 0.1,
    "affectionChange": 0.05,
    "levelChange": 0
  },
  "moodChange": "新的情緒狀態（如果有變化）"
}

情緒對應：
- cheerful: 活潑開朗
- calm: 平靜溫和  
- warm: 溫暖親切
- thoughtful: 深思熟慮
- dreamy: 夢幻浪漫"""
        
        npc_name = npc_data.get('name', '朋友')
        personality = npc_data.get('personality', '友善溫和')
        background = npc_data.get('backgroundStory', '')
        mood = npc_data.get('currentMood', 'neutral')
        
        prompt = f"""{system_prompt}

=== 角色設定 ===
名稱：{npc_name}
個性：{personality}
背景：{background}
當前情緒：{mood}

=== 對話 ===
玩家：{user_message}

請以 {npc_name} 的身份回應，直接返回JSON格式的回應（不要加任何前綴或解釋）："""
        
        return prompt
    
    def _call_gemini_cli(self, prompt: str) -> str:
        """呼叫 Gemini CLI"""
        cmd = [GEMINI_CLI_COMMAND, "--no-telemetry", "-p"]
        
        try:
            result = subprocess.run(
                cmd,
                input=prompt,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=CLI_EXECUTION_TIMEOUT
            )
            
            if result.returncode != 0:
                raise Exception(f"CLI 失敗: {result.stderr}")
            
            return result.stdout.strip()
            
        except subprocess.TimeoutExpired:
            raise Exception("執行超時")
        except FileNotFoundError:
            raise Exception(f"找不到 {GEMINI_CLI_COMMAND}")
    
    def _process_response(self, response: str, npc_data: Dict[str, Any]) -> str:
        """處理回應"""
        # 清理回應
        response = response.strip()
        
        # 移除 markdown code blocks
        if '```json' in response:
            response = response.replace('```json', '').replace('```', '')
        elif '```' in response:
            response = response.replace('```', '')
        
        # 嘗試解析 JSON
        try:
            json_data = json.loads(response)
            # 如果是有效的 JSON 且包含 content，直接返回整個 JSON
            if isinstance(json_data, dict) and 'content' in json_data:
                return json.dumps(json_data, ensure_ascii=False)
            else:
                # 如果是其他 JSON 格式，提取文字內容
                return str(json_data)
        except:
            # 如果不是 JSON，返回原始內容，限制長度
            if len(response) > 150:
                cutoff = response[:150].rfind('。')
                if cutoff > 0:
                    response = response[:cutoff + 1]
                else:
                    response = response[:150] + '...'
            return response
    
    def _generate_structured_response(self, content: str, npc_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成結構化回應"""
        mood = npc_data.get('currentMood', 'neutral')
        
        # 基礎結構
        response = {
            "content": content,
            "emotionTag": mood,
            "suggestedActions": [],
            "relationshipImpact": {
                "trustChange": 0,
                "affectionChange": 0,
                "levelChange": 0
            }
        }
        
        # 根據情緒添加建議行動
        if mood == 'cheerful':
            response["suggestedActions"] = ["分享快樂", "一起遊戲"]
        elif mood == 'thoughtful':
            response["suggestedActions"] = ["深度對話", "分享回憶"]
        
        return response
    
    def _get_fallback_response_json(self, npc_data: Dict[str, Any]) -> Dict[str, Any]:
        """備用回應 JSON"""
        mood = npc_data.get('currentMood', 'neutral')
        
        responses = {
            'cheerful': "哈哈，真有趣呢！能和你聊天真開心～",
            'calm': "嗯，我明白你的意思。讓我想想...",
            'warm': "謝謝你願意和我分享這些，真的很溫暖。",
            'thoughtful': "這讓我想起了一些往事...人生充滿可能性呢。",
            'dreamy': "就像天上的雲朵一樣美好..."
        }
        
        content = responses.get(mood, "嗯，我在聽呢。謝謝你告訴我這些。")
        return self._generate_structured_response(content, npc_data)


def main():
    """主函數"""
    parser = argparse.ArgumentParser(description="NPC 對話生成服務")
    parser.add_argument('--chat', type=str, required=True, help='用戶訊息')
    parser.add_argument('--npc-data', type=str, help='NPC 數據 JSON')
    
    args = parser.parse_args()
    
    try:
        # 解析 NPC 數據
        npc_data = {}
        if args.npc_data:
            npc_data = json.loads(args.npc_data)
        
        # 生成回應
        service = NPCDialogueService()
        response = service.generate_response(args.chat, npc_data)
        
        # 輸出 JSON 回應
        print(json.dumps(response, ensure_ascii=False))
        
    except Exception as e:
        logger.error(f"錯誤：{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()