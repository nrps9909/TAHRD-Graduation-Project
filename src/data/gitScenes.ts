export interface GitScene {
  id: string
  title: string
  description: string
  type: 'tutorial' | 'challenge' | 'interactive' | 'setup'
  content: Record<string, unknown>
  nextScene?: string
  previousScene?: string
  points: number
}

export const gitScenes: Record<string, GitScene> = {
  intro: {
    id: 'intro',
    title: '歡迎來到 Git & Claude Code 互動教室',
    description: '學習現代開發者必備技能',
    type: 'tutorial',
    content: {
      instructions: [
        '這是一個互動式教學網站，專為 WSL 開發者設計',
        '你將學習 Git 版本控制和 Claude Code 的強大功能',
        '透過實作練習，掌握真實開發流程',
        '準備好開始你的開發者之旅了嗎？',
      ],
      tips: [
        '建議使用 WSL2 + Ubuntu 進行開發',
        '請確保已安裝 VS Code 和 Claude Code 擴充套件',
        '跟著教學一步步實作，效果最佳',
      ],
    },
    nextScene: 'wsl-setup',
    points: 0,
  },

  'wsl-setup': {
    id: 'wsl-setup',
    title: 'Chapter 0: WSL 環境設置',
    description: '打造專業的開發環境',
    type: 'setup',
    content: {
      instructions: [
        '首先，讓我們設置 WSL2 開發環境',
        '這是在 Windows 上進行 Linux 開發的最佳方式',
      ],
      commands: [
        {
          title: '安裝 WSL2',
          steps: [
            'wsl --install',
            'wsl --set-default-version 2',
            'wsl --install -d Ubuntu',
          ],
          description: '在 PowerShell (管理員) 中執行',
        },
        {
          title: '更新 Ubuntu 套件',
          steps: [
            'sudo apt update',
            'sudo apt upgrade -y',
            'sudo apt install build-essential curl git -y',
          ],
          description: '在 WSL Ubuntu 終端中執行',
        },
        {
          title: '安裝 Node.js (via nvm)',
          steps: [
            'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
            'source ~/.bashrc',
            'nvm install --lts',
            'nvm use --lts',
          ],
          description: '使用 nvm 管理 Node.js 版本',
        },
        {
          title: '配置 Git',
          steps: [
            'git config --global user.name "Your Name"',
            'git config --global user.email "your.email@example.com"',
            'git config --global init.defaultBranch main',
            'git config --global core.editor "code --wait"',
          ],
          description: '設置 Git 全域配置',
        },
      ],
      tips: [
        '使用 Windows Terminal 獲得更好的終端體驗',
        'VS Code 會自動檢測 WSL，可直接在 WSL 中開發',
        '建議將專案存放在 WSL 檔案系統中以獲得最佳效能',
      ],
    },
    nextScene: 'git-basics',
    previousScene: 'intro',
    points: 100,
  },

  'git-basics': {
    id: 'git-basics',
    title: 'Chapter 1: Git 基礎概念',
    description: '理解版本控制的核心概念',
    type: 'tutorial',
    content: {
      instructions: [
        'Git 是分散式版本控制系統',
        '它能追蹤程式碼的每個變更',
        '讓團隊協作變得簡單高效',
      ],
      concepts: [
        {
          name: 'Repository (倉庫)',
          description: '存放專案及其歷史記錄的地方',
          example: 'git init my-project',
        },
        {
          name: 'Commit (提交)',
          description: '程式碼變更的快照',
          example: 'git commit -m "Add new feature"',
        },
        {
          name: 'Branch (分支)',
          description: '獨立的開發線',
          example: 'git branch feature-login',
        },
        {
          name: 'Remote (遠端)',
          description: 'GitHub/GitLab 等遠端倉庫',
          example: 'git remote add origin https://github.com/user/repo.git',
        },
      ],
      interactiveDemo: {
        title: '創建你的第一個 Git 專案',
        commands: [
          'mkdir my-first-project',
          'cd my-first-project',
          'git init',
          'echo "# My Project" > README.md',
          'git add README.md',
          'git commit -m "Initial commit"',
        ],
      },
    },
    nextScene: 'git-workflow',
    previousScene: 'wsl-setup',
    points: 150,
  },

  'git-workflow': {
    id: 'git-workflow',
    title: 'Chapter 2: Git 工作流程',
    description: '掌握日常開發的 Git 操作',
    type: 'interactive',
    content: {
      scenario: '你正在開發一個新功能，學習完整的 Git 工作流程',
      workflow: [
        {
          step: '檢查狀態',
          command: 'git status',
          description: '查看工作區的變更',
          expected: 'On branch main\nnothing to commit, working tree clean',
        },
        {
          step: '創建功能分支',
          command: 'git checkout -b feature/user-auth',
          description: '從主分支創建新分支',
          expected: 'Switched to a new branch "feature/user-auth"',
        },
        {
          step: '編輯檔案',
          command: 'echo "const login = () => {...}" > auth.js',
          description: '實作新功能',
        },
        {
          step: '暫存變更',
          command: 'git add auth.js',
          description: '將檔案加入暫存區',
        },
        {
          step: '提交變更',
          command: 'git commit -m "feat: add user authentication"',
          description: '創建提交記錄',
        },
        {
          step: '推送到遠端',
          command: 'git push origin feature/user-auth',
          description: '將分支推送到 GitHub',
        },
      ],
      tips: [
        '使用描述性的提交訊息',
        '經常提交小的、原子性的變更',
        '在推送前先拉取最新變更',
      ],
    },
    nextScene: 'claude-integration',
    previousScene: 'git-basics',
    points: 200,
  },

  'claude-integration': {
    id: 'claude-integration',
    title: 'Chapter 3: Claude Code + Git 整合',
    description: '使用 AI 加速你的開發流程',
    type: 'interactive',
    content: {
      instructions: [
        'Claude Code 可以幫助你更有效地使用 Git',
        '學習如何結合 AI 和版本控制',
      ],
      claudeCommands: [
        {
          scenario: '自動生成提交訊息',
          prompt: '請幫我為這些變更生成 Git commit message',
          claudeResponse:
            'feat: implement user authentication with JWT\n\n- Add login endpoint\n- Implement token validation\n- Add user session management',
        },
        {
          scenario: '程式碼審查',
          prompt: '請審查這個 pull request 的變更',
          claudeResponse:
            '發現以下問題：\n1. 缺少錯誤處理\n2. SQL 注入風險\n3. 建議加入單元測試',
        },
        {
          scenario: '解決衝突',
          prompt: '幫我解決這個 merge conflict',
          claudeResponse:
            '分析衝突：\n- 保留新功能的實作\n- 整合主分支的 bug 修復\n- 更新相依套件版本',
        },
      ],
      practicalExamples: [
        {
          title: '使用 Claude 生成 .gitignore',
          command: 'Claude: 為 Node.js 專案生成 .gitignore',
          result: 'node_modules/\n.env\ndist/\n*.log',
        },
        {
          title: '自動化 Git hooks',
          command: 'Claude: 創建 pre-commit hook 來執行 linter',
          result: '#!/bin/sh\nnpm run lint',
        },
      ],
    },
    nextScene: 'branching-strategies',
    previousScene: 'git-workflow',
    points: 250,
  },

  'branching-strategies': {
    id: 'branching-strategies',
    title: 'Chapter 4: 分支策略與協作',
    description: '學習團隊協作的最佳實踐',
    type: 'challenge',
    content: {
      scenario: '你的團隊正在開發一個電商網站',
      strategies: [
        {
          name: 'Git Flow',
          branches: ['main', 'develop', 'feature/*', 'release/*', 'hotfix/*'],
          useCase: '適合有明確發布週期的專案',
        },
        {
          name: 'GitHub Flow',
          branches: ['main', 'feature/*'],
          useCase: '適合持續部署的專案',
        },
        {
          name: 'GitLab Flow',
          branches: ['main', 'production', 'feature/*'],
          useCase: '結合環境分支的策略',
        },
      ],
      challenge: {
        title: '實作功能分支工作流',
        tasks: [
          '從 main 創建 feature/shopping-cart',
          '實作購物車功能',
          '創建 Pull Request',
          '進行 code review',
          '合併到 main 分支',
        ],
        validation: ['git log --oneline --graph', 'git branch -a'],
      },
    },
    nextScene: 'debugging-rollback',
    previousScene: 'claude-integration',
    points: 300,
  },

  'debugging-rollback': {
    id: 'debugging-rollback',
    title: 'Chapter 5: 除錯與回滾',
    description: '處理錯誤和恢復程式碼',
    type: 'challenge',
    content: {
      scenarios: [
        {
          title: '撤銷未提交的變更',
          problem: '你不小心刪除了重要檔案',
          solution: 'git checkout -- filename',
          claudeHelp: 'Claude 可以幫你找回檔案的歷史版本',
        },
        {
          title: '回滾錯誤提交',
          problem: '最新的提交引入了 bug',
          solution: 'git revert HEAD',
          claudeHelp: 'Claude 可以分析提交並建議回滾策略',
        },
        {
          title: '使用 git bisect 找 bug',
          problem: '不確定哪個提交引入了問題',
          solution:
            'git bisect start\ngit bisect bad\ngit bisect good <commit>',
          claudeHelp: 'Claude 可以幫你寫測試腳本自動化 bisect',
        },
        {
          title: '互動式 rebase',
          problem: '需要整理提交歷史',
          solution: 'git rebase -i HEAD~3',
          claudeHelp: 'Claude 可以建議如何重組提交',
        },
      ],
      tips: [
        '永遠在重要操作前創建備份分支',
        '使用 git reflog 找回遺失的提交',
        '學會使用 git stash 暫存工作',
      ],
    },
    nextScene: 'ci-cd-integration',
    previousScene: 'branching-strategies',
    points: 350,
  },

  'ci-cd-integration': {
    id: 'ci-cd-integration',
    title: 'Chapter 6: CI/CD 與自動化',
    description: '建立自動化開發流程',
    type: 'setup',
    content: {
      instructions: [
        '設置 GitHub Actions 自動化工作流程',
        '每次推送都自動執行測試和部署',
      ],
      githubActions: {
        title: '.github/workflows/main.yml',
        content: `name: CI/CD Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to production
      run: echo "Deploying to production..."`,
      },
      claudeAutomation: [
        {
          task: '生成測試案例',
          prompt: 'Claude: 為這個函數寫單元測試',
        },
        {
          task: '優化 CI 流程',
          prompt: 'Claude: 分析並優化 GitHub Actions 工作流程',
        },
        {
          task: '自動化部署腳本',
          prompt: 'Claude: 創建部署到 AWS 的腳本',
        },
      ],
    },
    nextScene: 'advanced-git',
    previousScene: 'debugging-rollback',
    points: 400,
  },

  'advanced-git': {
    id: 'advanced-git',
    title: 'Chapter 7: 進階 Git 技巧',
    description: '成為 Git 專家',
    type: 'challenge',
    content: {
      advancedTopics: [
        {
          topic: 'Submodules',
          command: 'git submodule add https://github.com/lib/library.git',
          useCase: '管理專案依賴',
        },
        {
          topic: 'Cherry-pick',
          command: 'git cherry-pick <commit-hash>',
          useCase: '選擇性地應用提交',
        },
        {
          topic: 'Worktree',
          command: 'git worktree add ../hotfix main',
          useCase: '同時處理多個分支',
        },
        {
          topic: 'Hooks',
          command: 'pre-commit, post-merge, etc.',
          useCase: '自動化工作流程',
        },
      ],
      finalChallenge: {
        title: '綜合實戰',
        scenario: '管理一個開源專案',
        tasks: [
          '設置專案結構和 Git 配置',
          '建立分支策略',
          '處理多個貢獻者的 PR',
          '解決複雜的合併衝突',
          '設置 CI/CD 流程',
          '管理版本發布',
        ],
      },
    },
    nextScene: 'completion',
    previousScene: 'ci-cd-integration',
    points: 500,
  },

  completion: {
    id: 'completion',
    title: '🎉 恭喜完成課程！',
    description: '你已經掌握了 Git 和 Claude Code',
    type: 'tutorial',
    content: {
      summary: [
        '✅ WSL 開發環境設置',
        '✅ Git 基礎與進階操作',
        '✅ 團隊協作工作流程',
        '✅ Claude Code 整合',
        '✅ CI/CD 自動化',
        '✅ 問題解決與除錯',
      ],
      nextSteps: [
        '實踐所學知識在真實專案中',
        '貢獻開源專案累積經驗',
        '探索更多 Claude Code 功能',
        '持續學習新的開發工具',
      ],
      resources: [
        'Git 官方文檔：https://git-scm.com/doc',
        'GitHub Skills：https://skills.github.com/',
        'Claude Code 文檔：https://claude.ai/docs',
      ],
    },
    previousScene: 'advanced-git',
    points: 0,
  },
}
