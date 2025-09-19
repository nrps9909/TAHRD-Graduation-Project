'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileExplorer } from '@/components/FileExplorer';
import { ChatInterface } from '@/components/ChatInterface';
import { PreviewPane } from '@/components/PreviewPane';
import { useSandboxStore } from '@/stores/sandboxStore';
import { SandboxManager } from '@/lib/sandboxManager';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

export default function SandboxPage() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sandboxReady, setSandboxReady] = useState(false);
  
  const {
    files,
    currentFile,
    setCurrentFile,
    updateFileContent
  } = useSandboxStore();

  const handleLogin = async () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      // 初始化沙盒
      const sandbox = new SandboxManager();
      await sandbox.initialize(username);
      setSandboxReady(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-6">
            Claude Code Sandbox
          </h1>
          <input
            type="text"
            placeholder="輸入你的名稱"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded mb-4"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            進入沙盒
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 頂部工具列 */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-white font-semibold">Claude Code Sandbox</span>
            <span className="text-gray-400">👤 {username}</span>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">
              💾 儲存
            </button>
            <button className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">
              🔗 分享
            </button>
            <button className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">
              📥 下載
            </button>
          </div>
        </div>
      </header>

      {/* 主要工作區 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側檔案管理 */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700">
          <FileExplorer
            files={files}
            onSelectFile={setCurrentFile}
          />
        </aside>

        {/* 中間區域 - 分割為上下兩部分 */}
        <div className="flex-1 flex flex-col">
          {/* 程式編輯器 */}
          <div className="flex-1 bg-gray-900">
            {currentFile && (
              <MonacoEditor
                height="100%"
                theme="vs-dark"
                language={getLanguageFromFile(currentFile.name)}
                value={currentFile.content}
                onChange={(value) => updateFileContent(currentFile.id, value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on'
                }}
              />
            )}
          </div>

          {/* Claude Code 聊天介面 */}
          <div className="h-80 border-t border-gray-700">
            <ChatInterface
              onCodeGenerated={handleCodeGenerated}
            />
          </div>
        </div>

        {/* 右側預覽區 */}
        <aside className="w-1/3 bg-gray-800 border-l border-gray-700">
          <PreviewPane
            files={files}
            sandboxReady={sandboxReady}
          />
        </aside>
      </div>
    </div>
  );
}

function getLanguageFromFile(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'py': 'python',
    'md': 'markdown'
  };
  return langMap[ext || ''] || 'plaintext';
}

function handleCodeGenerated(code: any) {
  // 處理 Claude Code 生成的程式碼
  console.log('Code generated:', code);
}