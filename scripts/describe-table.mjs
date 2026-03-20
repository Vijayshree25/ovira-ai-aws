#!/usr/bin/env node

import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
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

const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'ovira-users';

async function describeTable() {
  try {
    const command = new DescribeTableCommand({ TableName: TABLE_NAME });
    const response = await client.send(command);
    
    console.log('Table Schema:');
    console.log('Key Schema:', JSON.stringify(response.Table.KeySchema, null, 2));
    console.log('Attribute Definitions:', JSON.stringify(response.Table.AttributeDefinitions, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

describeTable();
