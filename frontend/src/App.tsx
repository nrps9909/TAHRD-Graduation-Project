import { Routes, Route, Navigate } from 'react-router-dom'
import IslandView from './pages/IslandView'
import DatabaseView from './pages/DatabaseView'

function App() {
  return (
    <Routes>
      <Route path="/" element={<IslandView />} />
      <Route path="/database" element={<DatabaseView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
