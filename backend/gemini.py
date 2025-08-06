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

# 設定日誌 - 輸出到 stderr 以避免干擾 stdout
import sys
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# 嘗試載入 python-dotenv - 從根目錄載入
try:
    from dotenv import load_dotenv
    # 載入根目錄的 .env 文件
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(project_root, '.env')
    load_dotenv(env_path)
    logger.info(f"載入 .env 檔案：{env_path}")
except ImportError:
    logger.warning("無法載入 python-dotenv，使用環境變數")
except Exception as e:
    logger.error(f"載入 .env 失敗：{e}")

# 配置常數
GEMINI_CLI_COMMAND = "gemini"
LOG_FILE = "gemini_usage_log.json"

# 超時設定
CLI_VERSION_TIMEOUT = 10
CLI_EXECUTION_TIMEOUT = 120

# 從環境變數讀取 API 金鑰
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# 如果沒有從環境變數讀到，嘗試直接從 .env 檔案讀取
if not GEMINI_API_KEY:
    try:
        # 優先檢查 backend 目錄的 .env 文件
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        env_paths = [
            os.path.join(backend_dir, '.env'),  # backend/.env
            os.path.join(os.path.dirname(backend_dir), '.env')  # 根目錄 .env
        ]
        
        for env_path in env_paths:
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('GEMINI_API_KEY='):
                            # 提取 API key，處理引號
                            key_value = line.split('=', 1)[1].strip()
                            GEMINI_API_KEY = key_value.strip('"\'')
                            if GEMINI_API_KEY and GEMINI_API_KEY != 'your-api-key':
                                logger.info(f"從 {env_path} 成功讀取 GEMINI_API_KEY")
                                break
                if GEMINI_API_KEY and GEMINI_API_KEY != 'your-api-key':
                    break
    except Exception as e:
        logger.error(f"直接讀取 .env 檔案失敗：{e}")


