import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Appointment ID is required' },
                { status: 400 }
            );
        }

        const tableName = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';

        const response = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { id },
        }));

        if (!response.Item) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            status: response.Item.status,
            summaryGenerated: response.Item.summaryGenerated,
            summaryContent: response.Item.summaryContent,
        });
    } catch (error: any) {
        console.error('Status check API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch appointment status', details: error.message },
            { status: 500 }
        );
    }
}
