import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const dynamoClient = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Calculate SECRET_HASH for Cognito
function calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    return crypto
        .createHmac('SHA256', clientSecret)
        .update(username + clientId)
        .digest('base64');
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, displayName } = await request.json();

        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
        const clientSecret = process.env.COGNITO_CLIENT_SECRET || '';

        const secretHash = calculateSecretHash(email, clientId, clientSecret);

        // Sign up user in Cognito
        const command = new SignUpCommand({
            ClientId: clientId,
            Username: email,
            Password: password,
            SecretHash: secretHash,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email,
                },
                {
                    Name: 'name',
                    Value: displayName,
                },
            ],
        });

        const response = await cognitoClient.send(command);

        // Create user profile in DynamoDB
        const userProfile = {
            uid: email,
            email: email,
            displayName: displayName,
            onboardingComplete: false,
            createdAt: new Date().toISOString(),
            averageCycleLength: 28,
            conditions: [],
            language: 'en',
            ageRange: '25-34',
        };

        await docClient.send(
            new PutCommand({
                TableName: process.env.DYNAMODB_USERS_TABLE || 'ovira-users',
                Item: userProfile,
            })
        );

        return NextResponse.json({
            success: true,
            userSub: response.UserSub,
            userConfirmed: response.UserConfirmed,
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        
        // Map AWS Cognito errors to user-friendly messages
        let errorMessage = 'Signup failed. Please try again.';
        
        if (error.name === 'InvalidPasswordException') {
            errorMessage = 'Password must be at least 8 characters and include uppercase, lowercase, and numbers.';
        } else if (error.name === 'UsernameExistsException') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.name === 'InvalidParameterException') {
            errorMessage = 'Invalid email or password format.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                code: error.name,
            },
            { status: 400 }
        );
    }
}