class GeminiLLMService:
    """Gemini LLM 服務類"""
    
    def __init__(self):
        self.check_gemini_cli()
        self.setup_auth()
        self.personalities_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'personalities')
    
    def check_gemini_cli(self):
        """檢查 Gemini CLI"""
        try:
            result = subprocess.run(
                [GEMINI_CLI_COMMAND, "--version"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=CLI_VERSION_TIMEOUT
            )
            
            if result.returncode != 0:
                raise Exception(f"Gemini CLI 檢查失敗：{result.stderr}")
            
            logger.info("✅ Gemini CLI 可用")
            return True
            
        except FileNotFoundError:
            raise Exception(f"找不到 Gemini CLI：{GEMINI_CLI_COMMAND}")
        except subprocess.TimeoutExpired:
            raise Exception("Gemini CLI 檢查超時")
        except Exception as e:
            raise Exception(f"Gemini CLI 檢查失敗：{e}")
    
    def setup_auth(self):
        """設定認證"""
        if GEMINI_API_KEY:
            os.environ['GEMINI_API_KEY'] = GEMINI_API_KEY
            logger.info(f"✅ Gemini 認證設定完成")
        else:
            raise Exception("未設定 GEMINI_API_KEY 環境變數")
    
    def generate_response(self, user_message: str, npc_data: Dict[str, Any]) -> str:
        """生成 NPC 對話回應"""
        # 儲存使用者訊息供備用回應使用
        self._current_user_message = user_message
        
        try:
            # 建構完整的 prompt
            prompt = self._build_npc_prompt(user_message, npc_data)
            
            # 呼叫 Gemini CLI
            response = self._call_gemini_cli(prompt)
            
            # 處理回應
            return self._process_response(response)
            
        except Exception as e:
            logger.error(f"生成 NPC 回應失敗：{e}")
            # 返回備用回應
            return self._get_fallback_response(npc_data)
    
    def _clean_text(self, text: str) -> str:
        """移除文本中不需要的 Unicode 格式化字符"""
        # 移除 U+2068 (FIRST STRONG ISOLATE) 和其他相關的格式化字符
        # https://www.w3.org/International/questions/qa-bidi-unicode-controls
        unwanted_chars = [
            '\u2068', '\u2069',  # FSI, PDI
            '\u202a', '\u202b',  # LRE, RLE
            '\u202c', '\u202d',  # PDF, LRO
            '\u202e',  # RLO
        ]
        for char in unwanted_chars:
            text = text.replace(char, '')
        return text.strip()

    def _load_personality_files(self, npc_name: str) -> Dict[str, str]:
        """載入並清理 NPC 的個性檔案和聊天紀錄"""
        name_mapping = {
            '小晴': 'xiaoqing',
            '小雅': 'xiaoya',
            '月兒': 'yueer'
        }
        
        filename = name_mapping.get(npc_name)
        if not filename:
            logger.warning(f"找不到 {npc_name} 的檔案映射")
            return {'personality': '', 'chat_history': ''}
            
        personality_file = os.path.join(self.personalities_dir, f"{filename}_personality.txt")
        chat_history_file = os.path.join(self.personalities_dir, f"{filename}_chat_history.txt")
        
        result = {'personality': '', 'chat_history': ''}
        
        try:
            if os.path.exists(personality_file):
                with open(personality_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    result['personality'] = self._clean_text(content)
                    logger.info(f"成功載入並清理 {npc_name} 的個性檔案")
            else:
                logger.warning(f"個性檔案不存在：{personality_file}")
                
            if os.path.exists(chat_history_file):
                with open(chat_history_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    result['chat_history'] = self._clean_text(content)
                    logger.info(f"成功載入並清理 {npc_name} 的聊天紀錄")
            else:
                logger.warning(f"聊天紀錄檔案不存在：{chat_history_file}")
                
        except Exception as e:
            logger.error(f"載入或清理檔案失敗：{e}")
            
        return result
    
    def _build_npc_prompt(self, user_message: str, npc_data: Dict[str, Any]) -> str:
        """建構 NPC 對話 prompt - 只傳入角色資料，讓 Gemini CLI 自動讀取 GEMINI.md"""
        npc_name = npc_data.get('name', '未知')
        
        # 載入個性檔案和聊天紀錄
        files_data = self._load_personality_files(npc_name)
        
        if files_data['personality'] and files_data['chat_history']:
            # 只提供角色資料，不建構複雜的 prompt
            # Gemini CLI 會自動讀取當前目錄的 GEMINI.md
            
            prompt = f"""角色名稱：{npc_name}

{files_data['personality']}

=== 聊天紀錄參考 ===
{files_data['chat_history']}

當前狀態：
- 心情：{npc_data.get('currentMood', 'neutral')}
- 親密度：{npc_data.get('relationshipLevel', 1)}/10

玩家說：{user_message}
{npc_name}："""
            
            return prompt
        else:
            # 備用模式：如果找不到檔案，使用簡單提示
            return f"你是{npc_name}。玩家說：{user_message}"
    
    def _call_gemini_cli(self, prompt: str) -> str:
        """呼叫 Gemini CLI"""
        try:
            # 使用 -p 參數通過 stdin 傳遞提示
            cmd = [GEMINI_CLI_COMMAND, "--no-telemetry", "--no-telemetry-log-prompts", "-p"]
            
            logger.info(f"執行 Gemini CLI (無遙測)")
            
            # 設定環境變數
            env = os.environ.copy()
            if GEMINI_API_KEY:
                env['GEMINI_API_KEY'] = GEMINI_API_KEY
            
            result = subprocess.run(
                cmd,
                input=prompt,  # 使用 input 而不是將 prompt 作為參數
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=CLI_EXECUTION_TIMEOUT,
                env=env
            )
            
            if result.returncode != 0:
                error_msg = f"返回代碼：{result.returncode}"
                if result.stderr:
                    error_msg += f" | {result.stderr[:200]}"
                logger.error(f"Gemini CLI 失敗：{error_msg}")
                raise Exception(f"Gemini CLI 失敗：{error_msg}")
            
            output = result.stdout.strip()
            
            if not output:
                raise Exception("未能提取到有效的輸出內容")
            
            logger.info(f"✅ Gemini CLI 成功生成回應 ({len(output)} 字符)")
            return output
                
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
        """獲取錯誤時的備用回應"""
        # 簡單的錯誤回應
        return "抱歉，我現在有點累了，讓我休息一下..."


# 創建全局服務實例
llm_service = GeminiLLMService()


def main():
    """主程式：從 JSON 檔案讀取對話資料並生成回應"""
    import sys
    
    if len(sys.argv) < 2:
        print("請提供 JSON 檔案路徑")
        sys.exit(1)
    
    json_file_path = sys.argv[1]
    
    try:
        # 記錄詳細資訊
        logger.info(f"開始處理檔案：{json_file_path}")
        logger.info(f"檔案是否存在：{os.path.exists(json_file_path)}")
        
        # 讀取 JSON 檔案
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"成功讀取 JSON 資料")
        
        # 擷取必要資料
        user_message = data.get('message', '')
        npc_data = data.get('npcData', {})
        
        logger.info(f"使用者訊息：{user_message}")
        logger.info(f"NPC 名稱：{npc_data.get('name', 'Unknown')}")
        
        # 生成回應
        response = llm_service.generate_response(user_message, npc_data)
        
        # 直接輸出回應到終端
        print(response)
        
    except FileNotFoundError:
        logger.error(f"找不到檔案：{json_file_path}")
        print("抱歉，我現在有點困惑...")
    except json.JSONDecodeError as e:
        logger.error(f"無效的 JSON 格式：{json_file_path} - {e}")
        print("嗯，讓我想想該怎麼說...")
    except Exception as e:
        logger.error(f"處理失敗：{e}")
        logger.error(f"錯誤類型：{type(e).__name__}")
        import traceback
        logger.error(f"堆疊追蹤：\n{traceback.format_exc()}")
        print("真抱歉，我需要休息一下...")


if __name__ == "__main__":
    main()