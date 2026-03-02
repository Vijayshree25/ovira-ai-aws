import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityProviderClient,
  ResendConfirmationCodeCommand,
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
    const { email } = body;

    const command = new ResendConfirmationCodeCommand({
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      Username: email,
      SecretHash: calculateSecretHash(email),
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully',
    });
  } catch (error: any) {
    console.error('Resend code error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.name || 'ResendError',
        message: error.message || 'Failed to resend code',
      },
      { status: 400 }
    );
  }
}
