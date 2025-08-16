"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import HydrationBoundary from '@/components/common/HydrationBoundary';
import { SettingsProvider } from '@/context/SettingsContext';

export default function Providers({ children }: { children: ReactNode }) {
     const [queryClient] = useState(() => new QueryClient());

     return (
          <QueryClientProvider client={queryClient}>
               <SettingsProvider>
                    <HydrationBoundary>
                         {children}
                    </HydrationBoundary>
               </SettingsProvider>
          </QueryClientProvider>
     );
}