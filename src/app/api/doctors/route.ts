import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const DOCTORS_TABLE = process.env.DYNAMODB_DOCTORS_TABLE || 'ovira-doctors';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ success: false, message: 'UserId is required' }, { status: 400 });
    }

    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: DOCTORS_TABLE,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId }
        }));
        return NextResponse.json({ success: true, doctors: Items || [] });
    } catch (error: any) {
        console.error('Doctors GET error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, name, specialty, hospital, city, notes, isPreferred, doctorId } = body;

        if (!userId || !name) {
            return NextResponse.json({ success: false, message: 'UserId and name are required' }, { status: 400 });
        }

        const id = doctorId || uuidv4();
        const doctorData = {
            userId,
            doctorId: id,
            name,
            specialty,
            hospital,
            city,
            notes,
            isPreferred: !!isPreferred,
            updatedAt: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName: DOCTORS_TABLE,
            Item: doctorData
        }));

        return NextResponse.json({ success: true, doctor: doctorData });
    } catch (error: any) {
        console.error('Doctors POST error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const doctorId = searchParams.get('doctorId');

    if (!userId || !doctorId) {
        return NextResponse.json({ success: false, message: 'UserId and doctorId are required' }, { status: 400 });
    }

    try {
        await docClient.send(new DeleteCommand({
            TableName: DOCTORS_TABLE,
            Key: { userId, doctorId }
        }));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Doctors DELETE error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
