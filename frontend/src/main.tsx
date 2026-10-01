import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'

// One cache for all server data, shared by every component.
const queryClient = new QueryClient()

// The app's entry point. Wrapping <App /> in "providers" makes the query cache
// and the router available to every component inside, without passing them
// down by hand. StrictMode adds extra development-only checks.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
