"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
     Dialog,
     DialogContent,
     DialogDescription,
     DialogHeader,
     DialogTitle,
     DialogTrigger,
} from '@/components/ui/dialog';

export default function LoginHandler() {
     const searchParams = useSearchParams();
     const router = useRouter();
     const { isAuthenticated, isLoading } = useAppStore((state) => ({
          isAuthenticated: state.isAuthenticated,
          isLoading: state.isLoading,
     }));
     const [error, setError] = useState<string | null>(null);

     // Redirect if user is already authenticated
     useEffect(() => {
          console.log('Login page - Auth state:', { isLoading, isAuthenticated });
          if (!isLoading && isAuthenticated) {
               console.log('Redirecting to home page...');
               router.push('/');
          }
     }, [isAuthenticated, isLoading, router]);

     useEffect(() => {
          const errorParam = searchParams.get('error');
          if (errorParam) {
               switch (errorParam) {
                    case 'oauth_error':
                         setError('Authentication was cancelled or failed');
                         break;
                    case 'no_code':
                         setError('No authorization code received');
                         break;
                    case 'missing_state':
                         setError('Security validation failed');
                         break;
                    case 'invalid_state':
                         setError('Session expired, please try again');
                         break;
                    case 'csrf_protection':
                         setError('Security error detected, please try again');
                         break;
                    case 'token_exchange':
                         setError('Failed to exchange authorization code');
                         break;
                    case 'user_fetch':
                         setError('Failed to fetch user information');
                         break;
                    case 'server_error':
                         setError('Server error occurred during authentication');
                         break;
                    default:
                         setError('Authentication failed');
               }
          }
     }, [searchParams]);

     const handleDiscordLogin = () => {
          // Clear any existing errors
          setError(null);

          // Redirect to backend OAuth route
          const backendAuthUrl = 'http://localhost:3001/api/auth/discord';
          console.log('Redirecting to backend auth:', backendAuthUrl);

          window.location.href = backendAuthUrl;
     };

     // Show loading state while checking authentication
     if (isLoading) {
          return (
               <div className="min-h-screen bg-background flex items-center justify-center theme-transition">
                    <div className="text-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                         <p className="text-muted-foreground">Loading...</p>
                    </div>
               </div>
          );
     }

     // Don't render login page if user is authenticated (will redirect)
     if (!isLoading && isAuthenticated) {
          console.log('User is authenticated, not rendering login page');
          return null;
     }

     return (
          <div className="min-h-screen bg-background flex items-center justify-center px-4 theme-transition">
               <div className="max-w-md w-full">
                    {/* Logo and branding */}
                    <div className="text-center mb-12">
                         <div className="bg-white rounded-2xl p-12 mb-8 shadow-sm">
                              <h1 className="text-4xl font-light mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent">
                                   stashcord
                              </h1>
                              <p className="text-sm text-gray-500 tracking-widest uppercase">
                                   MINIMUM EFFORT ENTERPRISE SOLUTION
                              </p>
                         </div>

                         <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                              Your Personal Cloud, Powered by Discord.
                         </h2>
                         <p className="text-gray-600 leading-relaxed mb-4">
                              Securely upload, manage, and access your files using a familiar interface, all stored on Discord&apos;s powerful infrastructure.
                         </p>

                         <Dialog>
                              <DialogTrigger asChild>
                                   <Button variant="outline" className="mb-6">
                                        How it works
                                   </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                   <DialogHeader>
                                        <DialogTitle>How Stashcord Works</DialogTitle>
                                        <DialogDescription>
                                             Learn how your files are stored and managed securely.
                                        </DialogDescription>
                                   </DialogHeader>
                                   <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                             <ul className="text-sm text-blue-800 space-y-2">
                                                  <li className="flex items-start gap-2">
                                                       <span className="text-blue-600 font-bold">•</span>
                                                       <span>Files are uploaded to your Discord server as attachments</span>
                                                  </li>
                                                  <li className="flex items-start gap-2">
                                                       <span className="text-blue-600 font-bold">•</span>
                                                       <span>Your files remain private and accessible only to you</span>
                                                  </li>
                                                  <li className="flex items-start gap-2">
                                                       <span className="text-blue-600 font-bold">•</span>
                                                       <span>No data is stored on our servers - everything lives on Discord</span>
                                                  </li>
                                                  <li className="flex items-start gap-2">
                                                       <span className="text-blue-600 font-bold">•</span>
                                                       <span>Manage files with a clean, intuitive web interface</span>
                                                  </li>
                                             </ul>
                                        </div>
                                   </div>
                              </DialogContent>
                         </Dialog>

                         <p className="text-xs text-gray-500 mb-6">
                              Developed by <span className="font-semibold text-gray-700">Cyx</span> • Not affiliated with Discord Inc.
                         </p>
                    </div>

                    {/* Error message */}
                    {error && (
                         <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                              <strong>Authentication Error:</strong> {error}
                         </div>
                    )}

                    {/* Login button */}
                    <div className="text-center">
                         <Button
                              onClick={handleDiscordLogin}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
                         >
                              <svg
                                   className="w-5 h-5"
                                   fill="currentColor"
                                   viewBox="0 0 24 24"
                                   xmlns="http://www.w3.org/2000/svg"
                              >
                                   <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                              </svg>
                              Continue with Discord
                         </Button>
                    </div>
               </div>
          </div>
     );
}