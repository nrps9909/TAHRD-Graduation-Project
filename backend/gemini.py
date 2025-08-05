#!/usr/bin/env python3
"""
心語小鎮 NPC 對話生成服務
使用 Gemini API 生成個性化的 NPC 對話回應
"""

import os
import json
import subprocess
from datetime import datetime
import logging
from typing import Optional, Dict, Any

# 嘗試載入 python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 配置常數
GEMINI_CLI_COMMAND = "gemini"
SYSTEM_PROMPT_FILE = "GEMINI.md"
LOG_FILE = "gemini_usage_log.json"

# 超時設定
CLI_VERSION_TIMEOUT = 10
CLI_EXECUTION_TIMEOUT = 120

# 從環境變數讀取 API 金鑰
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GeminiLLMService:
    """Gemini LLM 服務類"""
    
    def __init__(self):
        self.setup_auth()
        self.system_prompt = self._read_system_prompt()
    
    def setup_auth(self):
        """設定認證"""
        if not GEMINI_API_KEY:
            raise Exception("未設定 GEMINI_API_KEY 環境變數")
        
        os.environ['GEMINI_API_KEY'] = GEMINI_API_KEY
        logger.info("✅ Gemini 認證設定完成")
    
    def _read_system_prompt(self) -> str:
        """讀取系統 prompt 配置檔案"""
        system_prompt = """你是心語小鎮的 NPC 角色扮演助手。

## 核心規則
1. 你必須完全以指定的 NPC 角色身份回應
2. 保持角色的個性、語氣和背景設定
3. 回應要溫暖、友善、充滿同理心
4. 用繁體中文回答
5. 回應要自然、像真人對話，避免過於制式

## 回應風格
- 簡短而有意義（1-3句話）
- 表達關心和理解
- 適時給予鼓勵
- 可以分享角色的小故事或感受

## 情緒表達
根據角色的當前情緒（currentMood）調整語氣：
- cheerful: 活潑開朗
- calm: 平靜溫和
- warm: 溫暖親切
- thoughtful: 深思熟慮
- dreamy: 夢幻浪漫

記住：你不是 AI 助手，你是活在心語小鎮的角色。"""
        
        try:
            if os.path.exists(SYSTEM_PROMPT_FILE):
                with open(SYSTEM_PROMPT_FILE, 'r', encoding='utf-8') as f:
                    system_prompt = f.read()
        except Exception as e:
            logger.warning(f"使用預設系統 prompt：{e}")
        
        return system_prompt
    
    def generate_response(self, user_message: str, npc_data: Dict[str, Any]) -> str:
        """生成 NPC 對話回應"""
        try:
            # 建構完整的 prompt
            prompt = self._build_npc_prompt(user_message, npc_data)
            
            # 呼叫 Gemini CLI
            response = self._call_gemini_cli(prompt)
            
            # 處理回應
            return self._process_response(response)
            
        except Exception as e:
            logger.error(f"生成 NPC 回應失敗：{e}")
            # 返回預設回應
            return self._get_fallback_response(npc_data)
    
    def _build_npc_prompt(self, user_message: str, npc_data: Dict[str, Any]) -> str:
        """建構 NPC 對話 prompt"""
        npc_name = npc_data.get('name', '未知')
        personality = npc_data.get('personality', '')
        background = npc_data.get('backgroundStory', '')
        mood = npc_data.get('currentMood', 'neutral')
        relationship_level = npc_data.get('relationshipLevel', 1)
        
        prompt_parts = [
            self.system_prompt,
            "",
            f"=== 角色設定 ===",
            f"名稱：{npc_name}",
            f"個性：{personality}",
            f"背景：{background}",
            f"當前情緒：{mood}",
            f"關係等級：{relationship_level}/10",
            "",
            f"=== 對話情境 ===",
            f"玩家說：{user_message}",
            "",
            f"請以 {npc_name} 的身份，根據角色個性和當前情緒回應。"
        ]
        
        return "\n".join(prompt_parts)
    
    def _call_gemini_cli(self, prompt: str) -> str:
        """呼叫 Gemini CLI"""
        try:
            cmd = [GEMINI_CLI_COMMAND, "--no-telemetry", "-p"]
            
            result = subprocess.run(
                cmd,
                input=prompt,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=CLI_EXECUTION_TIMEOUT
            )
            
            if result.returncode != 0:
                raise Exception(f"Gemini CLI 失敗：{result.stderr}")
            
            return result.stdout.strip()
                
        except subprocess.TimeoutExpired:
            raise Exception("Gemini CLI 執行超時")
        except FileNotFoundError:
            raise Exception(f"找不到 Gemini CLI：{GEMINI_CLI_COMMAND}")
    
    def _process_response(self, response: str) -> str:
        """處理 LLM 回應"""
        # 清理回應文字
        response = response.strip()
        
        # 移除可能的 markdown 符號
        response = response.replace('```', '')
        
        # 確保回應不會太長
        if len(response) > 200:
            # 找到最近的句號截斷
            cutoff = response[:200].rfind('。')
            if cutoff > 0:
                response = response[:cutoff + 1]
            else:
                response = response[:200] + '...'
        
        return response
    
    def _get_fallback_response(self, npc_data: Dict[str, Any]) -> str:
        """獲取備用回應"""
        npc_name = npc_data.get('name', '朋友')
        mood = npc_data.get('currentMood', 'neutral')
        
        fallback_responses = {
            'cheerful': [
                f"哈哈，真有趣呢！",
                f"你的話讓我想起了一些美好的事情～",
                f"能和你聊天真開心！"
            ],
            'calm': [
                f"嗯，我明白你的意思。",
                f"讓我想想...這是個有趣的想法。",
                f"或許我們都需要一些時間思考。"
            ],
            'warm': [
                f"謝謝你願意和我分享這些。",
                f"你的話讓我感到很溫暖。",
                f"有你在真好。"
            ],
            'thoughtful': [
                f"這讓我想起了一些往事...",
                f"人生就是充滿了各種可能性呢。",
                f"有時候，答案就在我們心中。"
            ],
            'dreamy': [
                f"就像天上的雲朵一樣美好...",
                f"這讓我想起了一個美麗的夢。",
                f"世界充滿了奇妙的事物呢。"
            ]
        }
        
        responses = fallback_responses.get(mood, [
            f"嗯，我在聽呢。",
            f"真是有趣的想法。",
            f"謝謝你告訴我這些。"
        ])
        
        import random
        return random.choice(responses)


# 創建全局服務實例
llm_service = GeminiLLMService()