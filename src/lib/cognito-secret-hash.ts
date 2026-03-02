import crypto from 'crypto';

/**
 * Calculate SECRET_HASH for Cognito authentication
 * This is needed when your app client has a client secret configured
 */
export function calculateSecretHash(username: string): string {
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET!;

  if (!clientSecret) {
    throw new Error('COGNITO_CLIENT_SECRET is not defined');
  }

  const message = username + clientId;
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}
