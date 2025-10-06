#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
超快速版 MCP Server - 目標 2-5 秒內回應
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
from collections import OrderedDict

# 設定 uvloop 為預設事件循環
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 應用
app = FastAPI(title="Heart Whisper MCP Server Ultra-Fast", version="5.0")

# 請求模型
class DialogueRequest(BaseModel):
    npc_id: str
    message: str
    context: Optional[Dict[str, Any]] = {}
    session_id: Optional[str] = None

class FastNPCServer:
    """超快速版 NPC 對話服務器"""

    def __init__(self):
        self.memories_dir = Path("memories")

        # NPC 名稱映射
        self.npc_map = {
            "npc-1": "lupeixiu",
            "npc-2": "liuyucen",
            "npc-3": "chentingan"
        }

        # 預載入簡化的個性資料（只載入最核心的部分）
        self.npc_personalities = self._load_minimal_personalities()

        # LRU 記憶快取
        self.response_cache = OrderedDict()
        self.max_cache_size = 200

        # Redis 連接
        self.redis_client = None
        self.redis_enabled = False

        logger.info(f"✅ 載入 {len(self.npc_personalities)} 個 NPC 簡化個性")

    def _load_minimal_personalities(self) -> Dict[str, str]:
        """載入最小化的NPC個性描述"""
        personalities = {}

        # 極簡個性描述（讓AI更快理解）
        personalities["npc-1"] = "陸培修：溫柔藝術家，愛夢想和繪畫"
        personalities["npc-2"] = "劉宇岑：活潑開朗，愛用表情符號😊"
        personalities["npc-3"] = "陳庭安：理性體貼的暖男"

        return personalities

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
            logger.warning(f"Redis 連接失敗: {e}")
            self.redis_enabled = False

    def _generate_cache_key(self, npc_id: str, message: str, context: Dict) -> str:
        """生成快取鍵（簡化版）"""
        # 正規化訊息以提高快取命中率
        normalized = self._normalize_message(message)
        key_data = f"{npc_id}:{normalized}:{context.get('mood', '')}"
        return f"fast_response:{hashlib.md5(key_data.encode()).hexdigest()}"

    def _normalize_message(self, message: str) -> str:
        """正規化訊息以提高快取命中率"""
        # 移除多餘空格和標點符號
        import re
        msg = message.lower().strip()
        msg = re.sub(r'[！!？?。.，,、～~]', '', msg)
        msg = re.sub(r'\s+', ' ', msg)

        # 將相似的問候映射到同一個
        greetings = ['嗨', 'hi', 'hello', '你好', '哈囉', '您好', 'hey']
        if any(g in msg for g in greetings):
            return '你好'

        # 將相似的問題映射
        if '怎麼樣' in msg or '如何' in msg or '好嗎' in msg:
            if '最近' in msg or '今天' in msg:
                return '最近怎麼樣'

        if '喜歡' in msg:
            if '什麼' in msg or '啥' in msg:
                return '你喜歡什麼'

        return msg

    async def _check_redis_cache(self, cache_key: str) -> Optional[str]:
        """檢查 Redis 快取"""
        if not self.redis_enabled:
            return None

        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                logger.info(f"💾 Redis 快取命中: {cache_key[:20]}...")
                return cached
        except Exception as e:
            logger.error(f"Redis 讀取錯誤: {e}")

        return None

    async def _save_to_redis(self, cache_key: str, response: str):
        """保存到 Redis（延長 TTL）"""
        if not self.redis_enabled:
            return

        try:
            # 延長 TTL 到 2 小時
            await self.redis_client.setex(cache_key, 7200, response)
            logger.info(f"💾 保存到 Redis: {cache_key[:20]}... (TTL: 3600秒)")
        except Exception as e:
            logger.error(f"Redis 保存錯誤: {e}")

    async def generate_fast_response(self, npc_id: str, message: str, context: Dict) -> str:
        """超快速生成回應"""

        # 1. 檢查快取
        cache_key = self._generate_cache_key(npc_id, message, context)

        # 檢查本地快取
        if cache_key in self.response_cache:
            logger.info("⚡ 本地快取命中")
            return self.response_cache[cache_key]

        # 檢查 Redis
        cached = await self._check_redis_cache(cache_key)
        if cached:
            # 更新本地快取
            self._update_local_cache(cache_key, cached)
            return cached

        # 2. 使用簡化的 prompt，不載入檔案
        npc_personality = self.npc_personalities.get(npc_id, "友善的NPC")

        # 優化的prompt（更短更精準）
        prompt = f"""{npc_personality}
用戶：{message}
回應（1句話）："""

        # 3. 直接調用 Gemini CLI（不使用 --include-directories）
        try:
            start_time = time.time()

            # 使用 Gemini 2.5 Flash 模型（移除不支援的參數）
            cmd = [
                "gemini",
                "-p", prompt,
                "--model", "gemini-2.5-flash"  # 使用 2.5 flash
            ]

            # 設置環境變數
            env = dict(os.environ)
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                env['GEMINI_API_KEY'] = str(api_key)

            # 執行命令（減少 timeout）
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=15  # 15秒超時（Gemini 2.5 Flash需要更多時間）
                )
            except asyncio.TimeoutError:
                process.kill()
                logger.error("Gemini 超時（15秒）")
                return self._get_fallback_response(npc_id, message)

            elapsed = time.time() - start_time
            logger.info(f"⚡ Gemini 回應時間: {elapsed:.2f}秒")

            if process.returncode == 0 and stdout:
                response = stdout.decode('utf-8').strip()

                # 清理回應
                response = response.replace('```', '').strip()
                if not response:
                    response = self._get_fallback_response(npc_id, message)

                # 儲存到快取
                self._update_local_cache(cache_key, response)
                await self._save_to_redis(cache_key, response)

                return response
            else:
                logger.error(f"Gemini 錯誤: {stderr.decode('utf-8') if stderr else 'Unknown'}")
                return self._get_fallback_response(npc_id, message)

        except Exception as e:
            logger.error(f"生成回應錯誤: {e}")
            return self._get_fallback_response(npc_id, message)

    def _update_local_cache(self, key: str, value: str):
        """更新本地 LRU 快取"""
        # 如果已存在，先刪除（為了更新順序）
        if key in self.response_cache:
            del self.response_cache[key]

        # 添加到最後
        self.response_cache[key] = value

        # 限制大小
        if len(self.response_cache) > self.max_cache_size:
            # 刪除最舊的（第一個）
            self.response_cache.popitem(last=False)

    def _get_fallback_response(self, npc_id: str, message: str) -> str:
        """備用回應（當 Gemini 失敗時）"""
        fallback_responses = {
            "npc-1": [
                "讓我想想...這個問題很有意思呢。",
                "嗯...或許我們可以從另一個角度看待這件事。",
                "這讓我想到了一幅畫..."
            ],
            "npc-2": [
                "哇！這個問題好有趣！",
                "讓我想想看...啊！我知道了！",
                "嘿嘿，你說得對耶！"
            ],
            "npc-3": [
                "這是個值得深思的問題。",
                "有趣的觀點，我認為...",
                "從邏輯上來說，這很合理。"
            ]
        }

        import random
        responses = fallback_responses.get(npc_id, ["嗯，讓我想想..."])
        return random.choice(responses)

    async def get_status(self) -> Dict:
        """獲取服務狀態"""
        return {
            "status": "running",
            "npcs_loaded": len(self.npc_personalities),
            "local_cache_size": len(self.response_cache),
            "redis_enabled": self.redis_enabled,
            "response_time_target": "2-5 seconds",
            "optimization": "Ultra-fast mode with minimal context"
        }

