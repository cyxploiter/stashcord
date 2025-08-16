import { Suspense } from 'react';
import LoginHandler from './LoginHandler';

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginHandler />
    </Suspense>
  );
}
