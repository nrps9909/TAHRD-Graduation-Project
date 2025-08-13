#!/usr/bin/env python3
import time
import requests
import json
from datetime import datetime

def test_npc_dialogue(npc_id="npc-1", message="你好！今天天氣真好啊！"):
    """測試 NPC 對話並記錄各階段耗時"""
    
    print(f"\n{'='*60}")
    print(f"測試 NPC 對話效能 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"NPC: {npc_id}, 訊息: {message}")
    print(f"{'='*60}\n")
    
    # 記錄總開始時間
    total_start = time.time()
    
    # 測試 MCP Server (優化版在 8766 port)
    mcp_url = "http://localhost:8766/generate"
    
    print("1. 發送請求到 MCP Server...")
    mcp_start = time.time()
    
    try:
        response = requests.post(
            mcp_url,
            json={
                "npc_id": npc_id,
                "message": message,
                "player_id": "test_player",
                "context": {
                    "location": "town_square",
                    "time_of_day": "afternoon",
                    "weather": "sunny"
                }
            },
            timeout=60
        )
        
        mcp_end = time.time()
        mcp_time = mcp_end - mcp_start
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✓ MCP Server 回應成功")
            print(f"   耗時: {mcp_time:.2f} 秒")
            
            # 分析回應內容
            if 'timing' in result:
                print(f"\n   詳細時間分析:")
                for key, value in result['timing'].items():
                    print(f"     - {key}: {value:.2f} 秒")
            
            print(f"\n   NPC 回應: {result.get('response', 'N/A')[:100]}...")
            
        else:
            print(f"   ✗ MCP Server 錯誤: {response.status_code}")
            print(f"   錯誤訊息: {response.text}")
            
    except requests.exceptions.Timeout:
        print(f"   ✗ 請求超時 (60秒)")
    except Exception as e:
        print(f"   ✗ 錯誤: {str(e)}")
    
    # 總耗時
    total_end = time.time()
    total_time = total_end - total_start
    
    print(f"\n{'='*60}")
    print(f"總耗時: {total_time:.2f} 秒")
    
    if total_time > 10:
        print(f"⚠️  超過 10 秒目標！需要優化 {total_time - 10:.2f} 秒")
    else:
        print(f"✓ 達到 10 秒內目標！")
    print(f"{'='*60}\n")
    
    return total_time

def test_multiple_npcs():
    """測試多個 NPC 的對話效能"""
    npcs = [
        ("npc-1", "陸培修，你今天過得怎麼樣？"),
        ("npc-2", "劉宇岑，有什麼有趣的事情嗎？"),
        ("npc-3", "陳庭安，最近在忙什麼呢？")
    ]
    
    results = []
    for npc_id, message in npcs:
        time.sleep(2)  # 避免過快請求
        duration = test_npc_dialogue(npc_id, message)
        results.append((npc_id, duration))
    
    print("\n" + "="*60)
    print("效能總結")
    print("="*60)
    for npc_id, duration in results:
        status = "✓" if duration <= 10 else "✗"
        print(f"{status} {npc_id}: {duration:.2f} 秒")
    
    avg_time = sum(d for _, d in results) / len(results)
    print(f"\n平均耗時: {avg_time:.2f} 秒")

if __name__ == "__main__":
    # 先測試單個 NPC
    test_npc_dialogue()
    
    # 可選：測試多個 NPC
    # test_multiple_npcs()