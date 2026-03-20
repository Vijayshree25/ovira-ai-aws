import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const APPOINTMENTS_TABLE = process.env.DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ appointmentId: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const { appointmentId } = await params;

        if (!userId || !appointmentId) {
            return NextResponse.json(
                { success: false, error: 'Missing userId or appointmentId' },
                { status: 400 }
            );
        }

        const response = await docClient.send(new GetCommand({
            TableName: APPOINTMENTS_TABLE,
            Key: { userId, appointmentId },
        }));

        if (!response.Item) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            appointment: response.Item
        });
    } catch (error: any) {
        console.error('Error fetching appointment:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch appointment' },
            { status: 500 }
        );
    }
}
