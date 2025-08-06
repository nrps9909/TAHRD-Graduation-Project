#!/usr/bin/env python3
"""
Claude 自動化執行系統
可以按照預定順序自動執行一系列命令
"""

import json
import subprocess
import time
import logging
from datetime import datetime, timedelta
import schedule
import os
import sys
from typing import List, Dict, Any

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('automation.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class ClaudeAutomation:
    """Claude 自動化執行器"""
    
    def __init__(self, config_file: str = "automation-config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.results = []
        
    def load_config(self) -> Dict[str, Any]:
        """載入配置文件"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"配置文件 {self.config_file} 不存在，使用預設配置")
            return self.get_default_config()
    
    def get_default_config(self) -> Dict[str, Any]:
        """預設配置"""
        return {
            "schedule": {
                "time": "22:00",  # 晚上 10 點
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
                "timezone": "Asia/Taipei"
            },
            "commands": [
                {
                    "name": "更新依賴",
                    "command": "cd frontend && npm update",
                    "timeout": 300,
                    "continue_on_error": True
                },
                {
                    "name": "執行測試",
                    "command": "cd frontend && npm test",
                    "timeout": 600,
                    "continue_on_error": True
                }
            ],
            "notifications": {
                "enabled": True,
                "email": "",
                "webhook": ""
            }
        }
    
    def execute_command(self, cmd_config: Dict[str, Any]) -> Dict[str, Any]:
        """執行單個命令"""
        name = cmd_config.get('name', '未命名命令')
        command = cmd_config.get('command', '')
        timeout = cmd_config.get('timeout', 300)
        continue_on_error = cmd_config.get('continue_on_error', False)
        
        logger.info(f"開始執行: {name}")
        logger.info(f"命令: {command}")
        
        start_time = time.time()
        result = {
            "name": name,
            "command": command,
            "start_time": datetime.now().isoformat(),
            "success": False,
            "output": "",
            "error": "",
            "duration": 0
        }
        
        try:
            # 執行命令
            process = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            result["output"] = process.stdout
            result["error"] = process.stderr
            result["success"] = process.returncode == 0
            result["return_code"] = process.returncode
            
            if result["success"]:
                logger.info(f"✅ {name} 執行成功")
            else:
                logger.error(f"❌ {name} 執行失敗: {result['error']}")
                if not continue_on_error:
                    raise Exception(f"命令執行失敗: {name}")
                    
        except subprocess.TimeoutExpired:
            result["error"] = f"命令執行超時 ({timeout}秒)"
            logger.error(f"⏱️ {name} 執行超時")
            if not continue_on_error:
                raise
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"💥 {name} 執行錯誤: {e}")
            if not continue_on_error:
                raise
        finally:
            result["duration"] = time.time() - start_time
            result["end_time"] = datetime.now().isoformat()
            
        return result
    
    def execute_all_commands(self):
        """執行所有命令"""
        logger.info("=" * 50)
        logger.info("🚀 開始執行自動化任務")
        logger.info("=" * 50)
        
        self.results = []
        commands = self.config.get('commands', [])
        
        for i, cmd in enumerate(commands, 1):
            logger.info(f"\n[{i}/{len(commands)}] 執行命令...")
            
            try:
                result = self.execute_command(cmd)
                self.results.append(result)
                
                # 命令間延遲
                delay = cmd.get('delay_after', 2)
                if delay > 0 and i < len(commands):
                    logger.info(f"等待 {delay} 秒...")
                    time.sleep(delay)
                    
            except Exception as e:
                logger.error(f"執行中斷: {e}")
                break
        
        # 生成報告
        self.generate_report()
        
        # 發送通知
        if self.config.get('notifications', {}).get('enabled', False):
            self.send_notifications()
            
        logger.info("\n✅ 自動化任務執行完成！")
    
    def generate_report(self):
        """生成執行報告"""
        report_file = f"automation-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        
        report = {
            "execution_time": datetime.now().isoformat(),
            "total_commands": len(self.results),
            "successful": sum(1 for r in self.results if r['success']),
            "failed": sum(1 for r in self.results if not r['success']),
            "total_duration": sum(r['duration'] for r in self.results),
            "results": self.results
        }
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
            
        logger.info(f"📊 報告已生成: {report_file}")
        
        # 打印摘要
        logger.info("\n📈 執行摘要:")
        logger.info(f"  總命令數: {report['total_commands']}")
        logger.info(f"  成功: {report['successful']}")
        logger.info(f"  失敗: {report['failed']}")
        logger.info(f"  總耗時: {report['total_duration']:.2f} 秒")
    
    def send_notifications(self):
        """發送通知"""
        # 這裡可以實現郵件、Webhook 等通知方式
        logger.info("📧 發送通知...")
        # TODO: 實現通知邏輯
    
    def schedule_execution(self):
        """設定定時執行"""
        schedule_config = self.config.get('schedule', {})
        exec_time = schedule_config.get('time', '22:00')
        days = schedule_config.get('days', [])
        
        logger.info(f"⏰ 設定定時執行: {exec_time}")
        logger.info(f"📅 執行日期: {', '.join(days)}")
        
        # 設定每日執行
        if 'everyday' in days or not days:
            schedule.every().day.at(exec_time).do(self.execute_all_commands)
        else:
            # 設定特定日期執行
            for day in days:
                getattr(schedule.every(), day).at(exec_time).do(self.execute_all_commands)
        
        logger.info("✅ 定時任務已設定，等待執行...")
        
        # 持續運行
        while True:
            schedule.run_pending()
            time.sleep(60)  # 每分鐘檢查一次


def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Claude 自動化執行系統')
    parser.add_argument('--config', '-c', default='automation-config.json',
                      help='配置文件路徑')
    parser.add_argument('--run-now', '-r', action='store_true',
                      help='立即執行一次')
    parser.add_argument('--schedule', '-s', action='store_true',
                      help='啟動定時執行模式')
    parser.add_argument('--create-config', action='store_true',
                      help='創建範例配置文件')
    
    args = parser.parse_args()
    
    automation = ClaudeAutomation(args.config)
    
    if args.create_config:
        # 創建範例配置文件
        with open('automation-config-example.json', 'w', encoding='utf-8') as f:
            json.dump(automation.get_default_config(), f, ensure_ascii=False, indent=2)
        logger.info("✅ 範例配置文件已創建: automation-config-example.json")
        return
    
    if args.run_now:
        # 立即執行一次
        automation.execute_all_commands()
    elif args.schedule:
        # 定時執行模式
        automation.schedule_execution()
    else:
        # 預設立即執行
        automation.execute_all_commands()


if __name__ == "__main__":
    main()