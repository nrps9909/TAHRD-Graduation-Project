#!/usr/bin/env python3
"""
心語小鎮 NPC 對話生成服務 - 高效能常駐服務版本
使用 FastAPI + uvicorn 建立 HTTP 服務，避免重複啟動 Python 和檔案 I/O
保留 Gemini CLI 的思考模式和超大窗口優勢
"""

import os
import json
import subprocess
import asyncio
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import hashlib

# FastAPI 相關
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 配置常數
GEMINI_CLI_COMMAND = "gemini"
PERSONALITIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'personalities')
CACHE_SIZE = 100  # LRU 快取大小
GEMINI_TIMEOUT = 30  # Gemini CLI 超時秒數

# 載入環境變數
from dotenv import load_dotenv
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    # 嘗試從 backend/.env 讀取
    backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# FastAPI 應用
app = FastAPI(title="心語小鎮 Gemini 服務")

# CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 請求模型
class NPCRequest(BaseModel):
    message: str
    npcData: Dict[str, Any]
    context: Optional[Dict[str, Any]] = {}

class NPCResponse(BaseModel):
    content: str
    processingTime: float
    cached: bool = False

# 全域變數
personality_cache: Dict[str, Dict[str, str]] = {}
response_cache: Dict[str, str] = {}
executor = ThreadPoolExecutor(max_workers=3)  # 執行緒池


class GeminiService:
    """優化的 Gemini 服務類"""
    
    def __init__(self):
        self.personalities = self._preload_all_personalities()
        self.gemini_process = None  # 可選：保持 Gemini CLI 進程
        logger.info(f"✅ 預載入 {len(self.personalities)} 個 NPC 個性檔案")
    
    def _preload_all_personalities(self) -> Dict[str, Dict[str, str]]:
        """預載入所有個性檔案到記憶體"""
        personalities = {}
        name_mapping = {
            '流羽岑': 'liuyucen',
            '鋁配咻': 'lupeixiu',
            '沉停鞍': 'chentingan'
        }
        
        for npc_name, filename in name_mapping.items():
            personality_file = os.path.join(PERSONALITIES_DIR, f"{filename}_personality.txt")
            chat_history_file = os.path.join(PERSONALITIES_DIR, f"{filename}_chat_history.txt")
            
            data = {'personality': '', 'chat_history': ''}
            
            try:
                if os.path.exists(personality_file):
                    with open(personality_file, 'r', encoding='utf-8') as f:
                        data['personality'] = self._clean_text(f.read())
                
                if os.path.exists(chat_history_file):
                    with open(chat_history_file, 'r', encoding='utf-8') as f:
                        data['chat_history'] = self._clean_text(f.read())
                
                personalities[npc_name] = data
                logger.info(f"載入 {npc_name} 的個性資料")
            except Exception as e:
                logger.error(f"載入 {npc_name} 失敗: {e}")
        
        return personalities
    
    def _clean_text(self, text: str) -> str:
        """清理文本中的特殊字符"""
        unwanted_chars = ['\u2068', '\u2069', '\u202a', '\u202b', '\u202c', '\u202d', '\u202e']
        for char in unwanted_chars:
            text = text.replace(char, '')
        return text.strip()
    
    def _get_cache_key(self, message: str, npc_data: Dict) -> str:
        """生成快取鍵"""
        key_data = f"{message}:{npc_data.get('id')}:{npc_data.get('relationshipLevel', 1)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def generate_response(self, message: str, npc_data: Dict, context: Dict) -> str:
        """生成 NPC 回應（異步版本）"""
        start_time = time.time()
        
        # 檢查記憶體快取
        cache_key = self._get_cache_key(message, npc_data)
        if cache_key in response_cache:
            logger.info(f"✅ 快取命中：{cache_key[:8]}")
            return response_cache[cache_key]
        
        # 構建 prompt
        prompt = self._build_optimized_prompt(message, npc_data, context)
        
        # 異步執行 Gemini CLI
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            self._call_gemini_cli_optimized,
            prompt
        )
        
        # 儲存到快取（LRU 邏輯）
        if len(response_cache) >= CACHE_SIZE:
            # 移除最舊的項目
            oldest_key = next(iter(response_cache))
            del response_cache[oldest_key]
        response_cache[cache_key] = response
        
        elapsed = time.time() - start_time
        logger.info(f"⚡ 生成回應耗時：{elapsed:.2f}秒")
        
        return response
    
    def _build_optimized_prompt(self, message: str, npc_data: Dict, context: Dict) -> str:
        """構建優化的 prompt"""
        npc_name = npc_data.get('name', '未知')
        
        # 從預載入的快取獲取個性資料
        personality_data = self.personalities.get(npc_name, {})
        
        # 從 context 提取元宇宙資料
        shared_memories = context.get('sharedMemories', [])
        other_npc_memories = context.get('otherNPCMemories', [])
        session_messages = context.get('sessionMessages', [])
        
        # 格式化記憶（只取前幾條，減少 token 使用）
        my_memories = '\n'.join([f"- {mem}" for mem in shared_memories[:3]])
        others_memories = '\n'.join([f"- {mem}" for mem in other_npc_memories[:2]])
        session_history = '\n'.join(session_messages[-5:])  # 最近 5 條
        
        prompt = f"""你是心語小鎮元宇宙中的 NPC「{npc_name}」。

【角色設定】
{personality_data.get('personality', '')[:500]}

【對話風格】
{personality_data.get('chat_history', '')[:300]}

【我的記憶】
{my_memories or '（暫無）'}

【聽說的事】
{others_memories or '（暫無）'}

【當前對話】
{session_history}

【狀態】
心情：{npc_data.get('currentMood', 'neutral')}
關係：{npc_data.get('relationshipLevel', 1)}/10

玩家：{message}
{npc_name}："""
        
        return prompt
    
    def _call_gemini_cli_optimized(self, prompt: str) -> str:
        """優化的 Gemini CLI 調用"""
        try:
            # 使用 subprocess 但不創建臨時檔案
            cmd = [GEMINI_CLI_COMMAND, "--no-telemetry", "--no-telemetry-log-prompts", "-p"]
            
            # 設定環境變數
            env = os.environ.copy()
            env['GEMINI_API_KEY'] = GEMINI_API_KEY
            
            # 直接通過 stdin 傳遞 prompt
            result = subprocess.run(
                cmd,
                input=prompt,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=GEMINI_TIMEOUT,
                env=env
            )
            
            if result.returncode != 0:
                logger.error(f"Gemini CLI 錯誤：{result.stderr}")
                raise Exception("Gemini CLI 執行失敗")
            
            return result.stdout.strip()
            
        except subprocess.TimeoutExpired:
            logger.error("Gemini CLI 超時")
            return "抱歉，我需要想一想..."
        except Exception as e:
            logger.error(f"Gemini CLI 錯誤：{e}")
            return "嗯，讓我整理一下思緒..."


