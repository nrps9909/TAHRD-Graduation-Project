#!/usr/bin/env python3
"""
測試新的 LLM 架構
驗證 GEMINI.md 系統 prompt 和不同 NPC 個性是否正常運作
"""

import os
import sys
import subprocess
import json
from datetime import datetime

def test_gemini_cli_setup():
    """測試 Gemini CLI 基本設定"""
    print("🔍 測試 1: 檢查 Gemini CLI 安裝...")
    
    try:
        result = subprocess.run(['gemini', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Gemini CLI 已安裝")
            return True
        else:
            print("❌ Gemini CLI 未正確安裝")
            return False
    except FileNotFoundError:
        print("❌ 找不到 Gemini CLI 命令")
        return False
    except Exception as e:
        print(f"❌ 檢查 Gemini CLI 時發生錯誤: {e}")
        return False

def test_gemini_md_exists():
    """測試 GEMINI.md 檔案是否存在"""
    print("\n🔍 測試 2: 檢查 GEMINI.md 檔案...")
    
    gemini_md_path = "GEMINI.md"
    if os.path.exists(gemini_md_path):
        with open(gemini_md_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"✅ GEMINI.md 存在 ({len(content)} 字符)")
        
        # 檢查關鍵內容
        key_sections = ["NPC 個性模板", "關係等級對應行為", "情緒標籤系統", "記憶花園系統"]
        missing_sections = []
        
        for section in key_sections:
            if section not in content:
                missing_sections.append(section)
        
        if missing_sections:
            print(f"⚠️  缺少以下章節: {', '.join(missing_sections)}")
        else:
            print("✅ 所有關鍵章節都存在")
        
        return True
    else:
        print("❌ GEMINI.md 檔案不存在")
        return False

def test_npc_conversation(npc_name, message):
    """測試 NPC 對話功能"""
    print(f"\n🔍 測試 3: {npc_name} 對話測試...")
    
    try:
        # 呼叫 gemini.py 進行 NPC 對話測試
        result = subprocess.run([
            'python3', 'gemini.py',
            '--chat', message,
            '--npc', npc_name
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            output = result.stdout
            print(f"✅ {npc_name} 成功回應")
            
            # 檢查回應是否包含期望的內容
            if "NPC 回應" in output and len(output.strip()) > 50:
                print(f"✅ 回應內容充實 ({len(output)} 字符)")
                
                # 嘗試提取並解析 JSON 回應
                try:
                    # 尋找 JSON 格式的回應
                    json_start = output.find('{')
                    json_end = output.rfind('}') + 1
                    
                    if json_start != -1 and json_end > json_start:
                        json_content = output[json_start:json_end]
                        parsed_response = json.loads(json_content)
                        
                        required_fields = ['content', 'emotionTag', 'relationshipImpact']
                        has_required_fields = all(field in parsed_response for field in required_fields)
                        
                        if has_required_fields:
                            print("✅ JSON 格式正確，包含必要欄位")
                        else:
                            print("⚠️  JSON 格式不完整")
                    else:
                        print("⚠️  未找到 JSON 格式回應")
                        
                except json.JSONDecodeError:
                    print("⚠️  回應不是有效的 JSON 格式")
                
                return True
            else:
                print("⚠️  回應內容過短或格式異常")
                return False
        else:
            print(f"❌ 對話測試失敗: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ 對話測試超時")
        return False
    except Exception as e:
        print(f"❌ 對話測試發生錯誤: {e}")
        return False

def test_different_personalities():
    """測試不同 NPC 個性"""
    print("\n🔍 測試 4: 不同 NPC 個性測試...")
    
    test_cases = [
        ("emma", "今天心情有點低落，工作壓力很大"),
        ("lily", "看到花園裡開了很多美麗的花朵"),
    ]
    
    results = []
    for npc_name, message in test_cases:
        success = test_npc_conversation(npc_name, message)
        results.append((npc_name, success))
    
    successful_tests = sum(1 for _, success in results if success)
    total_tests = len(results)
    
    print(f"\n📊 個性測試結果: {successful_tests}/{total_tests} 成功")
    
    return successful_tests == total_tests

def test_system_prompt_integration():
    """測試系統 prompt 整合"""
    print("\n🔍 測試 5: 系統 prompt 整合測試...")
    
    # 測試一個需要系統 prompt 才能正確回應的情境
    message = "我想要一朵記憶花朵來紀念這次對話"
    
    try:
        result = subprocess.run([
            'python3', 'gemini.py',
            '--chat', message,
            '--npc', 'emma'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            output = result.stdout.lower()
            
            # 檢查是否提到記憶花園相關概念
            flower_keywords = ['花', '記憶', '花朵', 'flower', 'memory']
            has_flower_concepts = any(keyword in output for keyword in flower_keywords)
            
            if has_flower_concepts:
                print("✅ 系統 prompt 整合成功，AI 理解記憶花朵概念")
                return True
            else:
                print("⚠️  AI 回應未體現系統 prompt 中的概念")
                return False
        else:
            print(f"❌ 系統 prompt 測試失敗: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ 系統 prompt 測試發生錯誤: {e}")
        return False

def run_all_tests():
    """執行所有測試"""
    print("🚀 開始測試新的 LLM 架構...")
    print("=" * 60)
    
    test_results = []
    
    # 執行各項測試
    tests = [
        ("Gemini CLI 設定", test_gemini_cli_setup),
        ("GEMINI.md 檔案", test_gemini_md_exists),
        ("不同 NPC 個性", test_different_personalities),
        ("系統 prompt 整合", test_system_prompt_integration),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ 測試 '{test_name}' 發生異常: {e}")
            test_results.append((test_name, False))
    
    # 總結報告
    print("\n" + "=" * 60)
    print("📋 測試結果總結:")
    print("=" * 60)
    
    passed_tests = 0
    for test_name, result in test_results:
        status = "✅ 通過" if result else "❌ 失敗"
        print(f"{test_name:20} | {status}")
        if result:
            passed_tests += 1
    
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    print("=" * 60)
    print(f"總體結果: {passed_tests}/{total_tests} 測試通過 ({success_rate:.1f}%)")
    
    if success_rate >= 80:
        print("🎉 LLM 架構改進成功！")
        return True
    elif success_rate >= 60:
        print("⚠️  LLM 架構部分功能正常，需要進一步調整")
        return False
    else:
        print("❌ LLM 架構存在重大問題，需要檢查配置")
        return False

def main():
    """主函數"""
    print(f"Heart Whisper Town LLM 架構測試")
    print(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 檢查環境變數
    if not os.getenv('GEMINI_API_KEY'):
        print("❌ 未設定 GEMINI_API_KEY 環境變數")
        print("請先設定 API 金鑰: export GEMINI_API_KEY=your_api_key_here")
        sys.exit(1)
    
    # 檢查當前目錄
    if not os.path.exists('gemini.py'):
        print("❌ 請在專案根目錄執行此測試腳本")
        sys.exit(1)
    
    # 執行測試
    success = run_all_tests()
    
    if success:
        print("\n🎯 建議下一步:")
        print("1. 在 .env 檔案中設定 USE_GEMINI_CLI=true")
        print("2. 重啟後端服務以啟用新架構")
        print("3. 在前端測試 NPC 對話功能")
        sys.exit(0)
    else:
        print("\n🔧 需要修復的問題:")
        print("1. 檢查 Gemini CLI 安裝和配置")
        print("2. 確認 GEMINI.md 內容完整")
        print("3. 檢查 API 金鑰和網路連接")
        sys.exit(1)

if __name__ == "__main__":
    main()