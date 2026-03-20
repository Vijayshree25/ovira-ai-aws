#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'ovira-users';
const userId = 'sahithisritha01@gmail.com';

async function testScan() {
  console.log('Testing scan with filter...');
  
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'id = :id OR uid = :uid OR email = :email',
    ExpressionAttributeValues: {
      ':id': userId,
      ':uid': userId,
      ':email': userId,
    },
    Limit: 1,
  });

  const scanResponse = await docClient.send(scanCommand);
  console.log('Scan result:', {
    count: scanResponse.Count,
    items: scanResponse.Items,
  });

  console.log('\nTesting direct get with id...');
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: userId },
  });

  const getResponse = await docClient.send(getCommand);
  console.log('Get result:', getResponse.Item);
}

testScan().catch(console.error);
