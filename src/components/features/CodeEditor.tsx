import React, { useRef, useEffect, memo, useCallback, useMemo } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { useDebounce } from '../hooks/usePerformance'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  filename?: string
  className?: string
}

// Custom cute theme inspired by VS Code
const cuteTheme = {
  ...themes.vsDark,
  plain: {
    color: '#d4d4d4',
    backgroundColor: '#1e1e1e',
  },
  styles: [
    ...themes.vsDark.styles,
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#7C7C7C',
        fontStyle: 'italic' as const,
      },
    },
    {
      types: ['punctuation'],
      style: {
        color: '#d4d4d4',
      },
    },
    {
      types: [
        'property',
        'tag',
        'boolean',
        'number',
        'constant',
        'symbol',
        'deleted',
      ],
      style: {
        color: '#b5cea8',
      },
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: {
        color: '#ce9178',
      },
    },
    {
      types: ['operator', 'entity', 'url'],
      style: {
        color: '#d4d4d4',
      },
    },
    {
      types: ['atrule', 'attr-value', 'keyword'],
      style: {
        color: '#c586c0',
      },
    },
    {
      types: ['function', 'class-name'],
      style: {
        color: '#dcdcaa',
      },
    },
    {
      types: ['regex', 'important', 'variable'],
      style: {
        color: '#d16969',
      },
    },
  ],
}

