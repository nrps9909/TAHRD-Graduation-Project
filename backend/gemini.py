#!/usr/bin/env python3
"""
心語小鎮 NPC 對話生成服務 - 優化版
創建完全隔離的臨時執行環境，避免 Gemini CLI 掃描無關檔案
整合長短期記憶管理系統
"""

import os
import json
import subprocess
import shutil
import tempfile
import hashlib
import sys
import asyncio
from datetime import datetime
from pathlib import Path
import logging
from memory_manager import MemoryManager

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# 嘗試載入 python-dotenv
try:
    from dotenv import load_dotenv
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
CLI_EXECUTION_TIMEOUT = 120

# 從環境變數讀取 API 金鑰
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# 如果沒有從環境變數讀到，嘗試直接從 .env 檔案讀取
if not GEMINI_API_KEY:
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        env_paths = [
            os.path.join(backend_dir, '.env'),
            os.path.join(os.path.dirname(backend_dir), '.env')
        ]
        
        for env_path in env_paths:
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('GEMINI_API_KEY='):
                            key_value = line.split('=', 1)[1].strip()
                            GEMINI_API_KEY = key_value.strip('"\'')
                            if GEMINI_API_KEY and GEMINI_API_KEY != 'your-api-key':
                                logger.info(f"從 {env_path} 成功讀取 GEMINI_API_KEY")
                                break
                if GEMINI_API_KEY and GEMINI_API_KEY != 'your-api-key':
                    break
    except Exception as e:
        logger.error(f"直接讀取 .env 檔案失敗：{e}")


