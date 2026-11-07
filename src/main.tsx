import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ConfigErrorScreen } from './app/ConfigErrorScreen'
import { parseFirebaseSettings } from './lib/firebase/config'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root is missing from index.html')
const root = createRoot(rootElement)

// Check the settings before anything imports Firebase, so a bad config shows a clear screen.
const config = parseFirebaseSettings(import.meta.env)

if (config.ok) {
  const { App } = await import('./app/App')
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <ConfigErrorScreen problems={config.problems} />
    </StrictMode>,
  )
}
