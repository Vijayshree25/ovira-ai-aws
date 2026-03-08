import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DEMO_DOCTORS } from '@/lib/constants/doctors';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: NextRequest) {
    try {
        const { userId, doctorId, date, time } = await request.json();

        if (!userId || !doctorId || !date || !time) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const doctor = DEMO_DOCTORS.find(d => d.doctorId === doctorId);
        if (!doctor) {
            return NextResponse.json(
                { success: false, error: 'Doctor not found' },
                { status: 404 }
            );
        }

        const appointmentId = randomUUID();

        const appointment = {
            id: appointmentId,
            userId,
            doctorId,
            doctorName: doctor.name,
            hospital: doctor.hospital,
            city: doctor.city,
            date,
            time,
            status: 'confirmed',
            summaryGenerated: false,
            summarySent: false,
            createdAt: new Date().toISOString(),
        };

        const tableName = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';

        await docClient.send(new PutCommand({
            TableName: tableName,
            Item: appointment,
        }));

        // Trigger background summary generation
        const origin = new URL(request.url).origin;
        fetch(`${origin}/api/appointments/generate-summary`, {
            method: 'POST',
            body: JSON.stringify({ appointmentId, userId }),
            headers: { 'Content-Type': 'application/json' },
        }).catch(err => console.error('Summary trigger background error:', err));

        return NextResponse.json({
            success: true,
            appointmentId,
            appointment,
        });
    } catch (error: any) {
        console.error('Booking API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to book appointment', details: error.message },
            { status: 500 }
        );
    }
}
