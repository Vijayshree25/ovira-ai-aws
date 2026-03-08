import { NextRequest, NextResponse } from 'next/server';
import {
    CognitoIdentityProviderClient,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';

const client = new CognitoIdentityProviderClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
});

function calculateSecretHash(username: string): string {
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
    const clientSecret = process.env.COGNITO_CLIENT_SECRET!;
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code, newPassword } = body;

        // If we have code + newPassword, confirm the password reset
        if (code && newPassword) {
            const command = new ConfirmForgotPasswordCommand({
                ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
                Username: email,
                ConfirmationCode: code,
                Password: newPassword,
                SecretHash: calculateSecretHash(email),
            });

            await client.send(command);

            return NextResponse.json({
                success: true,
                confirmed: true,
                message: 'Password reset successfully',
            });
        }

        // Otherwise, initiate the forgot password flow
        const command = new ForgotPasswordCommand({
            ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
            Username: email,
            SecretHash: calculateSecretHash(email),
        });

        const response = await client.send(command);

        return NextResponse.json({
            success: true,
            deliveryMedium: response.CodeDeliveryDetails?.DeliveryMedium,
            destination: response.CodeDeliveryDetails?.Destination,
        });
    } catch (error: any) {
        console.error('Forgot password error:', error);

        let message = 'Something went wrong. Please try again.';
        if (error.name === 'UserNotFoundException') {
            message = 'No account found with this email address.';
        } else if (error.name === 'LimitExceededException') {
            message = 'Too many attempts. Please try again later.';
        } else if (error.name === 'CodeMismatchException') {
            message = 'Invalid verification code. Please check and try again.';
        } else if (error.name === 'ExpiredCodeException') {
            message = 'Verification code has expired. Please request a new one.';
        } else if (error.name === 'InvalidPasswordException') {
            message = 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
        } else if (error.name === 'InvalidParameterException') {
            message = 'Invalid input. Please check your details and try again.';
        }

        return NextResponse.json(
            {
                success: false,
                error: error.name || 'ForgotPasswordError',
                message,
            },
            { status: 400 }
        );
    }
}
