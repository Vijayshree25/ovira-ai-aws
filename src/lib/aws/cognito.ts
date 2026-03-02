'use client';

import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserAttribute,
    CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from './config';

// Initialize Cognito User Pool
console.log('Cognito Config:', {
    UserPoolId: cognitoConfig.userPoolId,
    ClientId: cognitoConfig.clientId,
    Region: cognitoConfig.region
});

const userPool = new CognitoUserPool({
    UserPoolId: cognitoConfig.userPoolId,
    ClientId: cognitoConfig.clientId,
});

export interface CognitoAuthUser {
    username: string;
    email: string;
    attributes: Record<string, string>;
    session: CognitoUserSession;
}

// Sign up new user
export async function signUpUser(
    email: string,
    password: string,
    displayName: string
): Promise<CognitoUser> {
    return new Promise((resolve, reject) => {
        console.log('Attempting signup with:', { email, displayName, passwordLength: password.length });
        
        const attributeList = [
            new CognitoUserAttribute({
                Name: 'email',
                Value: email,
            }),
            new CognitoUserAttribute({
                Name: 'name',
                Value: displayName,
            }),
        ];

        userPool.signUp(email, password, attributeList, [], (err, result) => {
            if (err) {
                console.error('Cognito signup error:', err);
                console.error('Error details:', {
                    code: err.code,
                    name: err.name,
                    message: err.message,
                    statusCode: err.statusCode
                });
                reject(err);
                return;
            }
            if (!result) {
                reject(new Error('Sign up failed'));
                return;
            }
            console.log('Signup successful:', result);
            resolve(result.user);
        });
    });
}

// Sign in user
export async function signInUser(email: string, password: string): Promise<CognitoAuthUser> {
    return new Promise((resolve, reject) => {
        const authenticationDetails = new AuthenticationDetails({
            Username: email,
            Password: password,
        });

        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool,
        });

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (session) => {
                cognitoUser.getUserAttributes((err, attributes) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const attributesMap: Record<string, string> = {};
                    attributes?.forEach((attr) => {
                        attributesMap[attr.Name] = attr.Value;
                    });

                    resolve({
                        username: cognitoUser.getUsername(),
                        email: attributesMap['email'] || email,
                        attributes: attributesMap,
                        session,
                    });
                });
            },
            onFailure: (err) => {
                reject(err);
            },
        });
    });
}

// Sign out user
export async function signOutUser(): Promise<void> {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
}

// Get current user
export async function getCurrentUser(): Promise<CognitoAuthUser | null> {
    return new Promise((resolve) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            resolve(null);
            return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session || !session.isValid()) {
                resolve(null);
                return;
            }

            cognitoUser.getUserAttributes((err, attributes) => {
                if (err) {
                    resolve(null);
                    return;
                }

                const attributesMap: Record<string, string> = {};
                attributes?.forEach((attr) => {
                    attributesMap[attr.Name] = attr.Value;
                });

                resolve({
                    username: cognitoUser.getUsername(),
                    email: attributesMap['email'] || '',
                    attributes: attributesMap,
                    session,
                });
            });
        });
    });
}

// Refresh session
export async function refreshSession(): Promise<CognitoUserSession> {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session) {
                reject(err || new Error('No session found'));
                return;
            }

            const refreshToken = session.getRefreshToken();
            cognitoUser.refreshSession(refreshToken, (err, newSession) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(newSession);
            });
        });
    });
}

// Reset password
export async function resetPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool,
        });

        cognitoUser.forgotPassword({
            onSuccess: () => {
                resolve();
            },
            onFailure: (err) => {
                reject(err);
            },
        });
    });
}

// Confirm password reset
export async function confirmPasswordReset(
    email: string,
    verificationCode: string,
    newPassword: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool,
        });

        cognitoUser.confirmPassword(verificationCode, newPassword, {
            onSuccess: () => {
                resolve();
            },
            onFailure: (err) => {
                reject(err);
            },
        });
    });
}

// Update user attributes
export async function updateUserAttributes(attributes: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session) {
                reject(err || new Error('No session found'));
                return;
            }

            const attributeList = Object.entries(attributes).map(
                ([key, value]) =>
                    new CognitoUserAttribute({
                        Name: key,
                        Value: value,
                    })
            );

            cognitoUser.updateAttributes(attributeList, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}

// Get ID token for API calls
export async function getIdToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session) {
                reject(err || new Error('No session found'));
                return;
            }

            resolve(session.getIdToken().getJwtToken());
        });
    });
}

// Helper function to get Cognito error message
export function getCognitoErrorMessage(error: any): string {
    const code = error.code || error.name;

    switch (code) {
        case 'UserNotFoundException':
            return 'No account found with this email';
        case 'NotAuthorizedException':
            return 'Incorrect email or password';
        case 'UserNotConfirmedException':
            return 'Please verify your email before signing in';
        case 'UsernameExistsException':
            return 'An account with this email already exists';
        case 'InvalidPasswordException':
            return 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
        case 'InvalidParameterException':
            return 'Invalid email or password format';
        case 'TooManyRequestsException':
            return 'Too many attempts. Please try again later';
        case 'LimitExceededException':
            return 'Attempt limit exceeded. Please try again later';
        case 'CodeMismatchException':
            return 'Invalid verification code';
        case 'ExpiredCodeException':
            return 'Verification code has expired';
        case 'NetworkError':
            return 'Network error. Please check your connection';
        default:
            return error.message || 'An error occurred. Please try again';
    }
}

export { userPool };
