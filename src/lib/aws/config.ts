'use client';

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// AWS Configuration
export const awsConfig = {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
    },
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

// Initialize AWS Clients (client-side only)
let cognitoClient: CognitoIdentityProviderClient | undefined;
let dynamoDBClient: DynamoDBClient | undefined;
let docClient: DynamoDBDocumentClient | undefined;
let s3Client: S3Client | undefined;


if (typeof window !== 'undefined') {
    try {
        // Initialize Cognito Client
        cognitoClient = new CognitoIdentityProviderClient({
            region: cognitoConfig.region,
        });

        // Initialize DynamoDB Client
        dynamoDBClient = new DynamoDBClient(awsConfig);
        docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            },
        });

        // Initialize S3 Client
        s3Client = new S3Client(awsConfig);



        console.log('AWS clients initialized successfully');
    } catch (error) {
        console.error('AWS initialization error:', error);
    }
}

// Export clients
export { cognitoClient, dynamoDBClient, docClient, s3Client };

// Type-safe getters
export function getCognitoClient(): CognitoIdentityProviderClient {
    if (!cognitoClient) throw new Error('Cognito client not initialized. Are you running on the server?');
    return cognitoClient;
}

export function getDynamoDBClient(): DynamoDBClient {
    if (!dynamoDBClient) throw new Error('DynamoDB client not initialized. Are you running on the server?');
    return dynamoDBClient;
}

export function getDocClient(): DynamoDBDocumentClient {
    if (!docClient) throw new Error('DynamoDB Document client not initialized. Are you running on the server?');
    return docClient;
}

export function getS3Client(): S3Client {
    if (!s3Client) throw new Error('S3 client not initialized. Are you running on the server?');
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
