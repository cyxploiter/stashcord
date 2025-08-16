"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackHandler() {
     const router = useRouter();
     const searchParams = useSearchParams();

     useEffect(() => {
          console.log('=== Discord Callback Page ===');
          console.log('Note: This page should rarely be reached with the new cookie-based auth.');
          console.log('Backend should redirect directly to /stash after setting session cookie.');

          // Check for Discord code (means Discord is misconfigured)
          const discordCode = searchParams.get('code');
          if (discordCode) {
               console.error('❌ DISCORD MISCONFIGURED: Discord redirected here instead of backend!');
               console.error('Fix: Set Discord redirect URI to http://localhost:3001/api/auth/discord/callback');
               console.error('Discord should redirect to BACKEND, not frontend!');

               // Redirect to login with error
               router.push('/login?error=discord_misconfigured');
               return;
          }

          // Check for error parameter
          const error = searchParams.get('error');
          if (error) {
               console.log('Authentication error:', error);
               router.push(`/login?error=${error}`);
               return;
          }

          // If we got here without code or error, just redirect to stash
          // The session cookie should already be set by the backend
          console.log('No code or error, redirecting to /stash');
          router.push('/stash');

     }, [searchParams, router]);

     return (
          <div className="flex min-h-screen flex-col items-center justify-center p-24">
               <h1 className="text-2xl">Processing Authentication...</h1>
               <p className="mt-4 text-gray-600">
                    Checking authentication status...
               </p>
               <div className="mt-4 text-sm text-gray-400">
                    <p>If this page does not redirect automatically, there may be a configuration issue.</p>
               </div>
          </div>
     );
}