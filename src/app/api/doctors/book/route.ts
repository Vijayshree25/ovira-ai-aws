import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Appointment } from '@/types';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const APPOINTMENTS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, doctorId, doctorName, hospital, address, mapsUrl, date, time } = body;

        if (!userId || !doctorId || !date || !time) {
            return NextResponse.json(
                { success: false, error: 'Missing required booking fields' },
                { status: 400 }
            );
        }

        const appointmentId = `appt_${uuidv4()}`;
        const appointment: Appointment = {
            appointmentId,
            userId,
            doctorId,
            doctorName,
            hospital,
            address,
            mapsUrl,
            date,
            time,
            status: 'confirmed',
            healthSummaryGenerated: false,
            healthSummarySent: false,
            createdAt: new Date().toISOString(),
        };

        await docClient.send(new PutCommand({
            TableName: APPOINTMENTS_TABLE,
            Item: appointment,
        }));

        return NextResponse.json({ success: true, appointmentId, message: 'Appointment booked successfully' });
    } catch (error: any) {
        console.error('Error booking doctor:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to book appointment' },
            { status: 500 }
        );
    }
}