const CodeEditor: React.FC<CodeEditorProps> = memo(
  ({ value, onChange, filename, className = '' }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const lineNumbersRef = useRef<HTMLDivElement>(null)
    const preRef = useRef<HTMLPreElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const getLanguage = (filename?: string): string => {
      if (!filename) return 'plaintext'
      const ext = filename.split('.').pop()?.toLowerCase()
      switch (ext) {
        case 'js':
        case 'jsx':
          return 'javascript'
        case 'ts':
        case 'tsx':
          return 'tsx'
        case 'html':
        case 'htm':
          return 'markup'
        case 'css':
          return 'css'
        case 'json':
          return 'json'
        case 'md':
          return 'markdown'
        case 'py':
          return 'python'
        case 'yml':
        case 'yaml':
          return 'yaml'
        default:
          return 'plaintext'
      }
    }

    const lineCount = useMemo(() => value.split('\n').length, [value])
    const language = useMemo(() => getLanguage(filename), [filename])

    // Debounce the value for syntax highlighting (minimal delay for better responsiveness)
    const debouncedValue = useDebounce(value, 30)

    // Unified scroll handler that syncs all elements
    const handleScroll = useCallback((source: 'textarea' | 'container') => {
      const sourceElement =
        source === 'textarea' ? textareaRef.current : scrollContainerRef.current
      if (!sourceElement) return

      const scrollTop = sourceElement.scrollTop
      const scrollLeft = sourceElement.scrollLeft

      // Use requestAnimationFrame for smooth sync
      requestAnimationFrame(() => {
        // Sync line numbers
        if (
          lineNumbersRef.current &&
          lineNumbersRef.current.scrollTop !== scrollTop
        ) {
          lineNumbersRef.current.scrollTop = scrollTop
        }

        // Sync textarea
        if (textareaRef.current && source !== 'textarea') {
          if (textareaRef.current.scrollTop !== scrollTop) {
            textareaRef.current.scrollTop = scrollTop
          }
          if (textareaRef.current.scrollLeft !== scrollLeft) {
            textareaRef.current.scrollLeft = scrollLeft
          }
        }

        // Sync syntax highlighting
        if (preRef.current) {
          if (preRef.current.scrollTop !== scrollTop) {
            preRef.current.scrollTop = scrollTop
          }
          if (preRef.current.scrollLeft !== scrollLeft) {
            preRef.current.scrollLeft = scrollLeft
          }
        }

        // Sync container
        if (scrollContainerRef.current && source !== 'container') {
          if (scrollContainerRef.current.scrollTop !== scrollTop) {
            scrollContainerRef.current.scrollTop = scrollTop
          }
          if (scrollContainerRef.current.scrollLeft !== scrollLeft) {
            scrollContainerRef.current.scrollLeft = scrollLeft
          }
        }
      })
    }, [])

    useEffect(() => {
      const textarea = textareaRef.current
      const container = scrollContainerRef.current

      const textareaHandler = () => handleScroll('textarea')
      const containerHandler = () => handleScroll('container')

      if (textarea) {
        textarea.addEventListener('scroll', textareaHandler, { passive: true })
      }
      if (container) {
        container.addEventListener('scroll', containerHandler, {
          passive: true,
        })
      }

      return () => {
        if (textarea) textarea.removeEventListener('scroll', textareaHandler)
        if (container) container.removeEventListener('scroll', containerHandler)
      }
    }, [handleScroll])

    // Handle keyboard shortcuts and improve editing experience
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Tab handling for indentation
        if (e.key === 'Tab') {
          e.preventDefault()
          const textarea = e.currentTarget
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const newValue =
            value.substring(0, start) + '  ' + value.substring(end)
          onChange(newValue)

          // Set cursor position after the inserted spaces
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2
          }, 0)
        }

        // Auto-closing brackets and quotes
        const autoClosePairs: { [key: string]: string } = {
          '(': ')',
          '[': ']',
          '{': '}',
          '"': '"',
          "'": "'",
          '`': '`',
        }

        if (autoClosePairs[e.key]) {
          const textarea = e.currentTarget
          const start = textarea.selectionStart
          const end = textarea.selectionEnd

          // If there's a selection, wrap it
          if (start !== end) {
            e.preventDefault()
            const selectedText = value.substring(start, end)
            const newValue =
              value.substring(0, start) +
              e.key +
              selectedText +
              autoClosePairs[e.key] +
              value.substring(end)
            onChange(newValue)

            setTimeout(() => {
              textarea.selectionStart = start + 1
              textarea.selectionEnd = end + 1
            }, 0)
          } else {
            // Auto-close for quotes only if not already preceded by the same quote
            if (['"', "'", '`'].includes(e.key)) {
              const charBefore = value[start - 1]
              if (charBefore === e.key) return // Don't auto-close if already there
            }

            e.preventDefault()
            const newValue =
              value.substring(0, start) +
              e.key +
              autoClosePairs[e.key] +
              value.substring(end)
            onChange(newValue)

            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 1
            }, 0)
          }
        }
      },
      [value, onChange]
    )

    return (
      <div
        className={`relative h-full bg-gray-900 rounded-lg overflow-hidden code-editor ${className}`}
      >
        {/* Cute VS Code-like header */}
        <div className="bg-gradient-to-r from-purple-800/30 to-pink-800/30 px-4 py-2 border-b border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors cursor-pointer" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors cursor-pointer" />
              <div className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors cursor-pointer" />
            </div>
            <span className="text-xs text-gray-400 font-mono ml-2">
              {filename ? `✨ ${filename}` : '💝 Untitled'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400">
              {language === 'javascript' && '⚡ JS'}
              {language === 'tsx' && '⚛️ TS'}
              {language === 'markup' && '🌐 HTML'}
              {language === 'css' && '🎨 CSS'}
              {language === 'json' && '📦 JSON'}
              {language === 'python' && '🐍 PY'}
              {language === 'markdown' && '📝 MD'}
            </span>
          </div>
        </div>

        {/* Main editor container with perfect alignment */}
        <div
          ref={scrollContainerRef}
          className="flex h-[calc(100%-80px)] overflow-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Line numbers with perfect alignment */}
          <div
            ref={lineNumbersRef}
            className="bg-gray-800/50 text-gray-500 text-right select-none overflow-hidden border-r border-purple-500/10 flex-shrink-0"
            style={{
              fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
              fontSize: '14px',
              lineHeight: '21px',
              width: '60px',
              paddingTop: '16px',
              paddingBottom: '16px',
              paddingLeft: '8px',
              paddingRight: '12px',
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i + 1}
                className="hover:text-purple-400 transition-colors"
                style={{ height: '21px' }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code editor area with perfect sync */}
          <div className="flex-1 relative overflow-hidden">
            {/* Syntax highlighted preview layer */}
            <Highlight
              theme={cuteTheme}
              code={debouncedValue}
              language={language}
            >
              {({
                className: highlightClassName,
                style,
                tokens,
                getLineProps,
                getTokenProps,
              }) => (
                <pre
                  ref={preRef}
                  className={`${highlightClassName} absolute inset-0 overflow-auto pointer-events-none scrollbar-hide`}
                  style={{
                    ...style,
                    margin: 0,
                    background: 'transparent',
                    fontFamily:
                      '"Cascadia Code", "Fira Code", Consolas, monospace',
                    fontSize: '14px',
                    lineHeight: '21px',
                    padding: '16px',
                    tabSize: 2,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {tokens.map((line, i) => (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      style={{ minHeight: '21px', lineHeight: '21px' }}
                    >
                      {line.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : (
                        line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))
                      )}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>

            {/* Actual textarea (transparent for editing) */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={useCallback(e => onChange(e.target.value), [onChange])}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-pink-400 resize-none focus:outline-none scrollbar-hide"
              style={{
                fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                fontSize: '14px',
                lineHeight: '21px',
                padding: '16px',
                tabSize: 2,
                caretColor: '#ff79c6',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              data-gramm="false"
            />
          </div>
        </div>

        {/* Cute status bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-800/20 to-pink-800/20 px-4 py-1 border-t border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              🐱 行 {value.split('\n').length} | 列 {value.length}
            </span>
            <span className="text-xs text-purple-400">✨ UTF-8</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-pink-400">💝 可愛編輯器</span>
          </div>
        </div>
      </div>
    )
  }
)

CodeEditor.displayName = 'CodeEditor'

export default CodeEditor
