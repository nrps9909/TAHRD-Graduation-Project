import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

interface GitFile {
  name: string;
  content: string;
  status: 'untracked' | 'modified' | 'staged' | 'committed';
}

const GitTerminal = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([
    '歡迎來到 Git 互動終端！',
    '輸入 "help" 查看可用指令',
    '',
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [files, setFiles] = useState<GitFile[]>([
    { name: 'README.md', content: '# My Project', status: 'committed' },
  ]);
  const [branches, setBranches] = useState(['main']);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addTerminalCommand, unlockAchievement } = useGameStore();

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const simulateGitCommand = (cmd: string): string[] => {
    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const subcommand = parts[1];
    const args = parts.slice(2);

    if (command === 'git') {
      switch (subcommand) {
        case 'init':
          unlockAchievement('first-command');
          return ['Initialized empty Git repository in /home/user/project/.git/'];

        case 'status':
          const untrackedFiles = files.filter(f => f.status === 'untracked');
          const modifiedFiles = files.filter(f => f.status === 'modified');
          const stagedFiles = files.filter(f => f.status === 'staged');

          let statusOutput = [`On branch ${currentBranch}`];

          if (stagedFiles.length > 0) {
            statusOutput.push('Changes to be committed:');
            statusOutput.push('  (use "git restore --staged <file>..." to unstage)');
            stagedFiles.forEach(f => {
              statusOutput.push(`\t${'\x1b[33m'}modified:   ${f.name}${'\x1b[0m'}`);
            });
          }

          if (modifiedFiles.length > 0) {
            statusOutput.push('Changes not staged for commit:');
            statusOutput.push('  (use "git add <file>..." to update what will be committed)');
            modifiedFiles.forEach(f => {
              statusOutput.push(`\t${'\x1b[31m'}modified:   ${f.name}${'\x1b[0m'}`);
            });
          }

          if (untrackedFiles.length > 0) {
            statusOutput.push('Untracked files:');
            statusOutput.push('  (use "git add <file>..." to include in what will be committed)');
            untrackedFiles.forEach(f => {
              statusOutput.push(`\t${'\x1b[31m'}${f.name}${'\x1b[0m'}`);
            });
          }

          if (stagedFiles.length === 0 && modifiedFiles.length === 0 && untrackedFiles.length === 0) {
            statusOutput.push('nothing to commit, working tree clean');
          }

          return statusOutput;

        case 'add':
          if (args[0] === '.') {
            setFiles(files.map(f =>
              f.status === 'untracked' || f.status === 'modified'
                ? { ...f, status: 'staged' }
                : f
            ));
            return ['All changes added to staging area'];
          } else if (args[0]) {
            const file = files.find(f => f.name === args[0]);
            if (file) {
              setFiles(files.map(f =>
                f.name === args[0] ? { ...f, status: 'staged' } : f
              ));
              return [`Added ${args[0]} to staging area`];
            }
            return [`fatal: pathspec '${args[0]}' did not match any files`];
          }
          return ['usage: git add <file>'];

        case 'commit':
          if (args[0] === '-m' && args[1]) {
            const message = args.slice(1).join(' ');
            const stagedFiles = files.filter(f => f.status === 'staged');
            if (stagedFiles.length === 0) {
              return ['nothing to commit, working tree clean'];
            }
            setFiles(files.map(f =>
              f.status === 'staged' ? { ...f, status: 'committed' } : f
            ));
            const hash = Math.random().toString(36).substring(2, 9);
            return [
              `[${currentBranch} ${hash}] ${message}`,
              ` ${stagedFiles.length} file(s) changed`,
            ];
          }
          return ['usage: git commit -m "message"'];

        case 'branch':
          if (args[0]) {
            setBranches([...branches, args[0]]);
            return [`Branch '${args[0]}' created`];
          }
          return branches.map(b => b === currentBranch ? `* ${b}` : `  ${b}`);

        case 'checkout':
          if (args[0] === '-b' && args[1]) {
            setBranches([...branches, args[1]]);
            setCurrentBranch(args[1]);
            return [`Switched to a new branch '${args[1]}'`];
          } else if (args[0]) {
            if (branches.includes(args[0])) {
              setCurrentBranch(args[0]);
              return [`Switched to branch '${args[0]}'`];
            }
            return [`error: pathspec '${args[0]}' did not match any branch`];
          }
          return ['usage: git checkout <branch> or git checkout -b <new-branch>'];

        case 'log':
          return [
            'commit 3a4f5d6 (HEAD -> main)',
            'Author: You <you@example.com>',
            'Date:   Thu Nov 21 10:00:00 2024',
            '',
            '    Initial commit',
          ];

        case 'push':
          return [
            'Enumerating objects: 3, done.',
            'Counting objects: 100% (3/3), done.',
            'Writing objects: 100% (3/3), 234 bytes | 234.00 KiB/s, done.',
            'To https://github.com/user/repo.git',
            ` * [new branch]      ${currentBranch} -> ${currentBranch}`,
          ];

        case 'pull':
          return [
            'Already up to date.',
          ];

        case 'clone':
          if (args[0]) {
            return [
              `Cloning into '${args[0].split('/').pop()?.replace('.git', '')}'...`,
              'remote: Enumerating objects: 10, done.',
              'remote: Counting objects: 100% (10/10), done.',
              'Receiving objects: 100% (10/10), done.',
            ];
          }
          return ['usage: git clone <repository-url>'];

        case 'diff':
          return [
            'diff --git a/README.md b/README.md',
            'index 1234567..abcdefg 100644',
            '--- a/README.md',
            '+++ b/README.md',
            '@@ -1 +1,2 @@',
            ' # My Project',
            '+This is a new line',
          ];

        case 'merge':
          if (args[0]) {
            return [`Merge branch '${args[0]}' into ${currentBranch}`];
          }
          return ['usage: git merge <branch>'];

        default:
          return [`git: '${subcommand}' is not a git command. See 'git --help'.`];
      }
    }

    // 非 Git 指令
    switch (command) {
      case 'help':
        return [
          '可用指令：',
          '',
          'Git 指令：',
          '  git init              - 初始化 Git 倉庫',
          '  git status            - 查看狀態',
          '  git add <file>        - 暫存檔案',
          '  git commit -m "msg"   - 提交變更',
          '  git branch [name]     - 管理分支',
          '  git checkout <branch> - 切換分支',
          '  git log               - 查看歷史',
          '  git push              - 推送到遠端',
          '  git pull              - 拉取更新',
          '  git clone <url>       - 複製倉庫',
          '  git diff              - 查看差異',
          '  git merge <branch>    - 合併分支',
          '',
          '檔案指令：',
          '  ls                    - 列出檔案',
          '  touch <file>          - 創建檔案',
          '  echo "text" > file    - 寫入檔案',
          '  cat <file>            - 顯示檔案',
          '  clear                 - 清除畫面',
        ];

      case 'ls':
        return files.map(f => f.name);

      case 'touch':
        if (args[0]) {
          if (!files.find(f => f.name === args[0])) {
            setFiles([...files, {
              name: args[0],
              content: '',
              status: 'untracked'
            }]);
            return [`Created file: ${args[0]}`];
          }
          return [`touch: ${args[0]} already exists`];
        }
        return ['usage: touch <filename>'];

      case 'echo':
        if (args.length >= 3 && args[args.length - 2] === '>') {
          const filename = args[args.length - 1];
          const content = args.slice(0, args.length - 2).join(' ').replace(/"/g, '');

          const existingFile = files.find(f => f.name === filename);
          if (existingFile) {
            setFiles(files.map(f =>
              f.name === filename
                ? { ...f, content, status: f.status === 'committed' ? 'modified' : f.status }
                : f
            ));
          } else {
            setFiles([...files, {
              name: filename,
              content,
              status: 'untracked'
            }]);
          }
          return [`Written to ${filename}`];
        }
        return args.join(' ').replace(/"/g, '').split('\n');

      case 'cat':
        if (args[0]) {
          const file = files.find(f => f.name === args[0]);
          if (file) {
            return file.content.split('\n');
          }
          return [`cat: ${args[0]}: No such file`];
        }
        return ['usage: cat <filename>'];

      case 'pwd':
        return ['/home/user/project'];

      case 'clear':
        setOutput([]);
        return [];

      case 'whoami':
        return ['developer'];

      default:
        return [`Command not found: ${command}. Type 'help' for available commands.`];
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const newOutput = [...output, `$ ${command}`, ...simulateGitCommand(command)];
    setOutput(newOutput);
    setHistory([...history, command]);
    addTerminalCommand(command);
    setCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <div className="border-b border-amber-400 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="ml-2 font-chinese text-xs text-amber-500">
              Git Terminal - Branch: {currentBranch}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm text-terminal-text"
        onClick={() => inputRef.current?.focus()}
      >
        {output.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.1 }}
            className={line.startsWith('$') ? 'text-amber-500' : ''}
            dangerouslySetInnerHTML={{
              __html: line
                .replace(/\x1b\[32m/g, '<span style="color: #f59e0b">')
                .replace(/\x1b\[33m/g, '<span style="color: #f59e0b">')
                .replace(/\x1b\[31m/g, '<span style="color: #ff0000">')
                .replace(/\x1b\[0m/g, '</span>')
            }}
          />
        ))}

        <form onSubmit={handleCommand} className="flex items-center mt-2">
          <span className="text-amber-500 mr-2">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-terminal-text"
            placeholder="輸入 Git 指令..."
            autoFocus
          />
          <span className="animate-blink text-amber-500">█</span>
        </form>
      </div>
    </div>
  );
};

export default GitTerminal;