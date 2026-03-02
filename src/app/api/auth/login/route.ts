import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
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
    const { email, password, challengeResponse, session } = body;

    // If we have a challengeResponse, we're responding to an OTP challenge
    if (challengeResponse && session) {
      const command = new RespondToAuthChallengeCommand({
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        ChallengeName: 'EMAIL_OTP',
        ChallengeResponses: {
          EMAIL_OTP: challengeResponse,
          USERNAME: email,
          SECRET_HASH: calculateSecretHash(email),
        },
        Session: session,
      });

      const response = await client.send(command);

      return NextResponse.json({
        success: true,
        authenticationResult: response.AuthenticationResult,
        challengeName: response.ChallengeName,
        session: response.Session,
      });
    }

    // Initial login with email and password
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(email),
      },
    });

    const response = await client.send(command);

    return NextResponse.json({
      success: true,
      authenticationResult: response.AuthenticationResult,
      challengeName: response.ChallengeName,
      session: response.Session,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.name || 'AuthenticationError',
        message: error.message || 'Authentication failed',
      },
      { status: 400 }
    );
  }
}
