import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

const Terminal = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addTerminalCommand, unlockAchievement, terminalHistory } = useGameStore();

  useEffect(() => {
    setOutput(terminalHistory);
  }, [terminalHistory]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const simulateCommand = (cmd: string): string[] => {
    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        return [
          'Available commands:',
          '  help         - Show this help message',
          '  ls           - List files in current directory',
          '  cat <file>   - Display file contents',
          '  grep <text>  - Search for text in files',
          '  edit <file>  - Edit a file',
          '  bash <cmd>   - Run a bash command',
          '  clear        - Clear terminal',
          '  exit         - Exit terminal',
        ];

      case 'ls':
        unlockAchievement('first-command');
        return [
          'main.py',
          'utils.py',
          'README.md',
          'requirements.txt',
          'test/',
          'src/',
        ];

      case 'cat':
        if (args.length === 0) return ['Usage: cat <filename>'];
        if (args[0] === 'README.md') {
          return [
            '# Claude Code Adventure',
            '',
            'Welcome to the interactive Claude Code tutorial!',
            '',
            '## Getting Started',
            '1. Use the terminal to explore',
            '2. Complete challenges to progress',
            '3. Unlock achievements',
            '',
            'Happy coding!',
          ];
        }
        return [`File not found: ${args[0]}`];

      case 'grep':
        if (args.length === 0) return ['Usage: grep <pattern>'];
        return [
          `Searching for "${args.join(' ')}"...`,
          `main.py:42: def ${args[0]}():`,
          `utils.py:15: # ${args[0]} implementation`,
          `Found 2 matches`,
        ];

      case 'edit':
        if (args.length === 0) return ['Usage: edit <filename>'];
        return [`Opening ${args[0]} in editor...`, 'Editor mode activated. Press ESC to exit.'];

      case 'bash':
        if (args.length === 0) return ['Usage: bash <command>'];
        return [`Executing: ${args.join(' ')}`, '✓ Command executed successfully'];

      case 'clear':
        setOutput([]);
        return [];

      case 'exit':
        return ['Goodbye!'];

      default:
        return [`Command not found: ${command}. Type 'help' for available commands.`];
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const newOutput = [...output, `$ ${command}`, ...simulateCommand(command)];
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
      <div className="border-b border-cat-orange p-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-cat-orange"></div>
          <span className="ml-2 font-mono text-xs text-text-primary font-semibold">
            Claude Code Terminal
          </span>
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
            className={line.startsWith('$') ? 'text-text-primary font-semibold' : 'text-terminal-text'}
          >
            {line}
          </motion.div>
        ))}

        <form onSubmit={handleCommand} className="flex items-center mt-2">
          <span className="text-text-primary mr-2 font-semibold">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-terminal-text"
            placeholder="Enter command..."
            autoFocus
          />
          <span className="animate-blink text-text-primary font-semibold">█</span>
        </form>
      </div>
    </div>
  );
};

export default Terminal;