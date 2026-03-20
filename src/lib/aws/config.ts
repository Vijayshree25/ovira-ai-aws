'use client';

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// AWS Configuration
export const awsConfig = {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
};

// Cognito Configuration
export const cognitoConfig = {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
};

// Note: Bedrock config is defined in src/lib/aws/bedrock.ts (server-side only)
// because it uses non-NEXT_PUBLIC_ env vars that are unavailable in client modules.

// Initialize Cognito Client only (doesn't need user credentials)
let cognitoClient: CognitoIdentityProviderClient | undefined;


function initializeCognitoClient() {
    if (typeof window === 'undefined') return;

    try {
        // Initialize Cognito Client (doesn't need user credentials)
        cognitoClient = new CognitoIdentityProviderClient({
            region: cognitoConfig.region,
        });

        console.log('Cognito client initialized successfully');
    } catch (error) {
        console.error('Cognito initialization error:', error);
    }
}

// Initialize on first load
if (typeof window !== 'undefined') {
    initializeCognitoClient();
}

// Export Cognito client only
export { cognitoClient };

// Type-safe getter
export function getCognitoClient(): CognitoIdentityProviderClient {
    if (!cognitoClient) {
        initializeCognitoClient();
        if (!cognitoClient) throw new Error('Cognito client not initialized');
    }
    return cognitoClient;
}

// Helper function to check if AWS is properly configured
export function isAWSConfigured(): boolean {
    return !!(
        cognitoConfig.userPoolId &&
        cognitoConfig.clientId &&
        awsConfig.region
    );
}