export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  points: number
}

export const achievements: Achievement[] = [
  {
    id: 'first-question',
    title: '好奇寶寶',
    description: '第一次向 AI 提問',
    icon: '❓',
    points: 10,
  },
  {
    id: 'git-init-learned',
    title: 'Git 初學者',
    description: '學會了 git init 指令',
    icon: '🎯',
    points: 20,
  },
  {
    id: 'first-commit',
    title: '第一次 Commit',
    description: '了解什麼是 commit',
    icon: '📝',
    points: 30,
  },
  {
    id: 'branch-master',
    title: '分支大師',
    description: '學會了 branch 的概念',
    icon: '🌳',
    points: 40,
  },
  {
    id: 'help-used',
    title: '會找幫助',
    description: '使用了 help 指令',
    icon: '🆘',
    points: 10,
  },
  {
    id: 'clear-screen',
    title: '整潔愛好者',
    description: '使用了 clear 清空畫面',
    icon: '🧹',
    points: 5,
  },
  {
    id: 'ten-questions',
    title: '求知若渴',
    description: '問了 10 個問題',
    icon: '🎓',
    points: 50,
  },
  {
    id: 'git-status-learned',
    title: '狀態檢查員',
    description: '學會了 git status',
    icon: '✅',
    points: 25,
  },
  {
    id: 'git-add-learned',
    title: '暫存區管理員',
    description: '了解 git add 的作用',
    icon: '➕',
    points: 25,
  },
  {
    id: 'git-log-learned',
    title: '歷史學家',
    description: '學會查看 git log',
    icon: '📚',
    points: 30,
  },
  {
    id: 'complete-tutorial',
    title: '教程完成',
    description: '完成所有教學章節',
    icon: '🏆',
    points: 100,
  },
  {
    id: 'ai-helper',
    title: 'AI 好朋友',
    description: '與 AI 對話超過 20 次',
    icon: '🤖',
    points: 60,
  },
]
