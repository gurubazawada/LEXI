'use client';

import { useEffect } from 'react';

export function WorldcoinStylesLoader() {
  useEffect(() => {
    // Dynamically import Worldcoin styles only on client side
    // This avoids the build-time CSS extraction issue
    if (typeof window !== 'undefined') {
      import('@worldcoin/mini-apps-ui-kit-react/styles.css').catch((err) => {
        console.warn('Failed to load Worldcoin styles:', err);
      });
    }
  }, []);

  return null;
}

