import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ApiError } from './api/client'
import App from './App.tsx'
import './index.css'

// One cache for all server data, shared by every component.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network/server errors up to 3 times, but not 4xx errors like
      // 404: asking again won't change the answer.
      retry: (failureCount, error) => {
        const isClientError = error instanceof ApiError && error.status < 500
        return !isClientError && failureCount < 3
      },
    },
  },
})

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
