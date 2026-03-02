import { ResourcesConfig } from 'aws-amplify';

// Validate required environment variables
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const region = process.env.NEXT_PUBLIC_AWS_REGION;

if (!userPoolId) {
  throw new Error('NEXT_PUBLIC_COGNITO_USER_POOL_ID is not defined in environment variables');
}

if (!userPoolClientId) {
  throw new Error('NEXT_PUBLIC_COGNITO_CLIENT_ID is not defined in environment variables');
}

if (!region) {
  throw new Error('NEXT_PUBLIC_AWS_REGION is not defined in environment variables');
}

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
      },
    },
  },
};
