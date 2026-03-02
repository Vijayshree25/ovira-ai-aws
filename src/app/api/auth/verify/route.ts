import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';

const client = new CognitoIdentityProviderClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

function calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
    return crypto
        .createHmac('SHA256', clientSecret)
        .update(username + clientId)
        .digest('base64');
}

export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json();

        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
        const clientSecret = process.env.COGNITO_CLIENT_SECRET || '';

        const secretHash = calculateSecretHash(email, clientId, clientSecret);

        const command = new ConfirmSignUpCommand({
            ClientId: clientId,
            Username: email,
            ConfirmationCode: code,
            SecretHash: secretHash,
        });

        await client.send(command);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Verification error:', error);
        
        let errorMessage = 'Verification failed. Please try again.';
        
        if (error.name === 'CodeMismatchException') {
            errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (error.name === 'ExpiredCodeException') {
            errorMessage = 'Verification code has expired. Please request a new one.';
        } else if (error.name === 'NotAuthorizedException') {
            errorMessage = 'User is already verified or code is invalid.';
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
