import { Suspense } from 'react';
import CallbackHandler from './CallbackHandler';

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