def create_isolated_environment(npc_name: str, npc_data: dict) -> Path:
    """創建完全隔離的執行環境"""
    
    # 使用固定的路徑名稱以提高快取命中率
    # 每個 NPC 有自己固定的臨時資料夾
    name_mapping = {
        '流羽岑': 'liuyucen',
        '劉宇岑': 'liuyucen',
        '鋁配咻': 'lupeixiu',
        '陸培修': 'lupeixiu',
        '沉停鞍': 'chentingan',
        '陳庭安': 'chentingan'
    }
    
    npc_id = name_mapping.get(npc_name, npc_name.lower())
    
    # 使用固定路徑，這樣 Files API 和快取可以重複使用
    temp_dir = Path(tempfile.gettempdir()) / "gemini_npc_cache" / npc_id
    
    # 如果資料夾存在，先清理舊內容
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"📁 準備固定快取環境：{temp_dir}")
    
    filename = npc_id
    
    # 格式化名稱映射
    name_formats = {
        'lupeixiu': 'LuPeiXiu',
        'liuyucen': 'LiuYuCen',
        'chentingan': 'ChenTingAn'
    }
    formatted_name = name_formats.get(filename, filename.title())
    
    # 獲取 backend 目錄和 memories 目錄
    backend_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    memories_dir = backend_dir / 'memories'
    npc_memory_dir = memories_dir / filename
    
    files_copied = []
    
    try:
        # 1. 複製 Personality.md
        if npc_memory_dir.exists():
            personality_file = npc_memory_dir / f"{formatted_name}_Personality.md"
            if personality_file.exists():
                dst = temp_dir / personality_file.name
                shutil.copy2(personality_file, dst)
                files_copied.append(personality_file.name)
                logger.info(f"✅ 複製個性檔案：{personality_file.name}")
        
        # 2. 複製 Chat_style.txt
        if npc_memory_dir.exists():
            chat_style_file = npc_memory_dir / f"{formatted_name}_Chat_style.txt"
            if chat_style_file.exists():
                dst = temp_dir / chat_style_file.name
                shutil.copy2(chat_style_file, dst)
                files_copied.append(chat_style_file.name)
                logger.info(f"✅ 複製聊天風格：{chat_style_file.name}")
        
        # 3. 複製 short_term_memory/conversations.json
        if npc_memory_dir.exists():
            short_term_dir = npc_memory_dir / "short_term_memory"
            if short_term_dir.exists():
                conversations_file = short_term_dir / "conversations.json"
                if conversations_file.exists():
                    temp_short_term = temp_dir / "short_term_memory"
                    temp_short_term.mkdir(exist_ok=True)
                    dst = temp_short_term / "conversations.json"
                    shutil.copy2(conversations_file, dst)
                    files_copied.append("short_term_memory/conversations.json")
                    logger.info(f"✅ 複製短期記憶")
        
        # 4. 複製 long_term_memory/memories.json
        if npc_memory_dir.exists():
            long_term_dir = npc_memory_dir / "long_term_memory"
            if long_term_dir.exists():
                memories_file = long_term_dir / "memories.json"
                if memories_file.exists():
                    temp_long_term = temp_dir / "long_term_memory"
                    temp_long_term.mkdir(exist_ok=True)
                    dst = temp_long_term / "memories.json"
                    shutil.copy2(memories_file, dst)
                    files_copied.append("long_term_memory/memories.json")
                    logger.info(f"✅ 複製長期記憶")
        
        # 5. 複製 GEMINI.md
        gemini_file = backend_dir / "GEMINI.md"
        if gemini_file.exists():
            dst = temp_dir / "GEMINI.md"
            shutil.copy2(gemini_file, dst)
            files_copied.append("GEMINI.md")
            logger.info(f"✅ 複製系統提示：GEMINI.md")
        
        # 6. 創建執行腳本（這是關鍵！）
        # 創建一個簡單的執行腳本在臨時資料夾中
        runner_script = temp_dir / "run_gemini.py"
        with open(runner_script, 'w', encoding='utf-8') as f:
            f.write(f"""#!/usr/bin/env python3
# 這個腳本在臨時資料夾中執行，確保 Gemini CLI 只掃描這個資料夾
import subprocess
import sys
import os

# 設定 prompt
prompt = '''當前狀態：
- 心情：{npc_data.get('currentMood', 'neutral')}
- 親密度：{npc_data.get('relationshipLevel', 1)}/10
- 信任度：{npc_data.get('trustLevel', 50)}%
- 好感度：{npc_data.get('affectionLevel', 50)}%

玩家說：{{}}

請以 {npc_name} 的身份，根據你的個性檔案和記憶來回應。'''

# 從參數獲取使用者訊息
user_message = sys.argv[1] if len(sys.argv) > 1 else "你好"

# 執行 Gemini CLI（在當前目錄，也就是臨時資料夾）
cmd = [
    "gemini",
    "--no-telemetry",
    "--no-telemetry-log-prompts",
    "-p", prompt.format(user_message)
]

# 設定環境變數
env = os.environ.copy()
env['GEMINI_API_KEY'] = '{GEMINI_API_KEY}'

try:
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding='utf-8',
        timeout=120,
        env=env
    )
    
    if result.returncode == 0:
        output = result.stdout.strip()
        # 過濾掉認證訊息
        if 'Loaded cached credentials' in output:
            lines = output.split('\\n')
            output = '\\n'.join(lines[1:]).strip()
        print(output)
    else:
        print(f"錯誤：{{result.stderr}}", file=sys.stderr)
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    print("執行超時", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"錯誤：{{e}}", file=sys.stderr)
    sys.exit(1)
""")
        
        logger.info(f"✅ 創建執行腳本：run_gemini.py")
        files_copied.append("run_gemini.py")
        
        logger.info(f"📋 固定環境準備完成，包含 {len(files_copied)} 個檔案")
        
    except Exception as e:
        logger.error(f"準備隔離環境失敗：{e}")
    
    return temp_dir


def execute_in_isolation(temp_dir: Path, user_message: str) -> str:
    """在隔離環境中執行"""
    
    try:
        # 在臨時資料夾中執行 Python 腳本
        # 這樣 Gemini CLI 就只會掃描臨時資料夾
        cmd = ['python3', 'run_gemini.py', user_message]
        
        logger.info(f"🚀 在隔離環境執行：{temp_dir}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=CLI_EXECUTION_TIMEOUT,
            cwd=str(temp_dir)  # 關鍵：在臨時資料夾執行
        )
        
        if result.returncode == 0:
            output = result.stdout.strip()
            logger.info(f"✅ 成功生成回應 ({len(output)} 字符)")
            return output
        else:
            logger.error(f"執行失敗：{result.stderr}")
            return "抱歉，我現在有點累了，讓我休息一下..."
            
    except subprocess.TimeoutExpired:
        logger.error("執行超時")
        return "抱歉，我需要更多時間思考..."
    except Exception as e:
        logger.error(f"執行錯誤：{e}")
        return "抱歉，我現在有點困惑..."


