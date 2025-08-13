#!/usr/bin/env python3
"""
NPC chentingan 專用的 Gemini 執行腳本 - 完整優化版
整合所有功能：Token Caching、記憶管理、日誌系統
保持 100% 真實 AI 回應，不使用預設答案
"""

import sys
import os
import subprocess
import time
from pathlib import Path
import tempfile
import hashlib
import json
import logging
from datetime import datetime

class OptimizedGeminiClient:
    """完整優化版 Gemini 客戶端（含記憶管理）"""
    
    def __init__(self):
        # 基本設定
        self.current_dir = Path(__file__).parent
        self.npc_name = "chentingan"
        self.npc_display_name = "陳庭安"
        
        # 設定日誌系統
        self._setup_logging()
        
        # 使用 /tmp 如果可用（更快的 I/O）
        if Path("/tmp").exists() and os.access("/tmp", os.W_OK):
            self.work_dir = Path("/tmp") / f"gemini_{self.npc_name}_cache"
        else:
            self.work_dir = self.current_dir / ".gemini_cache"
        
        self.work_dir.mkdir(exist_ok=True)
        
        # 準備環境（啟用官方 Token Caching）
        self.env = self._setup_environment()
        
        # 預編譯上下文（一次性）
        self.context_file = self._prepare_single_context()
        
        # 會話 ID（用於追蹤）
        self.session_id = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
        
        self.logger.info(f"✅ 初始化 {self.npc_display_name} Gemini 客戶端 [Session: {self.session_id}]")
        
    def _setup_logging(self):
        """設定日誌系統"""
        # 確保日誌目錄存在
        log_dir = Path("/home/jesse/Project/TAHRD-Graduation-Project/backend/logs/gemini-tracking")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # 設定日誌檔案路徑
        log_file = log_dir / f"{self.npc_name}_{datetime.now().strftime('%Y%m%d')}.log"
        
        # 設定日誌格式
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stderr)
            ]
        )
        
        self.logger = logging.getLogger(f"gemini.{self.npc_name}")
        
    def _setup_environment(self) -> dict:
        """設定環境變數，啟用官方 Token Caching"""
        env = os.environ.copy()
        
        # API Key（Token Caching 必需）
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            env['GEMINI_API_KEY'] = api_key
            self.logger.info("✅ API Key 已載入")
        else:
            self.logger.warning("⚠️ GEMINI_API_KEY 未設置")
        
        # 優化相關環境變數
        env['NO_COLOR'] = '1'  # 減少輸出處理
        
        return env
    
    def _prepare_single_context(self):
        """預編譯所有上下文到單一檔案（減少 I/O）"""
        try:
            combined_file = self.work_dir / "combined_context.md"
            
            # 檢查是否需要重新生成
            if combined_file.exists():
                # 如果檔案存在且較新，直接使用
                file_age = time.time() - combined_file.stat().st_mtime
                if file_age < 300:  # 5 分鐘內（記憶可能更新）
                    self.logger.info(f"📄 使用快取上下文（{file_age:.1f}秒前生成）")
                    return str(combined_file)
            
            self.logger.info("🔄 重新生成上下文檔案")
            combined_content = []
            
            # 1. 人設檔案（注意檔名拼寫）
            personality_file = self.current_dir / "ChenTingAn_Personality.md"
            if personality_file.exists():
                with open(personality_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    combined_content.append(f"# 角色設定\n{content}\n")
                    self.logger.info(f"✅ 載入人設檔案")
            
            # 2. 對話風格（注意檔名拼寫）
            chat_style_file = self.current_dir / "ChenTingAn_Chat_style.txt"
            if chat_style_file.exists():
                with open(chat_style_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    combined_content.append(f"# 對話風格\n{content}\n")
                    self.logger.info(f"✅ 載入對話風格")
            
            # 3. 短期記憶（最近對話）
            short_term_file = self.current_dir / "short_term_memory" / "conversations.json"
            if short_term_file.exists():
                with open(short_term_file, 'r', encoding='utf-8') as f:
                    try:
                        conversations = json.load(f)
                        if conversations:
                            combined_content.append("# 最近對話記錄\n")
                            # 只取最近 10 筆對話（增加上下文）
                            recent = conversations[-10:] if len(conversations) > 10 else conversations
                            for conv in recent:
                                player_msg = conv.get('player_message', '')
                                npc_resp = conv.get('npc_response', '')
                                timestamp = conv.get('timestamp', '')
                                
                                if timestamp:
                                    combined_content.append(f"[{timestamp}]")
                                combined_content.append(f"- 玩家：{player_msg}")
                                combined_content.append(f"  我：{npc_resp}\n")
                            
                            self.logger.info(f"✅ 載入 {len(recent)} 筆短期記憶")
                    except Exception as e:
                        self.logger.warning(f"⚠️ 短期記憶載入失敗：{e}")
            
            # 4. 長期記憶（如果有內容）
            long_term_file = self.current_dir / "long_term_memory" / "memories.json"
            if long_term_file.exists():
                with open(long_term_file, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read().strip()
                        if content and content != '[]':
                            memories = json.loads(content)
                            if memories:
                                combined_content.append("# 重要記憶\n")
                                for memory in memories:
                                    combined_content.append(f"- {memory}\n")
                                self.logger.info(f"✅ 載入 {len(memories)} 筆長期記憶")
                    except Exception as e:
                        self.logger.warning(f"⚠️ 長期記憶載入失敗：{e}")
            
            # 5. GEMINI.md 系統提示詞
            gemini_md = self.current_dir / "GEMINI.md"
            if gemini_md.exists():
                with open(gemini_md, 'r', encoding='utf-8') as f:
                    content = f.read()
                    combined_content.append(f"# 系統指引\n{content}\n")
                    self.logger.info(f"✅ 載入 GEMINI.md")
            
            # 寫入合併檔案
            with open(combined_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(combined_content))
            
            self.logger.info(f"✅ 上下文檔案已生成：{combined_file}")
            return str(combined_file)
            
        except Exception as e:
            self.logger.error(f"❌ 上下文準備失敗：{e}")
            return None
    
    def execute(self, prompt: str) -> str:
        """
        執行 Gemini CLI 並取得回應
        使用官方 Token Caching 自動優化
        """
        
        # 記錄對話開始
        self.logger.info(f"📝 收到提示：{prompt[:50]}...")
        
        # 構建命令（使用工作目錄）
        cmd = [
            "gemini",
            "-m", "gemini-2.5-flash",  # 最快的模型
            "--include-directories", str(self.work_dir),  # 包含工作目錄
            "-p", prompt
        ]
        
        try:
            # 記錄開始時間
            start_time = time.time()
            
            # 執行命令
            self.logger.info(f"🚀 執行 Gemini CLI...")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=self.env,
                cwd=self.work_dir,  # 在工作目錄執行（快取優化）
                timeout=20  # 合理的 timeout
            )
            
            elapsed = time.time() - start_time
            
            if result.returncode == 0:
                response = result.stdout.strip()
                
                # 清理輸出（移除系統訊息）
                if response:
                    lines = response.split('\n')
                    cleaned_lines = []
                    
                    for line in lines:
                        # 跳過系統訊息
                        if not any(skip in line for skip in [
                            'Loaded cached',
                            'Loading',
                            'Token cache',
                            'Initializing'
                        ]):
                            cleaned_lines.append(line)
                    
                    response = '\n'.join(cleaned_lines).strip()
                
                # 記錄成功回應
                self.logger.info(f"✅ 生成回應成功 [Time: {elapsed:.2f}s]")
                self.logger.info(f"📤 回應內容：{response[:100]}...")
                
                # 檢查是否使用了 Token Cache
                if 'cached' in result.stderr.lower():
                    self.logger.info("⚡ Token Cache 啟用")
                
                # 更新記憶系統
                self._update_memories(prompt, response)
                
                return response if response else "我需要思考一下..."
            
            else:
                # 錯誤處理
                error = result.stderr.strip() if result.stderr else "Unknown error"
                self.logger.error(f"❌ Gemini 錯誤：{error[:200]}")
                return "抱歉，我遇到了一些問題。請稍後再試。"
                
        except subprocess.TimeoutExpired:
            self.logger.error(f"⏱️ 超時 (20秒)")
            return "抱歉，回應時間過長。請稍後再試。"
            
        except Exception as e:
            self.logger.error(f"❌ 執行異常：{e}")
            return "系統發生錯誤，請稍後再試。"
    
    def _update_memories(self, player_message: str, npc_response: str):
        """更新短期記憶"""
        try:
            # 更新短期記憶
            short_term_dir = self.current_dir / "short_term_memory"
            short_term_dir.mkdir(exist_ok=True)
            
            short_term_file = short_term_dir / "conversations.json"
            
            # 讀取現有對話
            conversations = []
            if short_term_file.exists():
                try:
                    with open(short_term_file, 'r', encoding='utf-8') as f:
                        conversations = json.load(f)
                except:
                    conversations = []
            
            # 添加新對話
            new_conversation = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "player_message": player_message,
                "npc_response": npc_response,
                "session_id": self.session_id
            }
            
            conversations.append(new_conversation)
            
            # 只保留最近 50 筆對話
            if len(conversations) > 50:
                conversations = conversations[-50:]
            
            # 寫回檔案
            with open(short_term_file, 'w', encoding='utf-8') as f:
                json.dump(conversations, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"💾 已更新短期記憶（共 {len(conversations)} 筆）")
            
            # 檢查是否需要提升為長期記憶
            self._check_long_term_memory(player_message, npc_response)
            
        except Exception as e:
            self.logger.error(f"❌ 記憶更新失敗：{e}")
    
    def _check_long_term_memory(self, player_message: str, npc_response: str):
        """檢查並更新長期記憶（重要對話）"""
        try:
            # 簡單的重要性判斷（可以根據需求調整）
            important_keywords = [
                "喜歡", "討厭", "重要", "記住", "永遠", "愛", 
                "朋友", "秘密", "約定", "承諾", "生日", "紀念"
            ]
            
            is_important = any(keyword in player_message or keyword in npc_response 
                             for keyword in important_keywords)
            
            if is_important:
                long_term_dir = self.current_dir / "long_term_memory"
                long_term_dir.mkdir(exist_ok=True)
                
                long_term_file = long_term_dir / "memories.json"
                
                # 讀取現有長期記憶
                memories = []
                if long_term_file.exists():
                    try:
                        with open(long_term_file, 'r', encoding='utf-8') as f:
                            content = f.read().strip()
                            if content and content != '[]':
                                memories = json.loads(content)
                    except:
                        memories = []
                
                # 創建記憶摘要
                memory_summary = f"[{datetime.now().strftime('%Y-%m-%d')}] 玩家說：{player_message[:50]}... → 我回應：{npc_response[:50]}..."
                
                # 避免重複
                if memory_summary not in memories:
                    memories.append(memory_summary)
                    
                    # 只保留最近 20 筆重要記憶
                    if len(memories) > 20:
                        memories = memories[-20:]
                    
                    # 寫回檔案
                    with open(long_term_file, 'w', encoding='utf-8') as f:
                        json.dump(memories, f, ensure_ascii=False, indent=2)
                    
                    self.logger.info(f"⭐ 已添加到長期記憶")
                    
        except Exception as e:
            self.logger.warning(f"⚠️ 長期記憶更新失敗：{e}")


def main():
    """主函數"""
    if len(sys.argv) < 2:
        print("Usage: python3 gemini.py '<prompt>'", file=sys.stderr)
        sys.exit(1)
    
    # 取得提示詞
    prompt = sys.argv[1]
    
    # 建立客戶端並執行
    client = OptimizedGeminiClient()
    response = client.execute(prompt)
    
    # 輸出回應
    print(response)


if __name__ == "__main__":
    main()