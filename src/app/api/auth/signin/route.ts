import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';

const client = new CognitoIdentityProviderClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

// Calculate SECRET_HASH for Cognito
function calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    return crypto
        .createHmac('SHA256', clientSecret)
        .update(username + clientId)
        .digest('base64');
}

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
        const clientSecret = process.env.COGNITO_CLIENT_SECRET || '';

        const secretHash = calculateSecretHash(email, clientId, clientSecret);

        const command = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
                SECRET_HASH: secretHash,
            },
        });

        const response = await client.send(command);

        return NextResponse.json({
            success: true,
            authenticationResult: response.AuthenticationResult,
        });
    } catch (error: any) {
        console.error('Signin error:', error);
        
        // Map AWS Cognito errors to user-friendly messages
        let errorMessage = 'Signin failed. Please try again.';
        
        if (error.name === 'NotAuthorizedException') {
            errorMessage = 'Incorrect email or password.';
        } else if (error.name === 'UserNotFoundException') {
            errorMessage = 'No account found with this email.';
        } else if (error.name === 'UserNotConfirmedException') {
            errorMessage = 'Please verify your email before signing in.';
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
