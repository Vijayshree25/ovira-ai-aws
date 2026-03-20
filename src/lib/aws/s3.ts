// Server-side only - for use in API routes
// DO NOT import this file in client components

import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Configuration from server-side environment variables
const s3Config = {
    reportsBucket: process.env.S3_REPORTS_BUCKET || 'ovira-reports-prototype',
    region: process.env.AWS_REGION || 'us-east-1',
};

// Server-side S3 client initialization
function getS3Client() {
    return new S3Client({
        region: s3Config.region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });
}

// Upload file to S3
export async function uploadFile(
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType: string = 'application/pdf'
): Promise<string> {
    const s3Client = getS3Client();

    const command = new PutObjectCommand({
        Bucket: s3Config.reportsBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
    });

    await s3Client.send(command);

    return `https://${s3Config.reportsBucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
}

// Generate presigned URL for secure download
export async function getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const s3Client = getS3Client();

    const command = new GetObjectCommand({
        Bucket: s3Config.reportsBucket,
        Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
}

// Generate presigned URL for secure upload
export async function getPresignedUploadUrl(
    key: string,
    contentType: string = 'application/pdf',
    expiresIn: number = 3600
): Promise<string> {
    const s3Client = getS3Client();

    const command = new PutObjectCommand({
        Bucket: s3Config.reportsBucket,
        Key: key,
        ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
}

// Delete file from S3
export async function deleteFile(key: string): Promise<void> {
    const s3Client = getS3Client();

    const command = new DeleteObjectCommand({
        Bucket: s3Config.reportsBucket,
        Key: key,
    });

    await s3Client.send(command);
}

// Upload health report PDF
export async function uploadHealthReport(
    userId: string,
    reportId: string,
    pdfBuffer: Buffer
): Promise<string> {
    const key = `reports/${userId}/${reportId}.pdf`;
    return await uploadFile(key, pdfBuffer, 'application/pdf');
}

// Get health report download URL
export async function getHealthReportDownloadUrl(userId: string, reportId: string): Promise<string> {
    const key = `reports/${userId}/${reportId}.pdf`;
    return await getPresignedDownloadUrl(key, 86400); // 24 hours
}

// Delete health report
export async function deleteHealthReport(userId: string, reportId: string): Promise<void> {
    const key = `reports/${userId}/${reportId}.pdf`;
    await deleteFile(key);
}

// Helper to generate S3 key for user files
export function generateS3Key(userId: string, fileName: string, folder: string = 'reports'): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folder}/${userId}/${timestamp}_${sanitizedFileName}`;
}