# 創建服務實例
npc_server = FastNPCServer()

@app.on_event("startup")
async def startup_event():
    """啟動事件"""
    logger.info("🚀 啟動超快速 MCP 服務器...")
    await npc_server.init_redis()

    # 預熱更多常見對話
    logger.info("🔥 預熱常見對話...")
    common_messages = [
        "你好", "嗨", "你好嗎", "最近怎麼樣",
        "今天天氣真好", "你在做什麼", "你喜歡什麼",
        "再見", "謝謝", "對不起", "沒關係",
        "你覺得呢", "真的嗎", "好啊", "我很開心"
    ]
    for npc_id in npc_server.npc_map.keys():
        for msg in common_messages:
            asyncio.create_task(
                npc_server.generate_fast_response(npc_id, msg, {})
            )

    logger.info("✅ MCP 超快速服務器啟動完成")

@app.get("/health")
async def health_check():
    """健康檢查"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/status")
async def get_status():
    """獲取服務狀態"""
    return await npc_server.get_status()

@app.post("/generate")
async def generate_dialogue(request: DialogueRequest):
    """生成NPC對話（超快速版）"""
    start_time = time.time()

    try:
        # 驗證 NPC ID
        if request.npc_id not in npc_server.npc_map:
            raise HTTPException(status_code=404, detail=f"NPC {request.npc_id} not found")

        # 生成回應
        response = await npc_server.generate_fast_response(
            request.npc_id,
            request.message,
            request.context
        )

        elapsed = time.time() - start_time

        return {
            "response": response,
            "timing": {
                "total": elapsed,
                "optimized": True,
                "mode": "ultra-fast"
            }
        }

    except Exception as e:
        logger.error(f"生成對話錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cache/clear")
async def clear_cache():
    """清空快取"""
    npc_server.response_cache.clear()
    if npc_server.redis_enabled:
        try:
            keys = await npc_server.redis_client.keys("fast_response:*")
            if keys:
                await npc_server.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"清空 Redis 快取失敗: {e}")

    return {"message": "Cache cleared", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")