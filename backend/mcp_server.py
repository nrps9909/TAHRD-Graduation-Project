#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP Server for Heart Whisper Town NPCs
使用 Gemini CLI 的 MCP 功能提供高效能 NPC 對話服務
"""

import os
import json
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import uvloop  # 高效能事件循環
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
from collections import OrderedDict
import time

# 設定 uvloop 為預設事件循環
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 應用
app = FastAPI(title="Heart Whisper MCP Server", version="2.0")

# 請求模型
class DialogueRequest(BaseModel):
    npc_id: str
    message: str
    context: Optional[Dict[str, Any]] = {}
    session_id: Optional[str] = None
    
class MemoryUpdate(BaseModel):
    npc_id: str
    memory_type: str
    content: str
    importance: float = 0.5

class NPCDialogueServer:
    """NPC 對話 MCP 服務器"""
    
    def __init__(self):
        self.personalities_dir = Path("personalities")
        self.memories_dir = Path("memories")
        self.temp_dir = Path("temp")
        self.temp_dir.mkdir(exist_ok=True)
        
        # 記憶快取 (LRU)
        self.memory_cache = OrderedDict()
        self.max_cache_size = 100
        
        # 會話管理
        self.sessions = {}
        
        # NPC 名稱映射
        self.npc_map = {
            "npc-1": "lupeixiu",
            "npc-2": "liuyucen",
            "npc-3": "chentingan"
        }
        
        # 預載入個性檔案
        self.personalities = self._preload_personalities()
        logger.info(f"✅ 預載入 {len(self.personalities)} 個 NPC 個性")
    
    def _preload_personalities(self) -> Dict[str, Dict[str, str]]:
        """預載入所有 NPC 個性檔案"""
        personalities = {}
        
        name_mapping = {
            'lupeixiu': 'LuPeiXiu',
            'liuyucen': 'LiuYuCen', 
            'chentingan': 'ChenTingAn'
        }
        
        for npc_id, npc_name in self.npc_map.items():
            formatted_name = name_mapping.get(npc_name, npc_name.title())
            personality_file = self.memories_dir / npc_name / f"{formatted_name}_Personality.md"
            chat_style_file = self.memories_dir / npc_name / f"{formatted_name}_Chat_style.txt"
            
            if personality_file.exists():
                personality_content = personality_file.read_text(encoding='utf-8')
                chat_style_content = chat_style_file.read_text(encoding='utf-8') if chat_style_file.exists() else ''
                
                personalities[npc_id] = {
                    'name': npc_name,
                    'personality': personality_content,
                    'chat_style': chat_style_content
                }
                
        return personalities
    
    async def _call_gemini_mcp(self, prompt: str, npc_id: str, include_dirs: List[str] = None, track_id: str = None) -> str:
        """使用 Gemini CLI 的 MCP 功能生成回應"""
        npc_name = self.npc_map.get(npc_id, "")
        
        # 追蹤資訊
        tracking_data = {
            "track_id": track_id,
            "timestamp": datetime.now().isoformat(),
            "npc_id": npc_id,
            "npc_name": npc_name,
            "prompt": prompt,
            "files_loaded": {
                "personality": [],
                "memories": [],
                "shared": [],
                "include_dirs": []
            }
        }
        
        # 構建 Gemini CLI 命令
        cmd = [
            "gemini",
            "-p", prompt,
            "--model", "gemini-2.5-flash-lite"  # 使用 2.5-flash 模型
        ]
        
        # 記錄載入的檔案
        # 個性檔案
        personality_file = self.personalities_dir / f"{npc_name}_personality.txt"
        if personality_file.exists():
            tracking_data["files_loaded"]["personality"].append(str(personality_file))
        
        history_file = self.personalities_dir / f"{npc_name}_chat_history.txt"
        if history_file.exists():
            tracking_data["files_loaded"]["personality"].append(str(history_file))
        
        # 添加記憶目錄
        if include_dirs:
            cmd.extend(["--include-directories", ",".join(include_dirs)])
            tracking_data["files_loaded"]["include_dirs"] = include_dirs
            
            # 記錄每個目錄中的記憶檔案（避免載入.md檔案）
            for dir_path in include_dirs:
                dir_path_obj = Path(dir_path)
                # 檢查是否有個性或聊天風格檔案 (使用實際檔名格式)
                name_mapping = {
                    'lupeixiu': 'LuPeiXiu',
                    'liuyucen': 'LiuYuCen', 
                    'chentingan': 'ChenTingAn'
                }
                formatted_name = name_mapping.get(npc_name, npc_name.title())
                personality_file = dir_path_obj / f"{formatted_name}_Personality.md"
                chat_style_file = dir_path_obj / f"{formatted_name}_Chat_style.txt"
                
                if personality_file.exists():
                    tracking_data["files_loaded"]["memories"].append(str(personality_file))
                if chat_style_file.exists():
                    tracking_data["files_loaded"]["memories"].append(str(chat_style_file))
        else:
            # 預設載入該 NPC 的記憶目錄
            memory_path = self.memories_dir / npc_name
            if memory_path.exists():
                cmd.extend(["--include-directories", str(memory_path)])
                tracking_data["files_loaded"]["include_dirs"].append(str(memory_path))
                
                # 記錄實際的記憶檔案（避免載入.md檔案）
                name_mapping = {
                    'lupeixiu': 'LuPeiXiu',
                    'liuyucen': 'LiuYuCen', 
                    'chentingan': 'ChenTingAn'
                }
                formatted_name = name_mapping.get(npc_name, npc_name.title())
                personality_file = memory_path / f"{formatted_name}_Personality.md"
                chat_style_file = memory_path / f"{formatted_name}_Chat_style.txt"
                
                if personality_file.exists():
                    tracking_data["files_loaded"]["memories"].append(str(personality_file))
                if chat_style_file.exists():
                    tracking_data["files_loaded"]["memories"].append(str(chat_style_file))
        
        # 共享記憶 - 檢查是否有共享記憶檔案（避免.md檔案）
        shared_dir = self.memories_dir / "shared"
        if shared_dir.exists():
            # 可以添加共享記憶檔案的邏輯
            for file_path in shared_dir.iterdir():
                if file_path.is_file() and not file_path.suffix == '.md':
                    tracking_data["files_loaded"]["shared"].append(str(file_path))
        
        start_time = time.time()
        
        try:
            # 執行 Gemini CLI
            # 確保環境變數都是字串
            env = dict(os.environ)
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                env['GEMINI_API_KEY'] = str(api_key)
            
            logger.info(f"🚀 執行 Gemini CLI: {' '.join(cmd[:4])}...")
            tracking_data["cli_command"] = ' '.join(cmd)
            
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=30  # 增加超時時間到 30 秒
            )
            
            response_time = (time.time() - start_time) * 1000  # 轉換為毫秒
            
            if result.returncode == 0:
                response = stdout.decode('utf-8').strip()
                
                # 記錄成功的追蹤資訊
                tracking_data["response"] = response
                tracking_data["response_time_ms"] = response_time
                tracking_data["success"] = True
                tracking_data["cache_hit"] = False
                
                # 寫入追蹤檔案
                self._save_tracking_data(tracking_data)
                
                # 更新快取
                cache_key = hashlib.md5(f"{prompt}{npc_id}".encode()).hexdigest()
                self._update_cache(cache_key, response)
                
                return response
            else:
                error_msg = stderr.decode('utf-8')
                logger.error(f"Gemini MCP 錯誤: {error_msg}")
                
                # 記錄錯誤
                tracking_data["success"] = False
                tracking_data["error"] = error_msg
                tracking_data["response_time_ms"] = response_time
                self._save_tracking_data(tracking_data)
                
                return self._get_fallback_response(npc_id)
                
        except asyncio.TimeoutError:
            logger.error("Gemini MCP 超時")
            tracking_data["success"] = False
            tracking_data["error"] = "Timeout after 30 seconds"
            tracking_data["response_time_ms"] = 30000
            self._save_tracking_data(tracking_data)
            return self._get_fallback_response(npc_id)
        except Exception as e:
            logger.error(f"Gemini MCP 異常: {e}")
            tracking_data["success"] = False
            tracking_data["error"] = str(e)
            tracking_data["response_time_ms"] = (time.time() - start_time) * 1000
            self._save_tracking_data(tracking_data)
            return self._get_fallback_response(npc_id)
    
    def _update_cache(self, key: str, value: str):
        """更新 LRU 快取"""
        if key in self.memory_cache:
            del self.memory_cache[key]
        elif len(self.memory_cache) >= self.max_cache_size:
            self.memory_cache.popitem(last=False)
        self.memory_cache[key] = value
    
    def _get_from_cache(self, key: str) -> Optional[str]:
        """從快取獲取"""
        if key in self.memory_cache:
            # 移到最後（LRU）
            value = self.memory_cache.pop(key)
            self.memory_cache[key] = value
            return value
        return None
    
    def _get_fallback_response(self, npc_id: str) -> str:
        """獲取備用回應"""
        npc_name = self.npc_map.get(npc_id, "NPC")
        
        fallbacks = {
            "lupeixiu": [
                "這讓我想起了張愛玲的一句話...",
                "有時候，細節真的很重要呢。",
                "讓我想想該怎麼說..."
            ],
            "liuyucen": [
                "哇，這個問題好有趣！",
                "我在 threads 上看過類似的討論耶！",
                "等等，讓我整理一下思緒..."
            ],
            "chentingan": [
                "這個問題很 chill 啊！",
                "讓我用另一個角度來看...",
                "有意思，這讓我想到了一個想法..."
            ]
        }
        
        import random
        responses = fallbacks.get(npc_name, ["嗯，讓我想想..."])
        return random.choice(responses)
    
    def _save_tracking_data(self, data: Dict[str, Any]):
        """保存追蹤資訊到 NPC 專屬的 JSON 檔案"""
        try:
            # 確保日誌目錄存在
            log_dir = Path("logs/gemini-tracking")
            log_dir.mkdir(parents=True, exist_ok=True)
            
            # 從資料中取得 NPC 名稱
            npc_name = data.get('npc_name', 'unknown')
            safe_name = npc_name.lower().replace(' ', '-')
            
            # 使用 NPC 名稱和日期作為檔案名
            date_str = datetime.now().strftime('%Y-%m-%d')
            log_file = log_dir / f"mcp-{safe_name}-{date_str}.json"
            
            # 讀取現有資料
            existing_data = []
            if log_file.exists():
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except:
                    existing_data = []
            
            # 添加新資料
            existing_data.append(data)
            
            # 寫回檔案
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)
                
            logger.info(f"💾 已保存 {npc_name} 的追蹤資料到 {log_file}")
            
        except Exception as e:
            logger.error(f"保存追蹤資料失敗: {e}")
    
    async def generate_response(
        self,
        npc_id: str,
        message: str,
        context: Dict[str, Any] = None,
        session_id: str = None
    ) -> str:
        """生成 NPC 回應（核心功能）"""
        
        # 檢查快取
        cache_key = hashlib.md5(f"{message}{npc_id}{session_id}".encode()).hexdigest()
        cached = self._get_from_cache(cache_key)
        if cached:
            logger.info(f"✨ 快取命中: {npc_id}")
            return cached
        
        # 獲取 NPC 資料
        npc_data = self.personalities.get(npc_id, {})
        if not npc_data:
            return "抱歉，我現在有點困惑..."
        
        # 構建提示詞
        npc_name = npc_data['name']
        
        # 獲取會話歷史
        session_history = ""
        if session_id and session_id in self.sessions:
            history = self.sessions[session_id].get('history', [])
            session_history = "\n".join([f"{h['role']}: {h['content']}" for h in history[-5:]])
        
        # 載入共享記憶
        shared_memory_path = self.memories_dir / "shared" / "GEMINI.md"
        shared_context = ""
        if shared_memory_path.exists():
            shared_context = f"\n共享記憶：\n{shared_memory_path.read_text(encoding='utf-8')}"
        
        # 簡化提示詞 - 檢查message是否已包含完整上下文
        if message.startswith("你是「") and "對話" in message:
            # message已包含完整上下文，直接使用
            prompt = message
        else:
            # message只是簡單內容，需要添加上下文
            prompt = f"你是「{self._get_display_name(npc_id)}」，正在與玩家對話。玩家說：{message}"
        
        # 生成追蹤 ID
        track_id = f"mcp-{session_id or 'no-session'}-{int(time.time() * 1000)}"
        
        # 呼叫 Gemini MCP
        response = await self._call_gemini_mcp(
            prompt=prompt,
            npc_id=npc_id,
            include_dirs=[str(self.memories_dir / npc_name), str(self.memories_dir / "shared")],
            track_id=track_id
        )
        
        # 更新會話歷史
        if session_id:
            if session_id not in self.sessions:
                self.sessions[session_id] = {'history': [], 'npc_id': npc_id}
            
            self.sessions[session_id]['history'].append(
                {'role': '玩家', 'content': message, 'timestamp': datetime.now().isoformat()}
            )
            self.sessions[session_id]['history'].append(
                {'role': self._get_display_name(npc_id), 'content': response, 'timestamp': datetime.now().isoformat()}
            )
            
            # 限制歷史長度
            if len(self.sessions[session_id]['history']) > 20:
                self.sessions[session_id]['history'] = self.sessions[session_id]['history'][-20:]
        
        # 更新快取
        self._update_cache(cache_key, response)
        
        return response
    
    def _get_display_name(self, npc_id: str) -> str:
        """獲取 NPC 顯示名稱"""
        names = {
            "npc-1": "鋁配咻",
            "npc-2": "流羽岑",
            "npc-3": "沉停鞍"
        }
        return names.get(npc_id, "NPC")
    
    async def update_memory(self, npc_id: str, memory_type: str, content: str, importance: float = 0.5):
        """更新 NPC 記憶"""
        npc_name = self.npc_map.get(npc_id, "")
        if not npc_name:
            return False
        
        # 更新記憶檔案 - 使用新的檔案命名
        name_mapping = {
            'lupeixiu': 'LuPeiXiu',
            'liuyucen': 'LiuYuCen', 
            'chentingan': 'ChenTingAn'
        }
        formatted_name = name_mapping.get(npc_name, npc_name.title())
        memory_file = self.memories_dir / npc_name / f"{formatted_name}_Personality.md"
        if memory_file.exists():
            current_memory = memory_file.read_text(encoding='utf-8')
            
            # 添加新記憶到對話記憶區
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            new_memory = f"\n- [{timestamp}] {content} (重要性: {importance})"
            
            # 找到對話記憶區並添加
            if "## 對話記憶" in current_memory:
                parts = current_memory.split("## 對話記憶")
                if len(parts) > 1:
                    before = parts[0] + "## 對話記憶"
                    after_parts = parts[1].split("\n## ")
                    memory_section = after_parts[0] + new_memory
                    
                    # 限制記憶數量（保留最近 50 條）
                    memory_lines = memory_section.split('\n')
                    if len(memory_lines) > 52:  # 標題 + 註釋 + 50 條記憶
                        memory_lines = memory_lines[:2] + memory_lines[-50:]
                    memory_section = '\n'.join(memory_lines)
                    
                    # 重組檔案
                    if len(after_parts) > 1:
                        after = "\n## " + "\n## ".join(after_parts[1:])
                        updated_memory = before + memory_section + after
                    else:
                        updated_memory = before + memory_section
                    
                    memory_file.write_text(updated_memory, encoding='utf-8')
                    logger.info(f"✅ 更新 {npc_name} 的記憶")
                    return True
        
        return False

# 創建服務實例
server = NPCDialogueServer()

# API 端點
@app.post("/generate")
async def generate_dialogue(request: DialogueRequest):
    """生成 NPC 對話"""
    try:
        response = await server.generate_response(
            npc_id=request.npc_id,
            message=request.message,
            context=request.context,
            session_id=request.session_id
        )
        return {"response": response, "status": "success"}
    except Exception as e:
        logger.error(f"生成對話錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memory/update")
async def update_memory(update: MemoryUpdate):
    """更新 NPC 記憶"""
    try:
        success = await server.update_memory(
            npc_id=update.npc_id,
            memory_type=update.memory_type,
            content=update.content,
            importance=update.importance
        )
        return {"success": success}
    except Exception as e:
        logger.error(f"更新記憶錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def get_status():
    """獲取服務狀態"""
    return {
        "status": "running",
        "npcs_loaded": len(server.personalities),
        "cache_size": len(server.memory_cache),
        "active_sessions": len(server.sessions),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/cache/clear")
async def clear_cache():
    """清空快取"""
    server.memory_cache.clear()
    return {"message": "快取已清空"}

@app.get("/health")
async def health_check():
    """健康檢查"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    
    # 設定日誌
    logger.info("🚀 啟動 Heart Whisper MCP Server...")
    logger.info(f"📁 個性目錄: {server.personalities_dir}")
    logger.info(f"📁 記憶目錄: {server.memories_dir}")
    logger.info(f"✅ 載入 NPC: {list(server.npc_map.values())}")
    
    # 啟動服務
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8765,
        log_level="info",
        access_log=True,
        loop="uvloop"  # 使用高效能事件循環
    )