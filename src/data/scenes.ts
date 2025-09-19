export interface Scene {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'challenge' | 'interactive';
  content: any;
  nextScene?: string;
  previousScene?: string;
  points: number;
}

export const scenes: Record<string, Scene> = {
  'tutorial-1': {
    id: 'tutorial-1',
    title: 'Chapter 1: Getting Started',
    description: 'Learn the basics of Claude Code commands',
    type: 'tutorial',
    content: {
      instructions: [
        'Open the terminal on the right side',
        'Type "help" to see available commands',
        'Try running "ls" to list files',
        'Use "cat README.md" to read a file',
      ],
      example: `$ help
Available commands:
  help         - Show this help message
  ls           - List files in current directory
  cat <file>   - Display file contents
  ...

$ ls
main.py
utils.py
README.md`,
      tips: [
        'Use arrow keys to navigate command history',
        'Press Tab for auto-completion',
        'Type "clear" to clean the terminal',
      ],
    },
    nextScene: 'tutorial-2',
    points: 100,
  },

  'tutorial-2': {
    id: 'tutorial-2',
    title: 'Chapter 2: File Operations',
    description: 'Master file reading and editing with Claude Code',
    type: 'tutorial',
    content: {
      instructions: [
        'Use "Read" tool to examine files',
        'Learn to use "Edit" for modifications',
        'Understand "Write" for creating new files',
        'Practice with "MultiEdit" for batch changes',
      ],
      example: `// Reading a file
$ cat main.py

// Editing content
$ edit main.py
> [Make your changes]
> [Save with :w]

// Creating new file
$ write newfile.py
> [Enter content]`,
      tips: [
        'Always read before editing',
        'Use exact string matching for edits',
        'Preserve indentation and formatting',
      ],
    },
    nextScene: 'challenge-1',
    previousScene: 'tutorial-1',
    points: 150,
  },

  'challenge-1': {
    id: 'challenge-1',
    title: 'Challenge: Fix the Bug',
    description: 'Apply your skills to fix a real bug',
    type: 'challenge',
    content: {
      task: 'Find and fix the syntax error in the Python code',
      code: `def calculate_total(items):
    total = 0
    for item in items
        total += item.price
    return total`,
      solution: `def calculate_total(items):
    total = 0
    for item in items:
        total += item.price
    return total`,
      hints: [
        'Check the for loop syntax',
        'Python loops need a colon',
      ],
    },
    nextScene: 'tutorial-3',
    previousScene: 'tutorial-2',
    points: 200,
  },

  'tutorial-3': {
    id: 'tutorial-3',
    title: 'Chapter 3: Search and Navigation',
    description: 'Explore powerful search capabilities',
    type: 'tutorial',
    content: {
      instructions: [
        'Use "Grep" to search file contents',
        'Learn "Glob" for finding files by pattern',
        'Master regex patterns for complex searches',
        'Combine tools for efficient navigation',
      ],
      example: `// Search for function definitions
$ grep "def.*calculate"
main.py:42: def calculate_total():
utils.py:15: def calculate_average():

// Find all Python files
$ glob "**/*.py"
src/main.py
src/utils.py
tests/test_main.py`,
      tips: [
        'Use regex for flexible patterns',
        'Glob supports wildcards and recursion',
        'Combine with other tools for power',
      ],
    },
    nextScene: 'tutorial-4',
    previousScene: 'challenge-1',
    points: 150,
  },

  'tutorial-4': {
    id: 'tutorial-4',
    title: 'Chapter 4: Running Commands',
    description: 'Execute bash commands and manage processes',
    type: 'tutorial',
    content: {
      instructions: [
        'Use "Bash" to run shell commands',
        'Learn about background processes',
        'Monitor output with BashOutput',
        'Manage long-running tasks',
      ],
      example: `// Run tests
$ bash "npm test"
Running tests...
✓ All tests passed

// Background process
$ bash "npm run dev" --background
Server started on port 3000

// Check output
$ bashoutput <process-id>
[Server logs...]`,
      tips: [
        'Quote paths with spaces',
        'Use background for servers',
        'Always check command output',
      ],
    },
    nextScene: 'challenge-2',
    previousScene: 'tutorial-3',
    points: 150,
  },

  'challenge-2': {
    id: 'challenge-2',
    title: 'Challenge: Refactor the Code',
    description: 'Use Claude Code to refactor and improve code',
    type: 'challenge',
    content: {
      task: 'Refactor this code to use modern JavaScript',
      code: `var items = [1, 2, 3, 4, 5];
var doubled = [];
for (var i = 0; i < items.length; i++) {
    doubled.push(items[i] * 2);
}
console.log(doubled);`,
      solution: `const items = [1, 2, 3, 4, 5];
const doubled = items.map(item => item * 2);
console.log(doubled);`,
      hints: [
        'Use const instead of var',
        'Array.map() is more concise',
        'Arrow functions simplify syntax',
      ],
    },
    nextScene: 'tutorial-5',
    previousScene: 'tutorial-4',
    points: 250,
  },

  'tutorial-5': {
    id: 'tutorial-5',
    title: 'Chapter 5: Advanced Features',
    description: 'Discover powerful Claude Code capabilities',
    type: 'tutorial',
    content: {
      instructions: [
        'Use "Task" for complex multi-step operations',
        'Learn "TodoWrite" for task management',
        'Master "WebFetch" for online resources',
        'Integrate multiple tools for workflows',
      ],
      example: `// Create a task list
$ todo add "Implement feature X"
$ todo add "Write tests"
$ todo add "Update documentation"

// Launch an agent
$ task "Review and optimize code"
Agent analyzing code...
✓ Found 3 optimizations

// Fetch documentation
$ webfetch "https://docs.example.com"
Fetching content...`,
      tips: [
        'Break complex tasks into steps',
        'Use agents for specialized work',
        'Combine tools for maximum efficiency',
      ],
    },
    nextScene: 'final-challenge',
    previousScene: 'challenge-2',
    points: 200,
  },

  'final-challenge': {
    id: 'final-challenge',
    title: 'Final Challenge: Build a Feature',
    description: 'Put it all together to build a complete feature',
    type: 'challenge',
    content: {
      task: 'Create a simple todo list component with add and delete functionality',
      requirements: [
        'Create a new React component',
        'Add state management',
        'Implement add todo function',
        'Implement delete todo function',
        'Style with Tailwind CSS',
      ],
      starter: `// TodoList.tsx
import React from 'react';

const TodoList = () => {
  // Your code here

  return (
    <div>
      {/* Todo list UI */}
    </div>
  );
};

export default TodoList;`,
      hints: [
        'Use useState for managing todos',
        'Map over todos to display them',
        'Add forms for new todos',
        'Use unique IDs for each todo',
      ],
    },
    nextScene: 'completion',
    previousScene: 'tutorial-5',
    points: 500,
  },

  'completion': {
    id: 'completion',
    title: 'Congratulations!',
    description: 'You have mastered Claude Code!',
    type: 'tutorial',
    content: {
      instructions: [
        'You have completed the Claude Code Adventure!',
        'You are now ready to use Claude Code for real projects',
        'Check your achievements and final score',
        'Share your success with others!',
      ],
      tips: [
        'Keep practicing with real projects',
        'Explore more advanced features',
        'Join the Claude Code community',
      ],
    },
    previousScene: 'final-challenge',
    points: 0,
  },
};