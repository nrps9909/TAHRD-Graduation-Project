#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
超優化版 MCP Server - 目標 10 秒內響應
使用 gemini-2.0-flash-exp 和最小化上下文
"""

import os
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, Optional, Any
from datetime import datetime
import asyncio
import uvloop
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import time
import redis.asyncio as redis

# 設定 uvloop 為預設事件循環
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 應用
app = FastAPI(title="Heart Whisper MCP Server Ultra-Optimized", version="4.0")

# 請求模型
class DialogueRequest(BaseModel):
    npc_id: str
    message: str
    context: Optional[Dict[str, Any]] = {}
    session_id: Optional[str] = None

class OptimizedNPCServer:
    """超優化版 NPC 對話服務器"""
    
    def __init__(self):
        self.memories_dir = Path("memories")
        
        # NPC 名稱映射
        self.npc_map = {
            "npc-1": "lupeixiu",
            "npc-2": "liuyucen",
            "npc-3": "chentingan"
        }
        
        # Redis 連接
        self.redis_client = None
        self.redis_enabled = False
        
        # 預載入最小化個性
        self.personalities = self._preload_minimal_personalities()
        logger.info(f"✅ 預載入 {len(self.personalities)} 個 NPC 最小化個性")
    
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
            logger.warning(f"⚠️ Redis 連接失敗：{e}")
            self.redis_enabled = False
    
    def _preload_minimal_personalities(self) -> Dict[str, Dict[str, str]]:
        """預載入最小化個性（只載入必要資訊）"""
        personalities = {}
        
        # 簡化的個性摘要
        minimal_personalities = {
            "npc-1": {
                "name": "陸培修",
                "traits": "空靈夢幻，充滿詩意，懷舊浪漫",
                "style": "溫柔細膩，話語如詩",
                "response_pattern": "喜歡用詩意的比喻，話語柔軟"
            },
            "npc-2": {
                "name": "劉宇岑",
                "traits": "活潑開朗，熱情洋溢，充滿正能量",
                "style": "俏皮可愛，語氣輕快",
                "response_pattern": "喜歡用表情符號，充滿活力"
            },
            "npc-3": {
                "name": "陳庭安",
                "traits": "慵懶隨和，風趣幽默，治癒系",
                "style": "輕鬆自在，溫暖包容",
                "response_pattern": "語氣悠閒，給人安心感"
            }
        }
        
        for npc_id, personality in minimal_personalities.items():
            personalities[npc_id] = personality
            
        return personalities
    
    async def _get_from_redis(self, key: str) -> Optional[str]:
        """從 Redis 獲取快取"""
        if not self.redis_enabled or not self.redis_client:
            return None
        
        try:
            value = await self.redis_client.get(key)
            if value:
                logger.info(f"✨ Redis 快取命中")
            return value
        except Exception as e:
            logger.error(f"Redis 讀取失敗：{e}")
            return None
    
    async def _save_to_redis(self, key: str, value: str, ttl: int = 7200):
        """保存到 Redis"""
        if not self.redis_enabled or not self.redis_client:
            return
        
        try:
            await self.redis_client.setex(key, ttl, value)
            logger.info(f"💾 保存到 Redis (TTL: {ttl}秒)")
        except Exception as e:
            logger.error(f"Redis 寫入失敗：{e}")
    
    def _create_cache_key(self, npc_id: str, message: str) -> str:
        """創建簡化的快取鍵"""
        cache_str = f"{npc_id}:{message.lower().strip()}"
        return f"npc_opt:{hashlib.md5(cache_str.encode()).hexdigest()}"
    
    async def _call_gemini_fast(
        self, 
        prompt: str,
        npc_id: str
    ) -> str:
        """快速呼叫 Gemini (使用 flash 模型和最小化上下文)"""
        
        # 獲取 NPC 最小化個性
        personality = self.personalities.get(npc_id, {})
        npc_name = personality.get('name', 'NPC')
        traits = personality.get('traits', '')
        style = personality.get('style', '')
        
        # 構建最簡潔的系統提示
        system_prompt = f"""你是{npc_name}。
