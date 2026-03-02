'use client';

import { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './amplify-config';

interface AmplifyProviderProps {
  children: React.ReactNode;
}

export function AmplifyProvider({ children }: AmplifyProviderProps) {
  useEffect(() => {
    Amplify.configure(amplifyConfig, { ssr: true });
  }, []);

  return <>{children}</>;
}
