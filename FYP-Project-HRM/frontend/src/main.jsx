import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Change this line to look for 'root' instead of 'app'
const container = document.getElementById('root')

if (!container) {
  throw new Error('Failed to find the root element')
}

const root = ReactDOM.createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)