性格：{traits}
風格：{style}
用自然親切的方式回應，簡短但有個性。"""
        
        # 合併完整提示
        full_prompt = f"{system_prompt}\n\n{prompt}"
        
        # 使用更快的 flash 模型
        cmd = [
            "gemini",
            "-p", full_prompt,
            "--model", "gemini-2.5-flash"  # 使用最快的模型
        ]
        
        start_time = time.time()
        
        try:
            env = dict(os.environ)
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                env['GEMINI_API_KEY'] = str(api_key)
            
            logger.info(f"🚀 呼叫 Gemini Flash ({npc_name})")
            
            # 設定較短的 timeout
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            stdout, stderr = await asyncio.wait_for(
                result.communicate(),
                timeout=10  # 10 秒超時
            )
            
            response_time = time.time() - start_time
            
            if result.returncode == 0:
                response = stdout.decode('utf-8').strip()
                
                # 過濾認證訊息
                if 'Loaded cached credentials' in response:
                    lines = response.split('\n')
                    response = '\n'.join(l for l in lines if not l.startswith('Loaded')).strip()
                
                logger.info(f"✅ Gemini 回應成功（{response_time:.2f}秒）")
                
                # 如果沒有回應，使用預設
                if not response or len(response) < 5:
                    response = self._get_quick_fallback(npc_id)
                    
                return response
            else:
                logger.error(f"Gemini 錯誤: {stderr.decode('utf-8')}")
                return self._get_quick_fallback(npc_id)
                
        except asyncio.TimeoutError:
            logger.error("Gemini 超時（10秒）")
            return self._get_quick_fallback(npc_id)
        except Exception as e:
            logger.error(f"Gemini 異常: {e}")
            return self._get_quick_fallback(npc_id)
    
    def _get_quick_fallback(self, npc_id: str) -> str:
        """快速備用回應"""
        import random
        
        fallbacks = {
            "npc-1": [
                "這讓我想起了一首詩...",
                "就像雲朵飄過天空那樣自然呢。",
                "有些事情，就像夢境一樣美好。"
            ],
            "npc-2": [
                "哇！這真是太有趣了！",
                "我超喜歡的！你也是嗎？",
                "讓我們一起享受這美好的時光吧！"
            ],
            "npc-3": [
                "慢慢來，不著急。",
                "生活就是要這樣悠閒才對。",
                "放輕鬆，一切都會好的。"
            ]
        }
        
        responses = fallbacks.get(npc_id, ["嗯，讓我想想..."])
        return random.choice(responses)
    
    async def generate_response_fast(
        self,
        npc_id: str,
        message: str,
        context: Dict[str, Any] = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """超快速生成回應"""
        
        timing = {}
        total_start = time.time()
        
        # 1. 檢查 Redis 快取
        cache_start = time.time()
        cache_key = self._create_cache_key(npc_id, message)
        cached_response = await self._get_from_redis(cache_key)
        timing['redis_check'] = time.time() - cache_start
        
        if cached_response:
            timing['total'] = time.time() - total_start
            return {
                "response": cached_response,
                "timing": timing,
                "cached": True
            }
        
        # 2. 構建簡化提示
        prompt = f"使用者說：{message}\n回應："
        
        # 3. 呼叫 Gemini
        gemini_start = time.time()
        response = await self._call_gemini_fast(prompt, npc_id)
        timing['gemini_call'] = time.time() - gemini_start
        
        # 4. 保存到 Redis
        save_start = time.time()
        await self._save_to_redis(cache_key, response)
        timing['redis_save'] = time.time() - save_start
        
        timing['total'] = time.time() - total_start
        
        # 記錄時間
        logger.info(f"⚡ 快速回應 - {npc_id}:")
        logger.info(f"  Gemini: {timing['gemini_call']:.2f}s")
        logger.info(f"  總計: {timing['total']:.2f}s")
        
        return {
            "response": response,
            "timing": timing,
            "cached": False
        }
    
    async def preheat_all(self):
        """預熱所有 NPC"""
        logger.info("🔥 開始預熱...")
        
        test_messages = ["你好", "最近好嗎"]
        
        for npc_id in self.npc_map.keys():
            for msg in test_messages:
                try:
                    await self.generate_response_fast(npc_id, msg)
                    await asyncio.sleep(0.5)
                except:
                    pass
        
        logger.info("🔥 預熱完成")

# 創建服務實例
server = OptimizedNPCServer()

# 啟動事件
@app.on_event("startup")
async def startup_event():
    await server.init_redis()
    # 背景預熱
    asyncio.create_task(server.preheat_all())

# API 路由
@app.post("/generate")
async def generate_dialogue(request: DialogueRequest):
    """生成 NPC 對話"""
    try:
        result = await server.generate_response_fast(
            npc_id=request.npc_id,
            message=request.message,
            context=request.context,
            session_id=request.session_id
        )
        return result
    except Exception as e:
        logger.error(f"生成失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def get_status():
    """服務狀態"""
    return {
        "status": "running",
        "npcs": len(server.personalities),
        "redis": server.redis_enabled,
        "model": "gemini-2.5-flash"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/cache/clear")
async def clear_cache():
    """清除快取"""
    if server.redis_enabled and server.redis_client:
        await server.redis_client.flushdb()
    return {"status": "cache cleared"}

if __name__ == "__main__":
    import uvicorn
    logger.info("⚡ 啟動超優化版 MCP 服務器...")
    uvicorn.run(app, host="0.0.0.0", port=8765)  # 使用標準 MCP port