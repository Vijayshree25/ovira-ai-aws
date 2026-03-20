import { S3Client, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { config } from 'dotenv';
config({ path: '.env.local' });

const client = new S3Client({
    region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_REPORTS_BUCKET || 'ovira-reports-prototype';

async function main() {
    console.log(`🔍 Checking S3 bucket: ${BUCKET_NAME}...`);
    try {
        await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`   ✓ Bucket ${BUCKET_NAME} already exists.`);
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            console.log(`   ⏳ Creating S3 bucket: ${BUCKET_NAME}...`);
            try {
                await client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
                console.log(`   ✓ Bucket ${BUCKET_NAME} created successfully.`);
            } catch (createErr) {
                console.error(`   ✗ FAILED to create bucket:`, createErr.message);
            }
        } else {
            console.error(`   ✗ FAILED to check bucket:`, err.message);
        }
    }
}

main().catch(console.error);
