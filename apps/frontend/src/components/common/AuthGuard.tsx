import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/store';

interface AuthGuardProps {
     children: React.ReactNode;
}

const publicPaths = ['/login', '/auth/discord/callback'];

export default function AuthGuard({ children }: AuthGuardProps) {
     const [isHydrated, setIsHydrated] = useState(false);
     const { isAuthenticated, isLoading } = useAppStore((state) => ({
          isAuthenticated: state.isAuthenticated,
          isLoading: state.isLoading,
     }));
     const router = useRouter();
     const pathname = usePathname();

     useEffect(() => {
          setIsHydrated(true);
     }, []);

     useEffect(() => {
          if (isHydrated && !isLoading && !isAuthenticated && !publicPaths.includes(pathname)) {
               router.push('/login');
          }
     }, [isAuthenticated, isLoading, pathname, router, isHydrated]);

     // Show loading screen while hydrating or checking authentication
     if (!isHydrated || isLoading) {
          return (
               <div className="flex min-h-screen items-center justify-center bg-background theme-transition">
                    <div className="text-xl text-foreground">Loading...</div>
               </div>
          );
     }

     return <>{children}</>;
}