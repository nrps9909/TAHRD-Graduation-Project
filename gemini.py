#!/usr/bin/env python3
"""
測試案例生成器
使用 Gemini CLI 生成英文測試案例
"""

import os
import argparse
import sys
import json
import subprocess
from datetime import datetime
import logging

# 嘗試載入 python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 配置常數
GEMINI_CLI_COMMAND = "gemini"
PYTHON_DIR = "lib"
KEYWORDS_DIR = "keywords"
TESTCASE_DIR = "testcase"
OUTPUT_DIR = "output"
LOG_FILE = "gemini_usage_log.json"
SYSTEM_PROMPT_FILE = "GEMINI.md"  # 系統 prompt 配置檔案

# 超時設定
CLI_VERSION_TIMEOUT = 10
CLI_EXECUTION_TIMEOUT = 300

# 檔案編碼
ENCODING_FALLBACKS = ['utf-8', 'utf-8-sig', 'gbk']

# 過濾模式
DEBUG_PATTERNS = [
    'opentelemetry', 'flushing', 'clearcut', '[debug]', 
    'stderr:', 'stdout:', 'markdown'
]

# 從環境變數讀取 API 金鑰
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('gemini_generator.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


class UsageLogger:
    """使用情況記錄器"""
    
    def __init__(self, log_file):
        self.log_file = log_file
        self.start_time = None
        self.session_id = None
    
    def start_session(self):
        """開始新的會話記錄"""
        self.start_time = datetime.now()
        self.session_id = self.start_time.strftime("%Y%m%d_%H%M%S")
        logger.info(f"開始會話：{self.session_id}")
    
    def end_session(self, success=True, error_msg=None):
        """結束會話並儲存記錄"""
        if self.start_time is None:
            return
        
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        session_record = {
            "session_id": self.session_id,
            "timestamp": end_time.isoformat(),
            "duration_seconds": duration,
            "success": success,
            "error_message": error_msg
        }
        
        self.save_session_record(session_record)
        
        status_icon = "✅" if success else "❌"
        logger.info(f"{status_icon} 會話結束 - 持續時間：{duration:.1f}秒")
        
        if error_msg:
            logger.error(f"錯誤：{error_msg}")
    
    def save_session_record(self, session_record):
        """儲存會話記錄"""
        try:
            # 載入現有記錄
            log_data = self._load_existing_log()
            
            # 添加新記錄
            log_data["sessions"].append(session_record)
            
            # 更新統計摘要
            self._update_summary(log_data, session_record)
            
            # 儲存記錄
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, ensure_ascii=False, indent=2)
        
        except Exception as e:
            logger.error(f"儲存會話記錄時發生錯誤：{e}")
    
    def _load_existing_log(self):
        """載入現有日誌記錄"""
        if not os.path.exists(self.log_file):
            return {"sessions": [], "summary": {}}
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    return json.loads(content)
                else:
                    return {"sessions": [], "summary": {}}
        except (json.JSONDecodeError, ValueError):
            return {"sessions": [], "summary": {}}
    
    def _update_summary(self, log_data, session_record):
        """更新統計摘要"""
        summary = log_data.get("summary", {})
        summary["total_sessions"] = summary.get("total_sessions", 0) + 1
        summary["last_updated"] = datetime.now().isoformat()
        
        if session_record["success"]:
            summary["successful_sessions"] = summary.get("successful_sessions", 0) + 1
        else:
            summary["failed_sessions"] = summary.get("failed_sessions", 0) + 1
        
        log_data["summary"] = summary


