import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Components
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import DatasetList from './components/DatasetList'
import DatasetDetail from './components/DatasetDetail'
import DataVisualizer from './components/DataVisualizer'
import FileUpload from './components/FileUpload'
import AdvancedVisualizer from './components/AdvancedVisualizer'

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/datasets" element={<DatasetList />} />
            <Route path="/datasets/:id" element={<DatasetDetail />} />
            <Route path="/visualize/:id" element={<DataVisualizer />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/advanced-visualize/:id" element={<AdvancedVisualizer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
