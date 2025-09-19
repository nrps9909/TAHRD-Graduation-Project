export interface CursorScene {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'challenge' | 'interactive' | 'setup';
  content: any;
  nextScene?: string;
  previousScene?: string;
  points: number;
}

export const cursorScenes: Record<string, CursorScene> = {
  'intro': {
    id: 'intro',
    title: '🚀 Cursor + WSL + Claude Code 完整開發環境',
    description: '從零開始打造專業 AI 開發環境',
    type: 'tutorial',
    content: {
      instructions: [
        '歡迎來到現代 AI 輔助開發的世界！',
        '我們將一步步設置完整的開發環境',
        '包含 WSL2、Cursor 編輯器、Claude Code 擴充套件',
        '還有 Gemini CLI 助手來協助你解決問題',
      ],
      overview: {
        tools: [
          { name: 'WSL2', description: 'Windows 上的 Linux 開發環境' },
          { name: 'Cursor', description: 'AI-first 程式碼編輯器' },
          { name: 'Claude Code', description: 'Anthropic 的 AI 編碼助手' },
          { name: 'Gemini CLI', description: 'Google AI 命令列助手' },
        ],
      },
      tips: [
        '整個設置過程約需 30-45 分鐘',
        '建議使用 Windows 11 以獲得最佳 WSL2 體驗',
        '確保有穩定的網路連線下載必要套件',
      ],
    },
    nextScene: 'wsl-installation',
    points: 0,
  },

  'wsl-installation': {
    id: 'wsl-installation',
    title: '📦 Step 1: 安裝 WSL2 完整指南',
    description: '設置 Windows Subsystem for Linux',
    type: 'setup',
    content: {
      instructions: [
        'WSL2 是在 Windows 上執行 Linux 的最佳方式',
        '提供完整的 Linux 核心和更好的檔案系統效能',
      ],
      commands: [
        {
          title: '1.1 啟用 Windows 功能',
          steps: [
            'dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart',
            'dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart',
          ],
          description: '以系統管理員執行 PowerShell',
        },
        {
          title: '1.2 安裝 WSL2',
          steps: [
            'wsl --install',
            'wsl --set-default-version 2',
            'wsl --update',
          ],
          description: '安裝並設定 WSL2 為預設',
        },
        {
          title: '1.3 安裝 Ubuntu 22.04',
          steps: [
            'wsl --install -d Ubuntu-22.04',
            'wsl --set-version Ubuntu-22.04 2',
          ],
          description: '安裝最新的 Ubuntu LTS 版本',
        },
        {
          title: '1.4 初始化 Ubuntu',
          steps: [
            '# 設定使用者名稱和密碼',
            'sudo apt update && sudo apt upgrade -y',
            'sudo apt install build-essential curl git wget -y',
          ],
          description: '首次啟動 Ubuntu 並更新系統',
        },
        {
          title: '1.5 優化 WSL2 設定',
          steps: [
            'echo "[wsl2]" | sudo tee /etc/wsl.conf',
            'echo "memory=8GB" | sudo tee -a /etc/wsl.conf',
            'echo "processors=4" | sudo tee -a /etc/wsl.conf',
            'echo "localhostForwarding=true" | sudo tee -a /etc/wsl.conf',
          ],
          description: '調整 WSL2 記憶體和 CPU 配置',
        },
      ],
      troubleshooting: [
        '如果遇到 "WSL 2 requires an update" 錯誤，下載並安裝 WSL2 Linux 核心更新套件',
        '虛擬化必須在 BIOS 中啟用 (Intel VT-x 或 AMD-V)',
        '重新啟動電腦以完成安裝',
      ],
    },
    nextScene: 'cursor-installation',
    previousScene: 'intro',
    points: 100,
  },

  'cursor-installation': {
    id: 'cursor-installation',
    title: '💻 Step 2: 安裝 Cursor 編輯器',
    description: 'AI-powered 程式碼編輯器設置',
    type: 'setup',
    content: {
      instructions: [
        'Cursor 是專為 AI 編碼設計的編輯器',
        '基於 VS Code 但整合了更強大的 AI 功能',
      ],
      commands: [
        {
          title: '2.1 下載 Cursor',
          steps: [
            '# 訪問官網下載',
            'https://cursor.sh/',
            '# 或使用 winget (Windows)',
            'winget install Cursor.Cursor',
          ],
          description: '選擇適合的安裝方式',
        },
        {
          title: '2.2 配置 Cursor for WSL',
          steps: [
            '# 在 WSL 中安裝 cursor 命令',
            'curl -fsSL https://cursor.sh/install.sh | sh',
            '# 設定為預設編輯器',
            'echo "export EDITOR=cursor" >> ~/.bashrc',
            'source ~/.bashrc',
          ],
          description: '讓 Cursor 能在 WSL 中使用',
        },
        {
          title: '2.3 安裝必要擴充套件',
          steps: [
            'cursor --install-extension ms-vscode-remote.remote-wsl',
            'cursor --install-extension GitHub.copilot',
            'cursor --install-extension Continue.continue',
          ],
          description: '安裝 WSL 和 AI 相關擴充套件',
        },
        {
          title: '2.4 配置 Git 使用 Cursor',
          steps: [
            'git config --global core.editor "cursor --wait"',
            'git config --global merge.tool cursor',
            'git config --global diff.tool cursor',
          ],
          description: '將 Cursor 設為 Git 預設編輯器',
        },
      ],
      cursorFeatures: [
        {
          feature: 'Cmd+K',
          description: '快速生成或修改程式碼',
        },
        {
          feature: 'Cmd+L',
          description: '開啟 AI 聊天面板',
        },
        {
          feature: '@codebase',
          description: '讓 AI 理解整個專案',
        },
        {
          feature: '@docs',
          description: '搜尋文件並生成程式碼',
        },
      ],
    },
    nextScene: 'claude-setup',
    previousScene: 'wsl-installation',
    points: 150,
  },

  'claude-setup': {
    id: 'claude-setup',
    title: '🤖 Step 3: 設置 Claude Code',
    description: '整合 Anthropic 的 AI 助手',
    type: 'setup',
    content: {
      instructions: [
        'Claude Code 提供更深入的程式碼理解和生成能力',
        '可以執行終端命令、編輯多個檔案',
      ],
      commands: [
        {
          title: '3.1 安裝 Claude Code CLI',
          steps: [
            '# 安裝 Node.js (使用 nvm)',
            'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
            'source ~/.bashrc',
            'nvm install --lts',
            'nvm use --lts',
            '# 安裝 Claude CLI',
            'npm install -g @anthropic-ai/claude-cli',
          ],
          description: '設置 Claude 命令列工具',
        },
        {
          title: '3.2 配置 API 金鑰',
          steps: [
            '# 取得 API 金鑰',
            '# https://console.anthropic.com/account/keys',
            'export ANTHROPIC_API_KEY="your-api-key"',
            'echo "export ANTHROPIC_API_KEY=your-api-key" >> ~/.bashrc',
          ],
          description: '設定 Claude API 認證',
        },
        {
          title: '3.3 整合到 Cursor',
          steps: [
            '# 在 Cursor 設定中',
            '# Settings > AI > Model Provider',
            '# 選擇 Claude 3.5 Sonnet',
            '# 輸入 API Key',
          ],
          description: '在 Cursor 中使用 Claude',
        },
      ],
      claudeCommands: [
        {
          command: 'claude "explain this code"',
          description: '解釋程式碼',
        },
        {
          command: 'claude "refactor for performance"',
          description: '優化程式碼效能',
        },
        {
          command: 'claude "add error handling"',
          description: '加入錯誤處理',
        },
        {
          command: 'claude "write tests"',
          description: '生成測試程式碼',
        },
      ],
    },
    nextScene: 'gemini-setup',
    previousScene: 'cursor-installation',
    points: 200,
  },

  'gemini-setup': {
    id: 'gemini-setup',
    title: '🌟 Step 4: 設置 Gemini CLI 助手',
    description: '安裝 Google AI 命令列工具',
    type: 'setup',
    content: {
      instructions: [
        'Gemini CLI 可以幫助解決環境設置問題',
        '提供即時的技術支援和解決方案',
      ],
      commands: [
        {
          title: '4.1 安裝 Gemini CLI',
          steps: [
            '# 使用 pip 安裝',
            'pip install google-generativeai',
            '# 或使用 npm',
            'npm install -g @google/generative-ai-cli',
          ],
          description: '選擇合適的安裝方式',
        },
        {
          title: '4.2 取得 API 金鑰',
          steps: [
            '# 訪問 Google AI Studio',
            'https://makersuite.google.com/app/apikey',
            '# 創建新的 API 金鑰',
            'export GEMINI_API_KEY="your-api-key"',
            'echo "export GEMINI_API_KEY=your-api-key" >> ~/.bashrc',
          ],
          description: '設定 Gemini API 認證',
        },
        {
          title: '4.3 創建 Gemini 助手腳本',
          steps: [
            'mkdir -p ~/.local/bin',
            'cursor ~/.local/bin/gemini-help',
            '# 貼入助手腳本內容',
            'chmod +x ~/.local/bin/gemini-help',
            'echo "export PATH=$PATH:~/.local/bin" >> ~/.bashrc',
          ],
          description: '設置快捷命令',
        },
      ],
      helperScript: `#!/bin/bash
# Gemini CLI Helper Script

query="$*"
if [ -z "$query" ]; then
  echo "Usage: gemini-help <your question>"
  exit 1
fi

# Call Gemini API
response=$(curl -s -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -d "{
    'contents': [{
      'parts': [{
        'text': 'You are a helpful assistant for developers setting up their environment. Question: $query'
      }]
    }]
  }" \\
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent")

echo "$response" | jq -r '.candidates[0].content.parts[0].text'`,
    },
    nextScene: 'dev-workflow',
    previousScene: 'claude-setup',
    points: 200,
  },

  'dev-workflow': {
    id: 'dev-workflow',
    title: '⚡ Step 5: 開發工作流程',
    description: '整合所有工具的最佳實踐',
    type: 'interactive',
    content: {
      instructions: [
        '學習如何有效使用這些工具',
        '建立高效的開發流程',
      ],
      workflow: [
        {
          step: '1. 專案初始化',
          commands: [
            'mkdir my-project && cd my-project',
            'git init',
            'cursor .',  // 使用 Cursor 開啟專案
            'gemini-help "best project structure for React app"',
          ],
        },
        {
          step: '2. AI 輔助編碼',
          commands: [
            '# 在 Cursor 中按 Cmd+K',
            '"Create a React component for user authentication"',
            '# 或使用 Claude',
            'claude "implement JWT authentication"',
          ],
        },
        {
          step: '3. 除錯與優化',
          commands: [
            '# 遇到錯誤時',
            'gemini-help "error: Cannot find module"',
            '# 程式碼審查',
            'claude "review this code for security issues"',
          ],
        },
        {
          step: '4. Git 工作流',
          commands: [
            'git add .',
            '# Cursor 會自動建議 commit message',
            'git commit',  // Cursor 會開啟編輯器
            'git push origin main',
          ],
        },
      ],
      bestPractices: [
        '使用 Cursor 的 @codebase 功能讓 AI 理解專案結構',
        '結合 Claude 和 Gemini 的優勢：Claude 擅長程式碼，Gemini 擅長解釋',
        '定期更新工具以獲得最新功能',
        '建立個人的程式碼片段庫',
      ],
    },
    nextScene: 'advanced-features',
    previousScene: 'gemini-setup',
    points: 250,
  },

  'advanced-features': {
    id: 'advanced-features',
    title: '🔧 Step 6: 進階功能與技巧',
    description: '掌握專業開發技巧',
    type: 'interactive',
    content: {
      instructions: [
        '深入了解各工具的進階功能',
        '提升開發效率的秘訣',
      ],
      advancedTips: [
        {
          tool: 'Cursor',
          tips: [
            '使用 Composer 模式進行多檔案編輯',
            '自訂 AI 指令模板',
            '設定專案特定的 .cursorrules 檔案',
            '使用 Shadow Workspace 進行實驗',
          ],
        },
        {
          tool: 'WSL2',
          tips: [
            '使用 systemd 管理服務',
            '設定 WSL 與 Windows 檔案共享',
            '優化 Docker 在 WSL2 的效能',
            '使用 WSLg 執行 GUI 應用程式',
          ],
        },
        {
          tool: 'Claude Code',
          tips: [
            '使用 chain-of-thought prompting',
            '建立專案特定的指令集',
            '整合 CI/CD 流程',
            '自動化程式碼審查',
          ],
        },
        {
          tool: 'Gemini',
          tips: [
            '使用多模態功能（圖片、程式碼）',
            '建立客製化的助手角色',
            '整合到開發流程自動化',
            '使用 Gemini 進行文件生成',
          ],
        },
      ],
      shortcuts: [
        { keys: 'Ctrl+Shift+P', description: 'Cursor 命令面板' },
        { keys: 'Cmd+K', description: '快速 AI 編輯' },
        { keys: 'Cmd+L', description: 'AI 聊天' },
        { keys: 'Ctrl+`', description: '開啟終端' },
      ],
    },
    nextScene: 'troubleshooting',
    previousScene: 'dev-workflow',
    points: 300,
  },

  'troubleshooting': {
    id: 'troubleshooting',
    title: '🔍 常見問題與解決方案',
    description: '快速解決環境設置問題',
    type: 'interactive',
    content: {
      instructions: [
        '遇到問題時的排查步驟',
        '常見錯誤的解決方案',
      ],
      commonIssues: [
        {
          issue: 'WSL2 無法啟動',
          solutions: [
            '確認虛擬化已在 BIOS 啟用',
            '執行 wsl --update',
            '重新安裝 WSL2 核心',
            'bcdedit /set hypervisorlaunchtype auto',
          ],
        },
        {
          issue: 'Cursor 無法連接 WSL',
          solutions: [
            '安裝 Remote-WSL 擴充套件',
            '檢查 WSL 版本：wsl -l -v',
            '重啟 WSL：wsl --shutdown',
            '在 WSL 中執行：cursor .',
          ],
        },
        {
          issue: 'API 金鑰無效',
          solutions: [
            '確認環境變數設置正確',
            '檢查 API 配額和限制',
            '重新生成 API 金鑰',
            'source ~/.bashrc 重新載入',
          ],
        },
        {
          issue: '效能問題',
          solutions: [
            '調整 WSL2 記憶體配置',
            '將專案放在 WSL 檔案系統中',
            '關閉不必要的背景服務',
            '使用 SSD 儲存',
          ],
        },
      ],
      diagnosticCommands: [
        { command: 'wsl --status', description: '檢查 WSL 狀態' },
        { command: 'cursor --version', description: '確認 Cursor 版本' },
        { command: 'env | grep API', description: '檢查 API 金鑰' },
        { command: 'df -h', description: '檢查磁碟空間' },
      ],
    },
    nextScene: 'completion',
    previousScene: 'advanced-features',
    points: 200,
  },

  'completion': {
    id: 'completion',
    title: '🎉 恭喜完成環境設置！',
    description: '你已經準備好開始 AI 輔助開發了',
    type: 'tutorial',
    content: {
      summary: [
        '✅ WSL2 Linux 開發環境',
        '✅ Cursor AI 編輯器',
        '✅ Claude Code 整合',
        '✅ Gemini CLI 助手',
        '✅ 完整的開發工作流',
      ],
      nextSteps: [
        '開始你的第一個專案',
        '探索更多 AI 功能',
        '加入開發者社群',
        '分享你的經驗',
      ],
      resources: [
        {
          name: 'Cursor 官方文檔',
          url: 'https://cursor.sh/docs',
        },
        {
          name: 'Claude API 文檔',
          url: 'https://docs.anthropic.com',
        },
        {
          name: 'Gemini API 文檔',
          url: 'https://ai.google.dev',
        },
        {
          name: 'WSL 官方指南',
          url: 'https://docs.microsoft.com/windows/wsl',
        },
      ],
      communityLinks: [
        'Discord: Cursor 社群',
        'Reddit: r/cursor',
        'GitHub: 範例專案',
      ],
    },
    previousScene: 'troubleshooting',
    points: 500,
  },
};