class TestCaseGenerator:
    """英文測試案例生成器"""
    
    def __init__(self):
        self.usage_logger = UsageLogger(LOG_FILE)
    
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
        if not GEMINI_API_KEY:
            raise Exception("未設定 GEMINI_API_KEY 環境變數")
        
        os.environ['GEMINI_API_KEY'] = GEMINI_API_KEY
        logger.info("✅ 認證設定完成")
    
    def call_gemini_cli(self, prompt_content, npc_personality=None):
        """呼叫 Gemini CLI"""
        try:
            # 讀取系統 prompt
            system_prompt = self._read_system_prompt()
            
            # 收集 testcase/ 和 keywords/ 目錄的檔案內容
            context_files = self._gather_context_files([TESTCASE_DIR, KEYWORDS_DIR, PYTHON_DIR])
            
            # 建構完整的提示：系統提示 + 用戶提示 + 參考檔案
            full_prompt = self._build_prompt_with_system(system_prompt, prompt_content, context_files, npc_personality)
            
            # 使用 -p 參數通過 stdin 傳遞完整提示
            cmd = [GEMINI_CLI_COMMAND, "--no-telemetry", "--no-telemetry-log-prompts", "-p"]
            logger.info(f"執行 Gemini CLI (含系統 prompt)，傳遞完整配置")
            
            result = subprocess.run(
                cmd,
                input=full_prompt,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=CLI_EXECUTION_TIMEOUT
            )
            
            if result.returncode != 0:
                error_msg = f"返回代碼：{result.returncode}"
                if result.stderr:
                    error_msg += f" | {result.stderr[:200]}"
                raise Exception(f"Gemini CLI 失敗：{error_msg}")
            
            output_text = self.extract_output_text(result.stdout)
            
            if not output_text:
                raise Exception("未能提取到有效的輸出內容")
            
            logger.info(f"✅ 成功生成回應 ({len(output_text)} 字符)")
            
            return output_text
                
        except subprocess.TimeoutExpired:
            raise Exception("Gemini CLI 執行超時")
        except Exception as e:
            logger.error(f"呼叫 Gemini CLI 失敗：{e}")
            raise
    
    def extract_output_text(self, stdout):
        """擷取所有輸出文字"""
        if not stdout:
            return None
        
        # 直接返回所有輸出文字，不做任何過濾
        logger.info(f"擷取完整輸出 ({len(stdout)} 字符)")
        return stdout.strip()
    
    def generate_output_filename(self, prompt_file):
        """生成輸出檔名"""
        base_name = os.path.splitext(os.path.basename(prompt_file))[0]
        return f"{base_name}-enhanced"
    
    def save_testcase_file(self, output_text, base_filename):
        """儲存測試案例到 output/ 目錄"""
        # 確保 output 目錄存在
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            
        testcase_filename = f"{base_filename}.txt"
        testcase_path = os.path.join(OUTPUT_DIR, testcase_filename)
        
        try:
            with open(testcase_path, 'w', encoding='utf-8') as f:
                f.write(output_text)
            
            logger.info(f"✅ 已儲存：{testcase_path}")
            return testcase_path
            
        except Exception as e:
            logger.error(f"儲存失敗：{e}")
            raise
    
    def _read_prompt_file(self, prompt_file):
        """安全讀取 prompt 檔案"""
        if not os.path.exists(prompt_file):
            raise FileNotFoundError(f"Prompt 檔案不存在：{prompt_file}")
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content.strip():
                raise ValueError(f"Prompt 檔案為空：{prompt_file}")
            
            return content
        except UnicodeDecodeError:
            # 嘗試其他編碼
            for encoding in ENCODING_FALLBACKS[1:]:  # 跳過 utf-8，已經試過
                try:
                    with open(prompt_file, 'r', encoding=encoding) as f:
                        return f.read()
                except UnicodeDecodeError:
                    continue
            raise ValueError(f"無法讀取 Prompt 檔案，編碼不支援：{prompt_file}")
        except Exception as e:
            raise ValueError(f"讀取 prompt 檔案失敗：{e}")
    
    def _gather_context_files(self, directories):
        """收集參考檔案"""
        context_files = []
        
        for directory in directories:
            if not os.path.exists(directory):
                continue
            
            for root, dirs, files in os.walk(directory):
                # 跳過隱藏目錄
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # 只包含相關檔案類型
                    if not file_path.endswith(('.robot', '.py', '.md', '.txt', '.yaml', '.yml')):
                        continue
                    
                    try:
                        # 使用相同的編碼回退策略
                        content = None
                        for encoding in ENCODING_FALLBACKS:
                            try:
                                with open(file_path, 'r', encoding=encoding) as f:
                                    content = f.read()
                                break
                            except UnicodeDecodeError:
                                continue
                        
                        if content:
                            context_files.append({
                                'path': file_path,
                                'content': content
                            })
                    except Exception as e:
                        logger.warning(f"無法讀取檔案 {file_path}：{e}")
                        continue
        
        logger.info(f"載入 {len(context_files)} 個參考檔案")
        return context_files
    
    def _read_system_prompt(self):
        """讀取系統 prompt 配置檔案"""
        if not os.path.exists(SYSTEM_PROMPT_FILE):
            logger.warning(f"系統 prompt 檔案不存在：{SYSTEM_PROMPT_FILE}")
            return ""
        
        try:
            for encoding in ENCODING_FALLBACKS:
                try:
                    with open(SYSTEM_PROMPT_FILE, 'r', encoding=encoding) as f:
                        content = f.read()
                    logger.info(f"✅ 成功讀取系統 prompt ({len(content)} 字符)")
                    return content
                except UnicodeDecodeError:
                    continue
            raise ValueError(f"無法讀取系統 prompt 檔案，編碼不支援：{SYSTEM_PROMPT_FILE}")
        except Exception as e:
            logger.error(f"讀取系統 prompt 失敗：{e}")
            return ""
    
    def _build_prompt_with_system(self, system_prompt, prompt_content, context_files, npc_personality=None):
        """建構包含系統 prompt 的完整提示"""
        parts = []
        
        # 系統 prompt
        if system_prompt:
            parts.extend([
                "=== 系統配置 ===",
                system_prompt,
                ""
            ])
        
        # NPC 個性配置（如果提供）
        if npc_personality:
            parts.extend([
                "=== NPC 個性配置 ===",
                f"角色名稱: {npc_personality.get('name', '未知')}",
                f"個性描述: {npc_personality.get('personality', '未設定')}",
                f"背景故事: {npc_personality.get('backgroundStory', '待發掘')}",
                f"當前情緒: {npc_personality.get('currentMood', 'neutral')}",
                ""
            ])
        
        # 用戶輸入
        parts.extend([
            "=== 用戶輸入 ===", 
            prompt_content,
            ""
        ])
        
        # 參考檔案
        if context_files:
            parts.append("=== 參考檔案 ===")
            for file_info in context_files:
                parts.extend([
                    f"--- {file_info['path']} ---",
                    file_info['content'],
                    ""
                ])
        
        full_prompt = "\n".join(parts)
        return full_prompt
    
    def _build_prompt(self, prompt_content, context_files):
        """建構完整的提示（向下相容）"""
        parts = [
            "=== 測試計畫 ===", 
            prompt_content,
            ""
        ]
        
        if context_files:
            parts.append("=== 參考檔案 ===")
            for file_info in context_files:
                parts.extend([
                    f"--- {file_info['path']} ---",
                    file_info['content'],
                    ""
                ])
        
        full_prompt = "\n".join(parts)
        return full_prompt
    
    def generate_npc_response(self, user_message, npc_personality=None):
        """生成 NPC 對話回應"""
        self.usage_logger.start_session()
        
        try:
            logger.info("1. 檢查 Gemini CLI...")
            self.check_gemini_cli()
            
            logger.info("2. 設定認證...")
            self.setup_auth()
            
            logger.info("3. 生成 NPC 回應...")
            output_text = self.call_gemini_cli(user_message, npc_personality)
            
            logger.info("✅ 成功生成 NPC 回應")
            
            self.usage_logger.end_session(success=True)
            return output_text
            
        except Exception as e:
            logger.error(f"生成 NPC 回應失敗：{e}")
            self.usage_logger.end_session(success=False, error_msg=str(e))
            raise
    
    def generate_test_suite(self, prompt_file):
        """生成測試套件"""
        self.usage_logger.start_session()
        
        try:
            logger.info("1. 檢查 Gemini CLI...")
            self.check_gemini_cli()
            
            logger.info("2. 設定認證...")
            self.setup_auth()
            
            logger.info("3. 驗證目錄...")
            for directory in [KEYWORDS_DIR, TESTCASE_DIR]:
                if not os.path.exists(directory):
                    raise FileNotFoundError(f"目錄不存在：{directory}")
            
            logger.info("4. 讀取 prompt 檔案...")
            prompt_content = self._read_prompt_file(prompt_file)
            
            logger.info("5. 生成測試案例...")
            output_text = self.call_gemini_cli(prompt_content)
            
            logger.info("6. 儲存檔案...")
            base_filename = self.generate_output_filename(prompt_file)
            testcase_path = self.save_testcase_file(output_text, base_filename)
            
            print(f"\n✅ 成功生成英文測試案例")
            print(f"📁 檔案：{testcase_path}")
            
            self.usage_logger.end_session(success=True)
            return testcase_path
            
        except Exception as e:
            logger.error(f"生成失敗：{e}")
            self.usage_logger.end_session(success=False, error_msg=str(e))
            raise


