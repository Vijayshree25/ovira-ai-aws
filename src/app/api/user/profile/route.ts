import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        const tableName = process.env.NEXT_PUBLIC_DYNAMODB_USERS_TABLE || 'ovira-users';

        const command = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'uid = :uid OR email = :email OR id = :id',
            ExpressionAttributeValues: {
                ':uid': userId,
                ':email': userId,
                ':id': userId,
            },
            Limit: 1,
        });

        const response = await docClient.send(command);
        const profile = response.Items?.[0] || null;

        return NextResponse.json({
            success: true,
            profile,
        });
    } catch (error: any) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}
