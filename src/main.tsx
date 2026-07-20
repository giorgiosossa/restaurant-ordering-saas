import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { EmployeeSessionProvider } from './contexts/EmployeeSessionContext.tsx'
import { OwnerAuthProvider } from './contexts/OwnerAuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <OwnerAuthProvider>
        <EmployeeSessionProvider>
          <App />
        </EmployeeSessionProvider>
      </OwnerAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
