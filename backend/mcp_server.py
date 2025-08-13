#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
優化版 MCP Server for Heart Whisper Town NPCs
包含 Redis 快取、固定路徑、預熱機制
"""

import os
import json
import subprocess
import tempfile
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import uvloop
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
from collections import OrderedDict
import time
import atexit
from memory_manager import MemoryManager
import redis.asyncio as redis

# 設定 uvloop 為預設事件循環
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 應用
app = FastAPI(title="Heart Whisper MCP Server Optimized", version="3.0")

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
    """優化版 NPC 對話 MCP 服務器"""
    
    def __init__(self):
        self.personalities_dir = Path("personalities")
        self.memories_dir = Path("memories")
        
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
        
        # Redis 連接（異步）
        self.redis_client = None
        self.redis_enabled = False
        
        # 初始化每個NPC的記憶管理器
        self.memory_managers = {}
        for npc_id, npc_name in self.npc_map.items():
            try:
                self.memory_managers[npc_id] = MemoryManager(npc_name)
                logger.info(f"✅ 初始化 {npc_name} 的記憶管理器")
            except Exception as e:
                logger.error(f"初始化 {npc_name} 記憶管理器失敗：{e}")
        
        # 預載入個性檔案
        self.personalities = self._preload_personalities()
        logger.info(f"✅ 預載入 {len(self.personalities)} 個 NPC 個性")
    
    async def init_redis(self):
        """初始化 Redis 連接"""
        try:
            self.redis_client = await redis.from_url(
                "redis://localhost:6379",
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            self.redis_enabled = True
            logger.info("✅ Redis 連接成功")
        except Exception as e:
            logger.warning(f"⚠️ Redis 連接失敗，將不使用 Redis 快取：{e}")
            self.redis_enabled = False
    
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
                    'chat_style': chat_style_content,
                    'formatted_name': formatted_name
                }
                
        return personalities
    
    async def _get_from_redis(self, key: str) -> Optional[str]:
        """從 Redis 獲取快取"""
        if not self.redis_enabled or not self.redis_client:
            return None
        
        try:
            value = await self.redis_client.get(key)
            if value:
                logger.info(f"✨ Redis 快取命中：{key}")
            return value
        except Exception as e:
            logger.error(f"Redis 讀取失敗：{e}")
            return None
    
    async def _save_to_redis(self, key: str, value: str, ttl: int = 3600):
        """保存到 Redis（預設 1 小時過期）"""
        if not self.redis_enabled or not self.redis_client:
            return
        
        try:
            await self.redis_client.setex(key, ttl, value)
            logger.info(f"💾 保存到 Redis：{key} (TTL: {ttl}秒)")
        except Exception as e:
            logger.error(f"Redis 寫入失敗：{e}")
    
    def _create_cache_key(self, npc_id: str, message: str, context: Dict = None) -> str:
        """創建快取鍵"""
        # 簡化 context，只包含重要欄位
        simple_context = {
            'mood': context.get('mood', 'neutral') if context else 'neutral',
            'relationship': context.get('relationship_level', 0) if context else 0
        }
        
        cache_str = f"{npc_id}:{message}:{json.dumps(simple_context, sort_keys=True)}"
        return f"npc_response:{hashlib.md5(cache_str.encode()).hexdigest()}"
    
    def _get_fixed_temp_dir(self, npc_name: str) -> Path:
        """獲取固定的臨時資料夾路徑"""
        # 使用 backend 目錄下的 tmp 資料夾
        backend_dir = Path(__file__).parent
        temp_dir = backend_dir / "tmp" / "gemini_npc_cache" / npc_name
        return temp_dir
    
    async def _prepare_temp_context(
        self, 
        npc_id: str, 
        npc_name: str,
        context: Dict[str, Any],
        session_id: Optional[str] = None
    ) -> Path:
        """準備臨時資料夾並複製必要的檔案"""
        # 使用固定路徑
        temp_dir = self._get_fixed_temp_dir(npc_name)
        
        # 檢查是否需要更新檔案（如果資料夾已存在且檔案未過期，跳過複製）
        should_update = True
        if temp_dir.exists():
            # 檢查檔案是否在 1 小時內更新過
            gemini_file = temp_dir / "GEMINI.md"
            if gemini_file.exists():
                file_age = time.time() - gemini_file.stat().st_mtime
                if file_age < 3600:  # 1 小時
                    should_update = False
                    logger.info(f"📂 使用現有快取資料夾（{file_age/60:.1f}分鐘前更新）")
        
        if should_update:
            # 如果需要更新，清理並重建
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            # 複製必要檔案（與原來相同的邏輯）
            npc_data = self.personalities.get(npc_id, {})
            formatted_name = npc_data.get('formatted_name', npc_name.title())
            
            files_copied = []
            npc_memory_dir = self.memories_dir / npc_name
            
            # 1. 複製 Personality.md
            if npc_memory_dir.exists():
                personality_file = npc_memory_dir / f"{formatted_name}_Personality.md"
                if personality_file.exists():
                    shutil.copy2(personality_file, temp_dir / personality_file.name)
                    files_copied.append(personality_file.name)
            
            # 2. 複製 Chat_style.txt
            if npc_memory_dir.exists():
                chat_style_file = npc_memory_dir / f"{formatted_name}_Chat_style.txt"
                if chat_style_file.exists():
                    shutil.copy2(chat_style_file, temp_dir / chat_style_file.name)
                    files_copied.append(chat_style_file.name)
            
            # 3. 複製 short_term_memory
            if npc_memory_dir.exists():
                short_term_dir = npc_memory_dir / "short_term_memory"
                if short_term_dir.exists():
                    conversations_file = short_term_dir / "conversations.json"
                    if conversations_file.exists():
                        temp_short_term = temp_dir / "short_term_memory"
                        temp_short_term.mkdir(exist_ok=True)
                        shutil.copy2(conversations_file, temp_short_term / "conversations.json")
                        files_copied.append("short_term_memory/conversations.json")
            
            # 4. 複製 long_term_memory
            if npc_memory_dir.exists():
                long_term_dir = npc_memory_dir / "long_term_memory"
                if long_term_dir.exists():
                    memories_file = long_term_dir / "memories.json"
                    if memories_file.exists():
                        temp_long_term = temp_dir / "long_term_memory"
                        temp_long_term.mkdir(exist_ok=True)
                        shutil.copy2(memories_file, temp_long_term / "memories.json")
                        files_copied.append("long_term_memory/memories.json")
            
            # 5. 複製 GEMINI.md
            backend_dir = Path(__file__).parent
            gemini_file = backend_dir / "GEMINI.md"
            if gemini_file.exists():
                shutil.copy2(gemini_file, temp_dir / "GEMINI.md")
                files_copied.append("GEMINI.md")
            
            # 6. 創建執行用的 gemini.py 腳本
            await self._create_execution_script(temp_dir, npc_name)
            files_copied.append("gemini.py")
            
            logger.info(f"📁 更新固定快取資料夾：{temp_dir}")
            logger.info(f"📋 包含檔案：{files_copied}")
        
        return temp_dir
    
    async def _create_execution_script(self, temp_dir: Path, npc_name: str):
        """在 TMP 資料夾中創建 gemini.py 執行腳本"""
        script_content = f'''#!/usr/bin/env python3
"""
NPC {npc_name} 專用的 Gemini 執行腳本
在隔離環境中執行，只包含該 NPC 的必要檔案
"""

import sys
import json
import subprocess
import os
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 gemini.py '<prompt>'")
        sys.exit(1)
    
    prompt = sys.argv[1]
    
    # 設置環境變數
    env = dict(os.environ)
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        env['GEMINI_API_KEY'] = str(api_key)
    
    # 在當前目錄執行 Gemini CLI（包含所有必要檔案）
    current_dir = Path(__file__).parent
    cmd = [
        "gemini",
        "-p", prompt,
        "--model", "gemini-2.5-flash",
        "--include-directories", str(current_dir)
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            cwd=Path(__file__).parent,  # 在 TMP 目錄執行
            timeout=30
        )
        
        if result.returncode == 0:
            # 清理輸出（移除認證訊息）
            output = result.stdout.strip()
            if 'Loaded cached credentials' in output:
                lines = output.split('\\n')
                output = '\\n'.join(l for l in lines if not l.startswith('Loaded')).strip()
            print(output)
        else:
            print(f"Error: {{result.stderr}}", file=sys.stderr)
            sys.exit(1)
            
    except subprocess.TimeoutExpired:
        print("Error: Timeout after 30 seconds", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {{e}}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
        
        script_path = temp_dir / "gemini.py"
        script_path.write_text(script_content, encoding='utf-8')
        script_path.chmod(0o755)  # 設為可執行
        
        logger.info(f"✅ 創建執行腳本：{script_path}")
    
    async def _call_gemini_mcp(
        self, 
        prompt: str, 
        npc_id: str, 
        temp_dir: Path,
        track_id: str = None
    ) -> str:
        """使用 Gemini CLI 的 MCP 功能生成回應"""
        npc_name = self.npc_map.get(npc_id, "")
        
        # 使用 TMP 資料夾內的 gemini.py 執行腳本
        cmd = [
            "python3",
            "gemini.py",
            prompt
        ]
        
        start_time = time.time()
        
        try:
            env = dict(os.environ)
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                env['GEMINI_API_KEY'] = str(api_key)
            
            logger.info(f"🚀 執行隔離環境 Gemini 腳本（{temp_dir.name}）")
            
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                cwd=str(temp_dir)  # 在隔離的 TMP 資料夾中執行
            )
            
            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=30
            )
            
            response_time = (time.time() - start_time) * 1000
            
            if result.returncode == 0:
                response = stdout.decode('utf-8').strip()
                
                # 過濾掉認證訊息
                if 'Loaded cached credentials' in response:
                    lines = response.split('\n')
                    response = '\n'.join(l for l in lines if not l.startswith('Loaded')).strip()
                
                logger.info(f"✅ Gemini 回應成功（{response_time:.0f}ms）")
                return response
            else:
                error_msg = stderr.decode('utf-8')
                logger.error(f"Gemini MCP 錯誤: {error_msg}")
                return self._get_fallback_response(npc_id)
                
        except asyncio.TimeoutError:
            logger.error("Gemini MCP 超時")
            return self._get_fallback_response(npc_id)
        except Exception as e:
            logger.error(f"Gemini MCP 異常: {e}")
            return self._get_fallback_response(npc_id)
    
    def _get_fallback_response(self, npc_id: str) -> str:
        """獲取備用回應"""
        npc_name = self.npc_map.get(npc_id, "NPC")
        
        fallbacks = {
            "lupeixiu": ["這讓我想起了張愛玲的一句話..."],
            "liuyucen": ["哇，這個問題好有趣！"],
            "chentingan": ["這個問題很 chill 啊！"]
        }
        
        import random
        responses = fallbacks.get(npc_name, ["嗯，讓我想想..."])
        return random.choice(responses)
    
    async def generate_response(
        self,
        npc_id: str,
        message: str,
        context: Dict[str, Any] = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """生成 NPC 回應（核心功能）- 包含詳細時間追蹤"""
        
        timing = {}
        total_start = time.time()
        
        # 1. 檢查 Redis 快取
        cache_start = time.time()
        cache_key = self._create_cache_key(npc_id, message, context)
        cached_response = await self._get_from_redis(cache_key)
        timing['redis_cache_check'] = time.time() - cache_start
        
        if cached_response:
            timing['total'] = time.time() - total_start
            timing['cache_hit'] = True
            return {
                "response": cached_response,
                "timing": timing,
                "cached": True
            }
        
        timing['cache_hit'] = False
        
        # 2. 獲取 NPC 資料
        npc_start = time.time()
        npc_data = self.personalities.get(npc_id, {})
        if not npc_data:
            return {
                "response": "抱歉，我現在有點困惑...",
                "timing": timing,
                "error": "NPC not found"
            }
        
        npc_name = npc_data['name']
        timing['npc_data_fetch'] = time.time() - npc_start
        
        # 3. 準備臨時資料夾（使用固定路徑）
        temp_start = time.time()
        temp_dir = await self._prepare_temp_context(npc_id, npc_name, context or {}, session_id)
        timing['temp_dir_preparation'] = time.time() - temp_start
        
        # 4. 生成追蹤 ID
        track_id = hashlib.md5(f"{npc_id}_{datetime.now().isoformat()}".encode()).hexdigest()[:8]
        
        # 5. 構建提示詞
        prompt_start = time.time()
        prompt = f"""使用者說：{message}

