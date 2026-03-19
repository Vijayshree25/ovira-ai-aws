import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const APPOINTMENTS_TABLE = process.env.DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const upcoming = searchParams.get('upcoming') === 'true';

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
        }

        const response = await docClient.send(new QueryCommand({
            TableName: APPOINTMENTS_TABLE,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId },
            ScanIndexForward: false,
        }));

        let appointments = response.Items || [];

        if (upcoming) {
            appointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
        }

        return NextResponse.json({ success: true, appointments });
    } catch (error: any) {
        console.error('Error listing appointments:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
