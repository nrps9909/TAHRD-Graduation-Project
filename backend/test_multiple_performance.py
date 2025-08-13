#!/usr/bin/env python3
import time
import requests
import json
import statistics

def test_npc_multiple_times(npc_id="npc-1", iterations=5):
    """測試多次對話，計算平均響應時間"""
    
    messages = [
        "你好！今天天氣真好啊！",
        "最近有什麼有趣的事情嗎？",
        "你覺得生活的意義是什麼？",
        "分享一個你最喜歡的回憶吧",
        "如果可以去任何地方旅行，你想去哪裡？"
    ]
    
    url = "http://localhost:8766/generate"
    times = []
    
    print(f"\n{'='*60}")
    print(f"測試 NPC {npc_id} 效能 - {iterations} 次對話")
    print(f"{'='*60}\n")
    
    for i in range(min(iterations, len(messages))):
        message = messages[i]
        print(f"測試 {i+1}/{iterations}: {message[:30]}...")
        
        start = time.time()
        try:
            response = requests.post(
                url,
                json={
                    "npc_id": npc_id,
                    "message": message,
                    "context": {"mood": "happy"}
                },
                timeout=30
            )
            
            elapsed = time.time() - start
            
            if response.status_code == 200:
                result = response.json()
                times.append(elapsed)
                
                cached = result.get('cached', False)
                cache_status = "（快取）" if cached else "（新生成）"
                
                print(f"  ✓ 成功 {cache_status}: {elapsed:.2f}秒")
                
                if 'timing' in result:
                    gemini_time = result['timing'].get('gemini_call', 0)
                    if gemini_time > 0:
                        print(f"    Gemini 呼叫: {gemini_time:.2f}秒")
            else:
                print(f"  ✗ 失敗: {response.status_code}")
                
        except Exception as e:
            print(f"  ✗ 錯誤: {str(e)}")
        
        # 避免過快請求
        time.sleep(1)
    
    if times:
        print(f"\n{'='*60}")
        print("效能統計")
        print(f"{'='*60}")
        print(f"測試次數: {len(times)}")
        print(f"平均響應時間: {statistics.mean(times):.2f} 秒")
        print(f"最快響應: {min(times):.2f} 秒")
        print(f"最慢響應: {max(times):.2f} 秒")
        
        if len(times) > 1:
            print(f"標準差: {statistics.stdev(times):.2f} 秒")
        
        # 檢查是否達標
        avg_time = statistics.mean(times)
        if avg_time <= 10:
            print(f"\n✅ 達到 10 秒內目標！平均 {avg_time:.2f} 秒")
        else:
            print(f"\n⚠️ 未達到 10 秒目標，平均 {avg_time:.2f} 秒")
    
    return times

def test_all_npcs():
    """測試所有 NPC"""
    npcs = ["npc-1", "npc-2", "npc-3"]
    all_results = {}
    
    print("\n" + "="*60)
    print("測試所有 NPC 效能")
    print("="*60)
    
    for npc_id in npcs:
        times = test_npc_multiple_times(npc_id, iterations=3)
        all_results[npc_id] = times
    
    # 總結
    print("\n" + "="*60)
    print("總體效能報告")
    print("="*60)
    
    for npc_id, times in all_results.items():
        if times:
            avg = statistics.mean(times)
            status = "✅" if avg <= 10 else "⚠️"
            print(f"{status} {npc_id}: 平均 {avg:.2f} 秒")
    
    # 計算整體平均
    all_times = []
    for times in all_results.values():
        all_times.extend(times)
    
    if all_times:
        overall_avg = statistics.mean(all_times)
        print(f"\n整體平均響應時間: {overall_avg:.2f} 秒")
        
        if overall_avg <= 10:
            print("🎉 整體達到 10 秒內目標！")
        else:
            print(f"⚠️ 還需要優化 {overall_avg - 10:.2f} 秒")

if __name__ == "__main__":
    # 測試單個 NPC 多次
    test_npc_multiple_times("npc-1", iterations=5)
    
    # 可選：測試所有 NPC
    # test_all_npcs()