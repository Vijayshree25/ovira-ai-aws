'use client';

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

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

// DynamoDB Table Names
export const dynamoDBTables = {
    users: process.env.NEXT_PUBLIC_DYNAMODB_USERS_TABLE || 'ovira-users',
    symptoms: process.env.NEXT_PUBLIC_DYNAMODB_SYMPTOMS_TABLE || 'ovira-symptoms',
    reports: process.env.NEXT_PUBLIC_DYNAMODB_REPORTS_TABLE || 'ovira-reports',
    chatHistory: process.env.NEXT_PUBLIC_DYNAMODB_CHAT_TABLE || 'ovira-chat-history',
};

// S3 Configuration
export const s3Config = {
    reportsBucket: process.env.NEXT_PUBLIC_S3_REPORTS_BUCKET || 'ovira-reports-prototype',
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
};

// Note: Bedrock config is defined in src/lib/aws/bedrock.ts (server-side only)
// because it uses non-NEXT_PUBLIC_ env vars that are unavailable in client modules.

// Function to get credentials
function getCredentials() {
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
    
    if (accessKeyId && secretAccessKey) {
        return {
            accessKeyId,
            secretAccessKey,
        };
    }
    return undefined;
}

// Initialize AWS Clients (client-side only)
let cognitoClient: CognitoIdentityProviderClient | undefined;
let dynamoDBClient: DynamoDBClient | undefined;
let docClient: DynamoDBDocumentClient | undefined;
let s3Client: S3Client | undefined;


function initializeClients() {
    if (typeof window === 'undefined') return;

    try {
        const credentials = getCredentials();
        
        // Initialize Cognito Client (doesn't need user credentials)
        cognitoClient = new CognitoIdentityProviderClient({
            region: cognitoConfig.region,
        });

        // Initialize DynamoDB Client with credentials
        const clientConfig = {
            region: awsConfig.region,
            ...(credentials && { credentials }),
        };

        dynamoDBClient = new DynamoDBClient(clientConfig);
        docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            },
        });

        // Initialize S3 Client
        s3Client = new S3Client(clientConfig);

        console.log('AWS clients initialized successfully');
    } catch (error) {
        console.error('AWS initialization error:', error);
    }
}

// Initialize on first load
if (typeof window !== 'undefined') {
    initializeClients();
}

// Re-initialize clients when auth state changes
export function reinitializeClients() {
    initializeClients();
}

// Export clients
export { cognitoClient, dynamoDBClient, docClient, s3Client };

// Type-safe getters
export function getCognitoClient(): CognitoIdentityProviderClient {
    if (!cognitoClient) {
        initializeClients();
        if (!cognitoClient) throw new Error('Cognito client not initialized');
    }
    return cognitoClient;
}

export function getDynamoDBClient(): DynamoDBClient {
    if (!dynamoDBClient) {
        initializeClients();
        if (!dynamoDBClient) throw new Error('DynamoDB client not initialized');
    }
    return dynamoDBClient;
}

export function getDocClient(): DynamoDBDocumentClient {
    if (!docClient) {
        initializeClients();
        if (!docClient) throw new Error('DynamoDB Document client not initialized');
    }
    return docClient;
}

export function getS3Client(): S3Client {
    if (!s3Client) {
        initializeClients();
        if (!s3Client) throw new Error('S3 client not initialized');
    }
    return s3Client;
}

// Helper function to check if AWS is properly configured
export function isAWSConfigured(): boolean {
    return !!(
        cognitoConfig.userPoolId &&
        cognitoConfig.clientId &&
        awsConfig.region
    );
}