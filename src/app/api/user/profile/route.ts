import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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

    // Use scan to find user by id, uid, or email
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'id = :id OR uid = :uid OR email = :email',
      ExpressionAttributeValues: {
        ':id': userId,
        ':uid': userId,
        ':email': userId,
      },
      Limit: 1,
    });

    const response = await docClient.send(command);
    const profile = response.Items?.[0];

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

    if (!userId || !updates) {
      return NextResponse.json(
        { success: false, error: 'InvalidRequest', message: 'userId and updates are required' },
        { status: 400 }
      );
    }

    // First, find the user to get the correct key
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'id = :id OR uid = :uid OR email = :email',
      ExpressionAttributeValues: {
        ':id': userId,
        ':uid': userId,
        ':email': userId,
      },
      Limit: 1,
    });

    const scanResponse = await docClient.send(scanCommand);
    const existingUser = scanResponse.Items?.[0];

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

    // Determine key
    let updateKey;
    if (existingUser.id) {
      updateKey = { id: existingUser.id };
    } else if (existingUser.uid) {
      updateKey = { uid: existingUser.uid };
    } else {
      updateKey = { email: existingUser.email };
    }

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

// Export wrapped handlers
export const GET = withRateLimit(handleGet, 'dynamodb');
export const POST = withRateLimit(handlePost, 'dynamodb');
export const PATCH = withRateLimit(handlePatch, 'dynamodb');
