import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'
import { apolloClient } from './network/apollo'
import App from './App'
import './index.css'
// import './styles/fullscreen.css' // Removed - old game UI

// 配置 Troika 不使用 Web Workers 來避免 CSP 問題
if (typeof window !== 'undefined') {
  // 設置環境變量來禁用 Troika workers
  (window as any).__troika_text_no_workers__ = true
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)