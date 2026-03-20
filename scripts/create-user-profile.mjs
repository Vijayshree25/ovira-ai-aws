#!/usr/bin/env node

/**
 * Script to manually create a user profile in DynamoDB
 * Usage: node scripts/create-user-profile.mjs <email>
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/create-user-profile.mjs <email>');
  process.exit(1);
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'ovira-users';

async function createUserProfile() {
  try {
    console.log(`Creating user profile for: ${email}`);
    console.log(`Table: ${TABLE_NAME}`);

    // Check if profile already exists
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: email }, // Changed to id (actual primary key)
    });

    const existing = await docClient.send(getCommand);
    
    if (existing.Item) {
      console.log('✓ User profile already exists:');
      console.log(JSON.stringify(existing.Item, null, 2));
      return;
    }

    // Create new profile
    const userProfile = {
      id: email, // Primary key (actual schema)
      userId: email,
      uid: email,
      email: email,
      displayName: email.split('@')[0],
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
      averageCycleLength: 28,
      conditions: [],
      language: 'en',
      ageRange: '25-34',
    };

    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: userProfile,
    });

    await docClient.send(putCommand);

    console.log('✓ User profile created successfully:');
    console.log(JSON.stringify(userProfile, null, 2));
  } catch (error) {
    console.error('✗ Error creating user profile:', error);
    process.exit(1);
  }
}

createUserProfile();
