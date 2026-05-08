import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import { getApiBaseUrl } from './utils/network'

const apiBaseUrl = getApiBaseUrl()
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
