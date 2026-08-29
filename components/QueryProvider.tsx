'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // Turn off automatic refetch on window focus
        refetchOnReconnect: true,   // Refetch when internet reconnects
        staleTime: 1000 * 60 * 2,    // ⚡ Cache data in memory for 2 minutes (instant 0ms page navigation)
        gcTime: 1000 * 60 * 10,      // Keep unused cache in memory for 10 minutes
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