請以你的角色身份自然地回應。"""
        timing['prompt_construction'] = time.time() - prompt_start
        
        # 6. 呼叫 Gemini
        gemini_start = time.time()
        response = await self._call_gemini_mcp(prompt, npc_id, temp_dir, track_id)
        timing['gemini_call'] = time.time() - gemini_start
        
        # 7. 保存到 Redis 快取
        save_start = time.time()
        await self._save_to_redis(cache_key, response, ttl=7200)  # 2 小時
        timing['redis_save'] = time.time() - save_start
        
        # 8. 更新記憶系統
        memory_start = time.time()
        if npc_id in self.memory_managers:
            try:
                # 添加對話到短期記憶
                self.memory_managers[npc_id].add_conversation(
                    player_message=message,
                    npc_response=response,
                    context=context
                )
                logger.info(f"✅ 已儲存 {npc_name} 的對話記憶")
            except Exception as e:
                logger.error(f"儲存記憶失敗：{e}")
        timing['memory_save'] = time.time() - memory_start
        
        # 9. 更新會話歷史
        session_start = time.time()
        if session_id:
            if session_id not in self.sessions:
                self.sessions[session_id] = {'history': []}
            self.sessions[session_id]['history'].append({
                'role': 'user',
                'content': message,
                'timestamp': datetime.now().isoformat()
            })
            self.sessions[session_id]['history'].append({
                'role': npc_name,
                'content': response,
                'timestamp': datetime.now().isoformat()
            })
        timing['session_update'] = time.time() - session_start
        
        timing['total'] = time.time() - total_start
        
        # 記錄詳細時間日誌
        logger.info(f"🕐 時間分析 - NPC {npc_id}:")
        logger.info(f"  Redis 快取檢查: {timing['redis_cache_check']:.3f}s")
        logger.info(f"  NPC 資料取得: {timing['npc_data_fetch']:.3f}s")
        logger.info(f"  臨時目錄準備: {timing['temp_dir_preparation']:.3f}s")
        logger.info(f"  Gemini 呼叫: {timing['gemini_call']:.3f}s")
        logger.info(f"  Redis 儲存: {timing['redis_save']:.3f}s")
        logger.info(f"  總計: {timing['total']:.3f}s")
        
        return {
            "response": response,
            "timing": timing,
            "cached": False
        }
    
    async def preheat_npcs(self):
        """預熱所有 NPC（啟動時呼叫）"""
        logger.info("🔥 開始預熱 NPC...")
        
        preheat_messages = [
            "你好！",
            "今天天氣真好",
            "最近怎麼樣？"
        ]
        
        for npc_id in self.npc_map.keys():
            try:
                # 隨機選一個預熱訊息
                import random
                message = random.choice(preheat_messages)
                
                logger.info(f"預熱 {npc_id}...")
                start_time = time.time()
                
                result = await self.generate_response(
                    npc_id=npc_id,
                    message=message,
                    context={'mood': 'neutral', 'relationship_level': 5},
                    session_id=f"preheat-{npc_id}"
                )
                
                elapsed = time.time() - start_time
                
                # 顯示詳細時間分析
                if 'timing' in result:
                    logger.info(f"✅ {npc_id} 預熱完成（總計 {elapsed:.2f}秒）")
                    logger.info(f"   Gemini 呼叫: {result['timing'].get('gemini_call', 0):.2f}秒")
                else:
                    logger.info(f"✅ {npc_id} 預熱完成（{elapsed:.2f}秒）")
                
                # 短暫等待避免同時請求
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"預熱 {npc_id} 失敗：{e}")
        
        logger.info("🔥 預熱完成！")
    
    def get_status(self) -> Dict:
        """獲取服務狀態"""
        # 檢查固定快取資料夾
        cache_dirs = []
        for npc_name in self.npc_map.values():
            cache_dir = self._get_fixed_temp_dir(npc_name)
            if cache_dir.exists():
                files = list(cache_dir.iterdir())
                cache_dirs.append({
                    'npc': npc_name,
                    'files': len(files),
                    'path': str(cache_dir)
                })
        
        return {
            "status": "running",
            "npcs_loaded": len(self.personalities),
            "memory_cache_size": len(self.memory_cache),
            "active_sessions": len(self.sessions),
            "redis_enabled": self.redis_enabled,
            "fixed_cache_dirs": cache_dirs,
            "memory_managers": list(self.memory_managers.keys())
        }
    
    async def clear_cache(self):
        """清除所有快取"""
        # 清除記憶快取
        self.memory_cache.clear()
        
        # 清除 Redis 快取
        if self.redis_enabled and self.redis_client:
            try:
                await self.redis_client.flushdb()
                logger.info("🗑️ Redis 快取已清除")
            except Exception as e:
                logger.error(f"清除 Redis 失敗：{e}")
        
        logger.info("🗑️ 快取已清除")

# 創建服務實例
dialogue_server = NPCDialogueServer()

# 定期更新記憶的背景任務
async def periodic_memory_update():
    """定期更新所有 NPC 的長期記憶"""
    while True:
        try:
            await asyncio.sleep(3600)  # 每小時執行一次
            logger.info("🔄 開始定期記憶更新...")
            
            for npc_id, memory_manager in dialogue_server.memory_managers.items():
                try:
                    # 更新長期記憶
                    await memory_manager.update_memories_at_startup()
                    
                    # 導出記憶到 Gemini 格式
                    memory_content = memory_manager.export_memories_to_gemini_format()
                    npc_name = dialogue_server.npc_map.get(npc_id, npc_id)
                    memory_file = Path(f"memories/{npc_name}/{npc_name}_memories.md")
                    
                    with open(memory_file, 'w', encoding='utf-8') as f:
                        f.write(memory_content)
                    
                    logger.info(f"✅ 已更新 {npc_name} 的長期記憶")
                    
                except Exception as e:
                    logger.error(f"更新 {npc_id} 記憶失敗：{e}")
            
            logger.info("✅ 定期記憶更新完成")
            
        except Exception as e:
            logger.error(f"定期記憶更新失敗：{e}")

# 啟動事件
@app.on_event("startup")
async def startup_event():
    """服務啟動時執行"""
    # 初始化 Redis
    await dialogue_server.init_redis()
    
    # 預熱 NPC（背景執行）
    asyncio.create_task(dialogue_server.preheat_npcs())
    
    # 啟動定期記憶更新任務
    asyncio.create_task(periodic_memory_update())
    
    # 初始更新所有 NPC 記憶
    for npc_id, memory_manager in dialogue_server.memory_managers.items():
        try:
            await memory_manager.update_memories_at_startup()
            logger.info(f"✅ 初始化 {npc_id} 的記憶系統")
        except Exception as e:
            logger.error(f"初始化 {npc_id} 記憶失敗：{e}")

# API 路由
@app.post("/generate")
async def generate_dialogue(request: DialogueRequest):
    """生成 NPC 對話"""
    try:
        result = await dialogue_server.generate_response(
            npc_id=request.npc_id,
            message=request.message,
            context=request.context,
            session_id=request.session_id
        )
        # 回傳完整結果（包含 timing 資訊）
        return result
    except Exception as e:
        logger.error(f"生成對話失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def get_status():
    """獲取服務狀態"""
    return dialogue_server.get_status()

@app.get("/health")
async def health_check():
    """健康檢查"""
    return {"status": "healthy", "redis": dialogue_server.redis_enabled}

@app.post("/cache/clear")
async def clear_cache():
    """清除快取"""
    await dialogue_server.clear_cache()
    return {"status": "cache cleared"}

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 啟動優化版 MCP 服務器...")
    uvicorn.run(app, host="0.0.0.0", port=8765)