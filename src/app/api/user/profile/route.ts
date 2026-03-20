import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { withRateLimit } from '@/middleware/rateLimit';

// Initialize DynamoDB client (server-side only)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'ovira-users';

// GET /api/user/profile?userId=xxx
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UserIdRequired', message: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Use direct get with id as primary key
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: userId },
    });

    const response = await docClient.send(command);
    const profile = response.Item;

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'ProfileNotFound', message: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.name || 'FetchError',
        message: error.message || 'Failed to fetch user profile',
      },
      { status: 500 }
    );
  }
}

// POST /api/user/profile - Create profile
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...profileData } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UserIdRequired', message: 'userId is required' },
        { status: 400 }
      );
    }

    const item = {
      id: userId,
      uid: userId,
      ...profileData,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    });

    await docClient.send(command);

    return NextResponse.json({
      success: true,
      profile: item,
    });
  } catch (error: any) {
    console.error('Error creating user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.name || 'CreateError',
        message: error.message || 'Failed to create user profile',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/user/profile - Update profile
async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updates } = body;

    console.log('[PATCH /api/user/profile] Request:', { userId, updates });

    if (!userId || !updates) {
      return NextResponse.json(
        { success: false, error: 'InvalidRequest', message: 'userId and updates are required' },
        { status: 400 }
      );
    }

    // Use direct get with id as primary key
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: userId },
    });

    console.log('[PATCH /api/user/profile] Getting user with id:', userId);

    const getResponse = await docClient.send(getCommand);
    const existingUser = getResponse.Item;

    console.log('[PATCH /api/user/profile] Get result:', {
      found: !!existingUser,
      user: existingUser,
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'ProfileNotFound', message: 'User profile not found' },
        { status: 404 }
      );
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    });

    // Use id as the primary key (already verified it exists)
    const updateKey = { id: userId };

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: updateKey,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const updateResponse = await docClient.send(updateCommand);

    return NextResponse.json({
      success: true,
      profile: updateResponse.Attributes,
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.name || 'UpdateError',
        message: error.message || 'Failed to update user profile',
      },
      { status: 500 }
    );
  }
}

// Export handlers without rate limiting for now (debugging)
export const GET = handleGet;
export const POST = handlePost;
export const PATCH = handlePatch;
