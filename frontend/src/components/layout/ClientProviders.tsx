'use client';

import { MasterPromptProvider } from '@/context/MasterPromptContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useEffect, type ReactNode } from 'react';

export function ClientProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Intercept uncaught errors injected by third-party browser extensions (e.g. VPNs, adblockers)
    const handleExtensionErrors = (event: ErrorEvent) => {
      const isExtension =
        event.filename?.startsWith('chrome-extension://') ||
        (event.error && typeof event.error.stack === 'string' && event.error.stack.includes('chrome-extension://'));
      if (isExtension) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleExtensionErrors, true);
    return () => window.removeEventListener('error', handleExtensionErrors, true);
  }, []);

  return (
    <ThemeProvider>
      <MasterPromptProvider>{children}</MasterPromptProvider>
    </ThemeProvider>
  );
}