# 初始化服務
gemini_service = GeminiService()


@app.get("/")
async def root():
    """健康檢查"""
    return {
        "status": "healthy",
        "service": "心語小鎮 Gemini 服務",
        "cache_size": len(response_cache),
        "personalities_loaded": len(gemini_service.personalities)
    }


@app.post("/generate", response_model=NPCResponse)
async def generate_npc_response(request: NPCRequest):
    """生成 NPC 回應的 API 端點"""
    start_time = time.time()
    
    try:
        # 合併 context 資料到 npcData
        npc_data = request.npcData.copy()
        if request.context:
            npc_data.update(request.context)
        
        # 生成回應
        response = await gemini_service.generate_response(
            request.message,
            npc_data,
            request.context or {}
        )
        
        processing_time = time.time() - start_time
        
        # 檢查是否來自快取
        cache_key = gemini_service._get_cache_key(request.message, npc_data)
        cached = cache_key in response_cache
        
        return NPCResponse(
            content=response,
            processingTime=processing_time,
            cached=cached
        )
        
    except Exception as e:
        logger.error(f"生成回應失敗：{e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clear-cache")
async def clear_cache():
    """清空快取"""
    response_cache.clear()
    return {"message": "快取已清空", "timestamp": datetime.now().isoformat()}


@app.get("/stats")
async def get_stats():
    """獲取統計資料"""
    return {
        "cache_entries": len(response_cache),
        "cache_size_mb": sum(len(v.encode()) for v in response_cache.values()) / (1024 * 1024),
        "personalities_loaded": list(gemini_service.personalities.keys()),
        "thread_pool_size": executor._max_workers
    }


@app.on_event("startup")
async def startup_event():
    """啟動時執行"""
    logger.info("🚀 心語小鎮 Gemini 服務啟動中...")
    logger.info(f"✅ 載入 {len(gemini_service.personalities)} 個 NPC 個性")
    logger.info(f"✅ Gemini API Key: {'已設置' if GEMINI_API_KEY else '未設置'}")
    
    # 預熱快取（可選）
    warmup_messages = ["你好", "今天天氣真好", "最近怎麼樣"]
    npc_ids = ['npc-1', 'npc-2', 'npc-3']
    
    for npc_id in npc_ids:
        for msg in warmup_messages[:1]:  # 只預熱一個訊息
            try:
                await gemini_service.generate_response(
                    msg,
                    {'id': npc_id, 'name': list(gemini_service.personalities.keys())[0]},
                    {}
                )
            except:
                pass
    
    logger.info("✅ 服務就緒")


@app.on_event("shutdown")
async def shutdown_event():
    """關閉時執行"""
    logger.info("正在關閉服務...")
    executor.shutdown(wait=True)


if __name__ == "__main__":
    # 使用 uvicorn 啟動高效能服務器
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8765,
        log_level="info",
        access_log=True,
        # 使用多個 worker 進程（生產環境）
        # workers=2
    )