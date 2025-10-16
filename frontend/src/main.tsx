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
  (window as Window & { __troika_text_no_workers__?: boolean }).__troika_text_no_workers__ = true
}

// 🚀 全局启用 BVH 加速 - 大幅提升射线检测性能（点击、hover等）
import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)