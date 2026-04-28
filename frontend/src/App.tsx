import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './lib/auth'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './lib/theme'
import { AppRoutes } from './routes'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <QueryClientProvider client={queryClient}>
              <AppRoutes />
            </QueryClientProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