def cleanup_environment(temp_dir: Path):
    """保留環境以利用快取（不清理）"""
    # 不清理，讓檔案保留以便下次使用時可以利用快取
    logger.info(f"💾 保留環境以利用快取：{temp_dir}")


def update_npc_memory(npc_name: str, user_message: str, npc_response: str, context: dict = None):
    """更新 NPC 記憶（同步包裝器）"""
    try:
        name_mapping = {
            '流羽岑': 'liuyucen',
            '劉宇岑': 'liuyucen',
            '鋁配咻': 'lupeixiu',
            '陸培修': 'lupeixiu',
            '沉停鞍': 'chentingan',
            '陳庭安': 'chentingan'
        }
        
        npc_id = name_mapping.get(npc_name, npc_name.lower())
        
        # 初始化記憶管理器
        memory_manager = MemoryManager(npc_id)
        
        # 添加對話到短期記憶
        memory_manager.add_conversation(user_message, npc_response, context)
        
        # 定期更新記憶（每次對話後檢查）
        asyncio.run(memory_manager.update_memories_at_startup())
        
        # 導出記憶到 Gemini 格式
        memory_content = memory_manager.export_memories_to_gemini_format()
        memory_file = Path(f"memories/{npc_id}/{npc_id}_memories.md")
        
        with open(memory_file, 'w', encoding='utf-8') as f:
            f.write(memory_content)
        
        logger.info(f"✅ 已更新 {npc_name} 的記憶")
        
    except Exception as e:
        logger.error(f"更新記憶失敗：{e}")


def main():
    """主程式：從 JSON 檔案讀取對話資料並生成回應"""
    
    if len(sys.argv) < 2:
        print("請提供 JSON 檔案路徑")
        sys.exit(1)
    
    json_file_path = sys.argv[1]
    
    try:
        # 讀取 JSON 檔案
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"成功讀取 JSON 資料")
        
        # 擷取必要資料
        user_message = data.get('message', '')
        npc_data = data.get('npcData', {})
        context = data.get('context', {})
        
        # 合併元宇宙資料
        if 'sharedMemories' in context:
            npc_data['sharedMemories'] = context['sharedMemories']
        if 'otherNPCMemories' in context:
            npc_data['otherNPCMemories'] = context['otherNPCMemories']
        if 'sessionMessages' in context:
            npc_data['sessionMessages'] = context['sessionMessages']
        
        npc_name = npc_data.get('name', 'Unknown')
        
        logger.info(f"NPC：{npc_name}")
        logger.info(f"訊息：{user_message}")
        
        # 創建隔離環境
        temp_dir = create_isolated_environment(npc_name, npc_data)
        
        try:
            # 在隔離環境中執行
            response = execute_in_isolation(temp_dir, user_message)
            
            # 處理回應
            if len(response) > 200:
                cutoff = response[:200].rfind('。')
                if cutoff > 0:
                    response = response[:cutoff + 1]
                else:
                    response = response[:200] + '...'
            
            # 更新 NPC 記憶（在回應生成後）
            update_npc_memory(npc_name, user_message, response, context)
            
            # 輸出回應
            print(response)
            
        finally:
            # 清理環境
            cleanup_environment(temp_dir)
        
    except FileNotFoundError:
        logger.error(f"找不到檔案：{json_file_path}")
        print("抱歉，我現在有點困惑...")
    except json.JSONDecodeError as e:
        logger.error(f"無效的 JSON 格式：{e}")
        print("嗯，讓我想想該怎麼說...")
    except Exception as e:
        logger.error(f"處理失敗：{e}")
        print("真抱歉，我需要休息一下...")


if __name__ == "__main__":
    main()