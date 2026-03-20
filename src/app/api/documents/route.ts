import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const DOCUMENTS_TABLE = process.env.DYNAMODB_DOCUMENTS_TABLE || 'ovira-documents';

const s3Client = new S3Client({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_REPORTS_BUCKET || 'ovira-reports-prototype';

/** GET: fetch all documents for a user, or get a presigned URL for a single doc */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const docId = searchParams.get('docId');

        if (!userId) {
            return NextResponse.json({ success: false, error: 'UserId is required' }, { status: 400 });
        }

        // If docId provided, return a pre-signed URL to view the file
        if (docId) {
            const { Items } = await docClient.send(new QueryCommand({
                TableName: DOCUMENTS_TABLE,
                KeyConditionExpression: 'userId = :uid AND docId = :did',
                ExpressionAttributeValues: { ':uid': userId, ':did': docId },
            }));
            const doc = Items?.[0];
            if (!doc?.s3Key) {
                return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
            }
            const url = await getSignedUrl(s3Client, new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: doc.s3Key,
            }), { expiresIn: 300 });
            return NextResponse.json({ success: true, url });
        }

        const { Items } = await docClient.send(new QueryCommand({
            TableName: DOCUMENTS_TABLE,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId },
        }));

        return NextResponse.json({ success: true, documents: Items || [] });
    } catch (error: any) {
        console.error('Error in documents GET:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch documents' }, { status: 500 });
    }
}

/** POST: upload a document (FormData with file, userId, category) */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const userId = formData.get('userId') as string;
        const category = (formData.get('category') as string) || 'other';

        if (!file || !userId) {
            return NextResponse.json({ success: false, error: 'Missing file or userId' }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 413 });
        }

        const docId = uuidv4();
        const ext = file.name.split('.').pop();
        const s3Key = `documents/${userId}/${docId}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: file.type,
        }));

        // Save metadata to DynamoDB
        const document = {
            userId,
            docId,
            filename: file.name,
            category,
            uploadedAt: new Date().toISOString(),
            s3Key,
            fileSize: file.size,
            shouldIncludeInSummary: true,
        };

        await docClient.send(new PutCommand({
            TableName: DOCUMENTS_TABLE,
            Item: document,
        }));

        return NextResponse.json({ success: true, document });
    } catch (error: any) {
        console.error('Error in documents POST:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to upload document' }, { status: 500 });
    }
}

/** PATCH: toggle shouldIncludeInSummary */
export async function PATCH(request: NextRequest) {
    try {
        const { userId, docId, shouldIncludeInSummary } = await request.json();

        if (!userId || !docId || typeof shouldIncludeInSummary !== 'boolean') {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }

        await docClient.send(new UpdateCommand({
            TableName: DOCUMENTS_TABLE,
            Key: { userId, docId },
            UpdateExpression: 'SET shouldIncludeInSummary = :val',
            ExpressionAttributeValues: { ':val': shouldIncludeInSummary },
        }));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in documents PATCH:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to update document status' }, { status: 500 });
    }
}

/** DELETE: remove a document from S3 and DynamoDB */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const docId = searchParams.get('docId');

        if (!userId || !docId) {
            return NextResponse.json({ success: false, error: 'Missing userId or docId' }, { status: 400 });
        }

        // Fetch doc to get s3Key
        const { Items } = await docClient.send(new QueryCommand({
            TableName: DOCUMENTS_TABLE,
            KeyConditionExpression: 'userId = :uid AND docId = :did',
            ExpressionAttributeValues: { ':uid': userId, ':did': docId },
        }));
        const doc = Items?.[0];

        if (doc?.s3Key) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }));
        }

        await docClient.send(new DeleteCommand({
            TableName: DOCUMENTS_TABLE,
            Key: { userId, docId },
        }));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in documents DELETE:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete document' }, { status: 500 });
    }
}
