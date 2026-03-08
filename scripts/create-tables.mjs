import { DynamoDBClient, CreateTableCommand, ListTablesCommand, DescribeTableCommand, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import { config } from 'dotenv';
config({ path: '.env.local' });

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

// All tables required by the app
const TABLES = [
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_USERS_TABLE || 'ovira-users',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_SYMPTOMS_TABLE || 'ovira-symptoms',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'date', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'date', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_REPORTS_TABLE || 'ovira-reports',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'reportId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'reportId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_CHAT_TABLE || 'ovira-chat-history',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'messageId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'messageId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_DOCTORS_TABLE || 'ovira-doctors',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'doctorId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'doctorId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_DOCUMENTS_TABLE || 'ovira-documents',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'docId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'docId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'appointmentId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'appointmentId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: process.env.NEXT_PUBLIC_DYNAMODB_ARTICLES_TABLE || 'ovira-articles',
        KeySchema: [{ AttributeName: 'articleId', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'articleId', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
    },
];

async function getExistingTables() {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    return TableNames || [];
}

async function main() {
    console.log('🔍 Checking existing DynamoDB tables...');
    const existing = await getExistingTables();
    console.log('   Existing tables:', existing.join(', ') || '(none)');
    console.log('');

    for (const tableSpec of TABLES) {
        const name = tableSpec.TableName;
        if (existing.includes(name)) {
            console.log(`   ✓ ${name} (already exists)`);
            continue;
        }

        try {
            console.log(`   ⏳ Creating ${name}...`);
            await client.send(new CreateTableCommand(tableSpec));
            // Wait until table is active
            await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: name });
            console.log(`   ✓ ${name} created successfully`);
        } catch (err) {
            if (err.name === 'ResourceInUseException') {
                console.log(`   ✓ ${name} (already exists)`);
            } else {
                console.error(`   ✗ ${name} FAILED:`, err.message);
            }
        }
    }

    console.log('\n✅ Done! All tables are ready.');
}

main().catch(console.error);
