#!/usr/bin/env python3
"""
基本架構測試 - 不需要 API 金鑰
測試檔案結構和基本功能是否正確設置
"""

import os
import sys
import json
from datetime import datetime

def test_file_structure():
    """測試檔案結構"""
    print("🔍 測試 1: 檢查關鍵檔案結構...")
    
    required_files = [
        'gemini.py',
        'GEMINI.md',
        'backend/src/services/geminiService.ts',
        '.env.example'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ 缺少檔案: {', '.join(missing_files)}")
        return False
    else:
        print("✅ 所有關鍵檔案都存在")
        return True

def test_gemini_md_content():
    """測試 GEMINI.md 內容完整性"""
    print("\n🔍 測試 2: 檢查 GEMINI.md 內容...")
    
    if not os.path.exists('GEMINI.md'):
        print("❌ GEMINI.md 不存在")
        return False
    
    with open('GEMINI.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 檢查關鍵章節
    required_sections = [
        "基礎系統設定",
        "對話原則", 
        "NPC 個性模板",
        "關係等級對應行為",
        "情緒標籤系統",
        "記憶花園系統",
        "對話生成規則"
    ]
    
    missing_sections = []
    for section in required_sections:
        if section not in content:
            missing_sections.append(section)
    
    if missing_sections:
        print(f"❌ 缺少章節: {', '.join(missing_sections)}")
        return False
    
    print(f"✅ GEMINI.md 內容完整 ({len(content)} 字符)")
    
    # 檢查 NPC 個性模板
    npc_types = ["溫暖治癒型", "活潑陽光型", "沉穩智慧型", "神秘治癒型"]
    has_npc_types = sum(1 for npc_type in npc_types if npc_type in content)
    
    print(f"✅ 包含 {has_npc_types}/{len(npc_types)} 種 NPC 個性模板")
    
    return True

def test_gemini_py_structure():
    """測試 gemini.py 結構"""
    print("\n🔍 測試 3: 檢查 gemini.py 功能...")
    
    if not os.path.exists('gemini.py'):
        print("❌ gemini.py 不存在")
        return False
    
    with open('gemini.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 檢查關鍵功能
    required_functions = [
        "_read_system_prompt",
        "_build_prompt_with_system", 
        "generate_npc_response",
        "call_gemini_cli"
    ]
    
    missing_functions = []
    for func in required_functions:
        if f"def {func}" not in content:
            missing_functions.append(func)
    
    if missing_functions:
        print(f"❌ 缺少函數: {', '.join(missing_functions)}")
        return False
    
    # 檢查系統 prompt 支援
    if "SYSTEM_PROMPT_FILE" not in content:
        print("❌ 缺少系統 prompt 檔案支援")
        return False
    
    # 檢查命令列參數
    if "--npc-data" not in content:
        print("❌ 缺少 NPC 數據參數支援")
        return False
    
    print("✅ gemini.py 結構完整")
    return True

def test_backend_service_integration():
    """測試後端服務整合"""
    print("\n🔍 測試 4: 檢查後端服務整合...")
    
    service_path = 'backend/src/services/geminiService.ts'
    if not os.path.exists(service_path):
        print("❌ geminiService.ts 不存在")
        return False
    
    with open(service_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 檢查 CLI 整合
    required_elements = [
        "import { spawn }",
        "useGeminiCLI",
        "generateNPCResponseWithCLI",
        "callGeminiCLI",
        "USE_GEMINI_CLI"
    ]
    
    missing_elements = []
    for element in required_elements:
        if element not in content:
            missing_elements.append(element)
    
    if missing_elements:
        print(f"❌ 缺少整合元素: {', '.join(missing_elements)}")
        return False
    
    print("✅ 後端服務整合完成")
    return True

def test_env_configuration():
    """測試環境配置"""
    print("\n🔍 測試 5: 檢查環境配置...")
    
    if not os.path.exists('.env.example'):
        print("❌ .env.example 不存在")
        return False
    
    with open('.env.example', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 檢查必要的環境變數
    required_vars = [
        "GEMINI_API_KEY",
        "USE_GEMINI_CLI"
    ]
    
    missing_vars = []
    for var in required_vars:
        if var not in content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ 缺少環境變數: {', '.join(missing_vars)}")
        return False
    
    print("✅ 環境配置完整")
    return True

def test_python_syntax():
    """測試 Python 語法"""
    print("\n🔍 測試 6: 檢查 Python 語法...")
    
    try:
        import ast
        
        python_files = ['gemini.py', 'test_llm_architecture.py']
        for file_path in python_files:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                try:
                    ast.parse(content)
                    print(f"✅ {file_path} 語法正確")
                except SyntaxError as e:
                    print(f"❌ {file_path} 語法錯誤: {e}")
                    return False
        
        return True
        
    except Exception as e:
        print(f"❌ 語法檢查失敗: {e}")
        return False

def run_basic_tests():
    """執行基本測試"""
    print("🚀 開始基本架構測試...")
    print("=" * 60)
    
    tests = [
        ("檔案結構", test_file_structure),
        ("GEMINI.md 內容", test_gemini_md_content),
        ("gemini.py 結構", test_gemini_py_structure),
        ("後端服務整合", test_backend_service_integration),
        ("環境配置", test_env_configuration),
        ("Python 語法", test_python_syntax),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ 測試 '{test_name}' 發生異常: {e}")
            results.append((test_name, False))
    
    # 總結
    print("\n" + "=" * 60)
    print("📋 基本測試結果:")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通過" if result else "❌ 失敗"
        print(f"{test_name:20} | {status}")
    
    success_rate = (passed / total) * 100
    print("=" * 60)
    print(f"總體結果: {passed}/{total} 測試通過 ({success_rate:.1f}%)")
    
    if success_rate == 100:
        print("🎉 架構設置完美！")
        print("\n📝 下一步:")
        print("1. 設定實際的 GEMINI_API_KEY")
        print("2. 運行完整測試: python3 test_llm_architecture.py")  
        print("3. 在後端 .env 設定 USE_GEMINI_CLI=true")
        return True
    elif success_rate >= 80:
        print("✅ 架構基本完成，有小問題需要修復")
        return True
    else:
        print("❌ 架構存在重大問題")
        return False

def main():
    print(f"Heart Whisper Town - 基本架構測試")
    print(f"測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    success = run_basic_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()