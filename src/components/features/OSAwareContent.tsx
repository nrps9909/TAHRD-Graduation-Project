import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Info } from 'lucide-react';

interface OSCommand {
  windows?: string;
  mac?: string;
  description?: string;
}

interface OSAwareContentProps {
  command?: OSCommand;
  windowsContent?: React.ReactNode;
  macContent?: React.ReactNode;
  commonContent?: React.ReactNode;
}

export const OSAwareContent: React.FC<OSAwareContentProps> = ({
  command,
  windowsContent,
  macContent,
  commonContent,
}) => {
  const { selectedOS } = useGameStore();

  if (command) {
    const cmdText = selectedOS === 'windows' ? command.windows : command.mac;

    if (!cmdText) return null;

    return (
      <div className="bg-gray-900 p-3 rounded font-mono text-sm">
        <div className="flex items-start justify-between">
          <code className="text-amber-500 flex-1">{cmdText}</code>
          {selectedOS && (
            <span className="ml-3 px-2 py-1 text-xs bg-gray-800 rounded text-gray-400">
              {selectedOS === 'windows' ? 'Windows' : 'macOS'}
            </span>
          )}
        </div>
        {command.description && (
          <p className="text-xs text-gray-500 mt-2 font-cute">{command.description}</p>
        )}
      </div>
    );
  }

  if (selectedOS === 'windows' && windowsContent) {
    return <>{windowsContent}</>;
  }

  if (selectedOS === 'mac' && macContent) {
    return <>{macContent}</>;
  }

  return <>{commonContent}</>;
};

// 輔助函數：根據 OS 返回對應的指令
export const getOSCommand = (windows: string, mac: string): OSCommand => ({
  windows,
  mac,
});

// 常用指令集
export const commonCommands = {
  installNode: getOSCommand(
    'winget install OpenJS.NodeJS.LTS',
    'brew install node'
  ),
  installGit: getOSCommand(
    'winget install Git.Git',
    'brew install git'
  ),
  openEditor: getOSCommand(
    'cursor .',
    'cursor .'
  ),
  createProject: getOSCommand(
    'mkdir my-project && cd my-project',
    'mkdir my-project && cd my-project'
  ),
  checkVersion: getOSCommand(
    'node --version && npm --version',
    'node --version && npm --version'
  ),
};

// OS 特定內容組件
export const OSSpecificTips: React.FC = () => {
  const { selectedOS } = useGameStore();

  const tips = {
    windows: [
      '使用 Windows Terminal 獲得更好的終端體驗',
      '確保 WSL2 已正確安裝並設為預設版本',
      '將專案存放在 WSL 檔案系統中以獲得最佳效能',
      '使用 PowerShell 以系統管理員身份執行安裝命令',
    ],
    mac: [
      '使用 iTerm2 + Oh My Zsh 提升終端體驗',
      'Homebrew 是 macOS 最重要的套件管理器',
      '確保 Xcode Command Line Tools 已安裝',
      '使用 .zshrc 或 .bash_profile 設定環境變數',
    ],
  };

  const currentTips = selectedOS === 'windows' ? tips.windows : tips.mac;

  return (
    <div className="terminal-window bg-opacity-50">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-retro-cyan" />
        <h3 className="text-sm font-chinese text-retro-cyan">
          {selectedOS === 'windows' ? 'Windows' : 'macOS'} 專屬提示
        </h3>
      </div>
      <ul className="space-y-2">
        {currentTips?.map((tip, index) => (
          <li key={index} className="text-xs font-chinese text-terminal-text">
            • {tip}
          </li>
        ))}
      </ul>
    </div>
  );
};

// 安裝指令組件
export const InstallCommands: React.FC = () => {
  const { selectedOS } = useGameStore();

  const commands = selectedOS === 'windows' ? [
    { cmd: 'wsl --install', desc: '安裝 WSL2' },
    { cmd: 'winget install Microsoft.WindowsTerminal', desc: '安裝 Windows Terminal' },
    { cmd: 'winget install Cursor.Cursor', desc: '安裝 Cursor 編輯器' },
    { cmd: 'winget install OpenJS.NodeJS.LTS', desc: '安裝 Node.js' },
  ] : [
    { cmd: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', desc: '安裝 Homebrew' },
    { cmd: 'brew install --cask cursor', desc: '安裝 Cursor 編輯器' },
    { cmd: 'brew install node', desc: '安裝 Node.js' },
    { cmd: 'brew install --cask iterm2', desc: '安裝 iTerm2' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-chinese text-retro-amber mb-3">
        {selectedOS === 'windows' ? 'Windows' : 'macOS'} 安裝指令
      </h3>
      {commands.map((command, index) => (
        <div key={index} className="bg-gray-900 p-3 rounded">
          <code className="text-amber-500 font-mono text-sm block mb-1">
            {command.cmd}
          </code>
          <p className="text-xs text-gray-500 font-chinese">{command.desc}</p>
        </div>
      ))}
    </div>
  );
};