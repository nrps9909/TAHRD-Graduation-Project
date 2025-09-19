import React from 'react';
import { Zap, Calculator, ListTodo, Gamepad2, BookOpen, GraduationCap } from 'lucide-react';

interface QuickProjectCreatorProps {
  onCreateProject: (prompt: string) => void;
}

const QuickProjectCreator: React.FC<QuickProjectCreatorProps> = ({ onCreateProject }) => {
  const inspirationExamples = [
    {
      icon: GraduationCap,
      title: '學生作業系統',
      description: '學生交作業、老師評分',
      prompt: '創建學生作業管理系統',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Calculator,
      title: '計算機應用',
      description: '功能完整的計算器',
      prompt: '做一個漂亮的計算機',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: ListTodo,
      title: '待辦清單',
      description: '任務管理工具',
      prompt: '創建待辦事項管理應用',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Gamepad2,
      title: '網頁遊戲',
      description: '互動小遊戲',
      prompt: '做一個好玩的網頁遊戲',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: BookOpen,
      title: '部落格網站',
      description: '個人文章展示',
      prompt: '建立個人部落格',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Zap,
      title: '自由創作',
      description: '告訴 AI 你的想法！',
      prompt: '',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-200">

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {inspirationExamples.map((example, index) => {
          const IconComponent = example.icon;

          return (
            <button
              key={index}
              onClick={() => {
                if (example.prompt) {
                  onCreateProject(example.prompt);
                } else {
                  // For custom project, focus on chat input
                  const chatInput = document.querySelector('input[placeholder*="訊息"]') as HTMLInputElement;
                  if (chatInput) {
                    chatInput.focus();
                    chatInput.placeholder = '描述你想要的網站...';
                  }
                }
              }}
              className={`
                group relative overflow-hidden rounded-xl p-4 text-white
                bg-gradient-to-br ${example.color}
                hover:shadow-lg hover:scale-105 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-purple-300
              `}
            >
              <div className="relative z-10">
                <IconComponent size={32} className="mx-auto mb-2" />
                <h4 className="font-bold text-sm mb-1">{example.title}</h4>
                <p className="text-xs opacity-90">{example.description}</p>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
        <div className="flex items-center gap-2 text-purple-700 mb-2">
          <Zap size={20} />
          <span className="font-semibold">一鍵完成！</span>
        </div>
        <p className="text-sm text-purple-600">
          AI 可以創建任何類型的網站！無論是電商、遊戲、工具、娛樂...
          只要描述你的想法，就能立即獲得完整的、可運作的網站！🚀
        </p>
      </div>
    </div>
  );
};

export default QuickProjectCreator;