def show_usage_statistics():
    """顯示使用統計"""
    if not os.path.exists(LOG_FILE):
        print("尚無使用記錄")
        return
    
    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            log_data = json.load(f)
        
        summary = log_data.get("summary", {})
        sessions = log_data.get("sessions", [])
        
        print(f"\n📊 使用統計")
        print(f"執行次數：{summary.get('total_sessions', 0)}")
        print(f"成功次數：{summary.get('successful_sessions', 0)}")
        print(f"失敗次數：{summary.get('failed_sessions', 0)}")
        
        if sessions:
            print(f"\n最近執行：")
            for session in sessions[-5:]:
                status = "✅" if session.get('success', False) else "❌"
                duration = session.get('duration_seconds', 0)
                timestamp = session.get('timestamp', '')[:16].replace('T', ' ')
                
                print(f"  {status} {timestamp} | {duration:.1f}秒")
        
    except Exception as e:
        print(f"讀取統計失敗：{e}")


def main():
    """主函數"""
    parser = argparse.ArgumentParser(
        description="心語小鎮 LLM 生成器 - 支援測試案例生成與 NPC 對話",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""使用範例：
  # 生成測試案例
  python gemini.py prompt.txt
  
  # NPC 對話模式
  python gemini.py --chat "你好，今天天氣真好" --npc emma
  
  # 顯示使用統計
  python gemini.py --stats"""
    )
    
    parser.add_argument('prompt_file', nargs='?', help='Prompt 檔案路徑（測試案例模式）')
    parser.add_argument('--stats', action='store_true', help='顯示使用統計')
    parser.add_argument('--chat', type=str, help='NPC 對話模式 - 用戶訊息')
    parser.add_argument('--npc', type=str, help='NPC 角色名稱（配合 --chat 使用）')
    parser.add_argument('--npc-data', type=str, help='NPC 個性數據 JSON（配合 --chat 使用）')
    
    args = parser.parse_args()
    
    if args.stats:
        show_usage_statistics()
        return
    
    # NPC 對話模式
    if args.chat:
        try:
            generator = TestCaseGenerator()
            
            # 構建 NPC 個性配置
            npc_personality = None
            
            # 優先使用直接傳遞的 NPC 數據
            if args.npc_data:
                try:
                    npc_personality = json.loads(args.npc_data)
                except json.JSONDecodeError as e:
                    logger.error(f"無法解析 NPC 數據 JSON: {e}")
                    sys.exit(1)
            elif args.npc:
                # 使用預設的 NPC 配置
                npc_configs = {
                    'emma': {
                        'name': '艾瑪',
                        'personality': '溫柔細心的咖啡店店主，善於傾聽，用溫暖的語調關心他人',
                        'backgroundStory': '在小鎮經營一家溫馨的咖啡店，喜歡為客人沖泡特製咖啡',
                        'currentMood': 'warm'
                    },
                    'lily': {
                        'name': '莉莉',
                        'personality': '活潑陽光的花店女孩，對生活充滿好奇心和熱情',
                        'backgroundStory': '熱愛花卉植物，總是能從大自然中找到生活的美好',
                        'currentMood': 'cheerful'
                    }
                }
                npc_personality = npc_configs.get(args.npc.lower())
            
            # 生成 NPC 回應
            response = generator.generate_npc_response(args.chat, npc_personality)
            
            print(f"\n🤖 NPC 回應：")
            print(f"{'='*50}")
            print(response)
            print(f"{'='*50}")
            
        except KeyboardInterrupt:
            logger.info("用戶中斷")
            sys.exit(1)
        except Exception as e:
            logger.error(f"NPC 對話生成失敗：{e}")
            sys.exit(1)
        return
    
    # 測試案例生成模式
    if not args.prompt_file:
        parser.print_help()
        sys.exit(1)
    
    try:
        generator = TestCaseGenerator()
        generator.generate_test_suite(args.prompt_file)
        
    except KeyboardInterrupt:
        logger.info("用戶中斷")
        sys.exit(1)
        
    except FileNotFoundError as e:
        logger.error(f"檔案不存在：{e}")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"執行失敗：{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()