interface FileAction {
  type: 'create' | 'update' | 'delete'
  path: string
  content?: string
}

interface CommandAction {
  type: 'command'
  command: string
}

type Action = FileAction | CommandAction

export class ClaudeCodeIntegration {
  private apiKey: string
  private apiEndpoint = 'https://api.anthropic.com/v1/messages'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async processUserMessage(
    message: string,
    context: {
      files: Map<string, string>
      projectType?: string
      history?: Array<{ role: string; content: string }>
    }
  ): Promise<{
    response: string
    actions: Action[]
  }> {
    const systemPrompt = this.buildSystemPrompt(context)

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: message }],
        system: systemPrompt,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    const assistantMessage = data.content[0].text

    // 解析回應中的動作
    const actions = this.parseActions(assistantMessage)

    return {
      response: assistantMessage,
      actions,
    }
  }

  private buildSystemPrompt(context: any): string {
    const filesList = Array.from(context.files.keys()).join(', ')

    return `You are Claude Code, an AI assistant helping users build web applications in a sandboxed environment.

Current project context:
- Project type: ${context.projectType || 'web application'}
- Existing files: ${filesList || 'none'}

When the user asks you to create or modify code, respond with:
1. A clear explanation of what you're doing
2. The actual code wrapped in appropriate markers

Use these special markers for file operations:
- To create a new file: <create-file path="filename.ext">content</create-file>
- To update a file: <update-file path="filename.ext">new content</update-file>
- To delete a file: <delete-file path="filename.ext"></delete-file>
- To run a command: <run-command>command here</run-command>

Important guidelines:
- Always create valid, working code
- Use modern JavaScript/TypeScript features
- Include proper error handling
- Follow best practices for web development
- Be concise but thorough in explanations

Available in the environment:
- Node.js 18+
- Modern browser APIs
- Popular frameworks (React, Vue, etc.) can be installed via npm`
  }

  private parseActions(response: string): Action[] {
    const actions: Action[] = []

    // 解析創建檔案
    const createFileRegex =
      /<create-file path="([^"]+)">([\s\S]*?)<\/create-file>/g
    let match
    while ((match = createFileRegex.exec(response)) !== null) {
      actions.push({
        type: 'create',
        path: match[1],
        content: match[2].trim(),
      })
    }

    // 解析更新檔案
    const updateFileRegex =
      /<update-file path="([^"]+)">([\s\S]*?)<\/update-file>/g
    while ((match = updateFileRegex.exec(response)) !== null) {
      actions.push({
        type: 'update',
        path: match[1],
        content: match[2].trim(),
      })
    }

    // 解析刪除檔案
    const deleteFileRegex = /<delete-file path="([^"]+)"><\/delete-file>/g
    while ((match = deleteFileRegex.exec(response)) !== null) {
      actions.push({
        type: 'delete',
        path: match[1],
      })
    }

    // 解析執行指令
    const commandRegex = /<run-command>(.*?)<\/run-command>/g
    while ((match = commandRegex.exec(response)) !== null) {
      actions.push({
        type: 'command',
        command: match[1].trim(),
      })
    }

    return actions
  }

  // 生成程式碼建議
  async generateCodeSuggestion(
    code: string,
    language: string,
    request: string
  ): Promise<string> {
    const prompt = `Given this ${language} code:

\`\`\`${language}
${code}
\`\`\`

User request: ${request}

Provide the improved or modified code:`

    const response = await this.processUserMessage(prompt, {
      files: new Map(),
      projectType: language,
    })

    return response.response
  }

  // 解釋程式碼
  async explainCode(code: string, language: string): Promise<string> {
    const prompt = `Explain this ${language} code in simple terms:

\`\`\`${language}
${code}
\`\`\``

    const response = await this.processUserMessage(prompt, {
      files: new Map(),
      projectType: language,
    })

    return response.response
  }

  // 修復錯誤
  async fixError(
    code: string,
    error: string,
    language: string
  ): Promise<{
    explanation: string
    fixedCode: string
  }> {
    const prompt = `Fix this error in the ${language} code:

Code:
\`\`\`${language}
${code}
\`\`\`

Error:
\`\`\`
${error}
\`\`\`

Provide the fixed code and explanation:`

    const response = await this.processUserMessage(prompt, {
      files: new Map(),
      projectType: language,
    })

    // 從回應中提取修復的程式碼
    const codeMatch = response.response.match(/```[\w]*\n([\s\S]*?)```/)
    const fixedCode = codeMatch ? codeMatch[1] : code

    return {
      explanation: response.response,
      fixedCode,
    }
  }
}
