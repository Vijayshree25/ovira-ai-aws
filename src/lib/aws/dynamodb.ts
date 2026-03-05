'use client';

import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, dynamoDBTables } from './config';
import { UserProfile, SymptomLog, HealthReport, ChatMessage } from '@/types';

// User Profile Operations
export async function createUserProfile(profile: Partial<UserProfile>): Promise<void> {
    const docClient = getDocClient();

    try {
        console.log('Creating user profile:', profile);

        // Ensure we have the required key fields for different possible table structures
        const item = {
            ...profile,
            createdAt: new Date().toISOString(),
        };

        // Add id field if it doesn't exist (some tables might use id as primary key)
        if (!item.id && (item.uid || item.email)) {
            item.id = item.uid || item.email;
        }

        // Ensure uid exists if id exists
        if (!item.uid && item.id) {
            item.uid = item.id;
        }

        console.log('Final item to create:', item);

        const command = new PutCommand({
            TableName: dynamoDBTables.users,
            Item: item,
        });

        await docClient.send(command);
        console.log('User profile created successfully');
    } catch (error: any) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const docClient = getDocClient();

    console.log(`Getting user profile for userId: ${userId}`);

    try {
        // Use scan approach to find user by id, uid, or email
        const scanCommand = new ScanCommand({
            TableName: dynamoDBTables.users,
            FilterExpression: 'id = :id OR uid = :uid OR email = :email',
            ExpressionAttributeValues: {
                ':id': userId,
                ':uid': userId,
                ':email': userId,
            },
            Limit: 1,
        });

        const scanResponse = await docClient.send(scanCommand);
        const profile = scanResponse.Items?.[0] as UserProfile;

        if (profile) {
            console.log('User profile found via scan');
            return profile;
        } else {
            console.log('No user profile found');
            return null;
        }
    } catch (error: any) {
        console.error('Error getting user profile via scan:', error);
        return null;
    }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const docClient = getDocClient();

    try {
        console.log(`Updating user profile for userId: ${userId}`);

        // First, find the user using scan to get the correct key
        const scanCommand = new ScanCommand({
            TableName: dynamoDBTables.users,
            FilterExpression: 'id = :id OR uid = :uid OR email = :email',
            ExpressionAttributeValues: {
                ':id': userId,
                ':uid': userId,
                ':email': userId,
            },
            Limit: 1,
        });

        const scanResponse = await docClient.send(scanCommand);
        const existingUser = scanResponse.Items?.[0];

        if (!existingUser) {
            console.log('User not found for update, creating new profile');
            // Create new profile if user doesn't exist
            await createUserProfile({
                id: userId,
                uid: userId,
                email: userId,
                ...updates,
            });
            return;
        }

        // Build update expression
        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        Object.entries(updates).forEach(([key, value], index) => {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            updateExpressions.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = value;
        });

        // Use the key from the existing user (try id first, then uid, then email)
        let updateKey;
        if (existingUser.id) {
            updateKey = { id: existingUser.id };
        } else if (existingUser.uid) {
            updateKey = { uid: existingUser.uid };
        } else {
            updateKey = { email: existingUser.email };
        }

        const updateCommand = new UpdateCommand({
            TableName: dynamoDBTables.users,
            Key: updateKey,
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        });

        await docClient.send(updateCommand);
        console.log('User profile updated successfully');
    } catch (error: any) {
        console.error('Error updating user profile:', error);

        // If update fails, try to create a new profile
        try {
            console.log('Update failed, attempting to create new profile');
            await createUserProfile({
                id: userId,
                uid: userId,
                email: userId,
                ...updates,
            });
        } catch (createError) {
            console.error('Failed to create profile as fallback:', createError);
            throw createError;
        }
    }
}

export async function deleteUserProfile(userId: string): Promise<void> {
    const docClient = getDocClient();
    const command = new DeleteCommand({
        TableName: dynamoDBTables.users,
        Key: { uid: userId },
    });
    await docClient.send(command);
}

// Symptom Log Operations
export async function createSymptomLog(log: Omit<SymptomLog, 'id'>): Promise<string> {
    const docClient = getDocClient();
    // Normalize date to YYYY-MM-DD for deterministic ID (upsert)
    const dateStr = typeof log.date === 'string' ? log.date : new Date(log.date).toISOString();
    const dateObj = new Date(dateStr);
    const normalizedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const id = `${log.userId}_${normalizedDate}`;

    const command = new PutCommand({
        TableName: dynamoDBTables.symptoms,
        Item: {
            ...log,
            id,
            date: normalizedDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    });

    await docClient.send(command);
    return id;
}

export async function getSymptomLog(userId: string, logId: string): Promise<SymptomLog | null> {
    const docClient = getDocClient();
    const command = new GetCommand({
        TableName: dynamoDBTables.symptoms,
        Key: { userId, timestamp: logId },
    });
    const response = await docClient.send(command);
    return (response.Item as SymptomLog) || null;
}

export async function getUserSymptomLogs(userId: string, limit: number = 100): Promise<SymptomLog[]> {
    const docClient = getDocClient();

    try {
        // First try the expected structure with Query
        const command = new QueryCommand({
            TableName: dynamoDBTables.symptoms,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            ScanIndexForward: false, // Sort descending (newest first)
            Limit: limit,
        });

        const response = await docClient.send(command);
        return (response.Items as SymptomLog[]) || [];
    } catch (error: any) {
        console.error('Query failed, trying scan approach:', error);

        // Fallback to scan if query fails (table structure might be different)
        try {
            const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
            const scanCommand = new ScanCommand({
                TableName: dynamoDBTables.symptoms,
                FilterExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
                Limit: limit,
            });

            const scanResponse = await docClient.send(scanCommand);
            const logs = (scanResponse.Items as SymptomLog[]) || [];

            // Sort by timestamp descending (newest first)
            return logs.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
                return bTime - aTime;
            });
        } catch (scanError) {
            console.error('Scan also failed:', scanError);
            return [];
        }
    }
}

export async function updateSymptomLog(
    userId: string,
    logId: string,
    updates: Partial<SymptomLog>
): Promise<void> {
    const docClient = getDocClient();

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
    });

    // Add updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
        TableName: dynamoDBTables.symptoms,
        Key: { userId, timestamp: logId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
    });

    await docClient.send(command);
}

export async function deleteSymptomLog(userId: string, logId: string): Promise<void> {
    const docClient = getDocClient();
    const command = new DeleteCommand({
        TableName: dynamoDBTables.symptoms,
        Key: { userId, timestamp: logId },
    });
    await docClient.send(command);
}

// Health Report Operations
export async function createHealthReport(report: Omit<HealthReport, 'id'>): Promise<string> {
    const docClient = getDocClient();
    const id = `report_${Date.now()}`;

    const command = new PutCommand({
        TableName: dynamoDBTables.reports,
        Item: {
            ...report,
            id,
            generatedAt: new Date().toISOString(),
        },
    });

    await docClient.send(command);
    return id;
}

export async function getUserHealthReports(userId: string, limit: number = 50): Promise<HealthReport[]> {
    const docClient = getDocClient();
    const command = new QueryCommand({
        TableName: dynamoDBTables.reports,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
        ScanIndexForward: false,
        Limit: limit,
    });

    const response = await docClient.send(command);
    return (response.Items as HealthReport[]) || [];
}

export async function getHealthReport(userId: string, reportId: string): Promise<HealthReport | null> {
    const docClient = getDocClient();
    const command = new GetCommand({
        TableName: dynamoDBTables.reports,
        Key: { userId, reportId },
    });
    const response = await docClient.send(command);
    return (response.Item as HealthReport) || null;
}

// Chat History Operations
export async function saveChatMessage(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<void> {
    const docClient = getDocClient();
    const timestamp = new Date().toISOString();
    const sortKey = `${sessionId}#${timestamp}`;

    const command = new PutCommand({
        TableName: dynamoDBTables.chatHistory,
        Item: {
            userId,
            sessionId_timestamp: sortKey,
            ...message,
            timestamp,
        },
    });

    await docClient.send(command);
}

export async function getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
): Promise<ChatMessage[]> {
    const docClient = getDocClient();
    const command = new QueryCommand({
        TableName: dynamoDBTables.chatHistory,
        KeyConditionExpression: 'userId = :userId AND begins_with(sessionId_timestamp, :sessionId)',
        ExpressionAttributeValues: {
            ':userId': userId,
            ':sessionId': sessionId,
        },
        ScanIndexForward: true, // Chronological order
        Limit: limit,
    });

    const response = await docClient.send(command);
    return (response.Items as ChatMessage[]) || [];
}

// Batch operations
export async function batchGetSymptomLogs(userId: string, logIds: string[]): Promise<SymptomLog[]> {
    const docClient = getDocClient();
    const results: SymptomLog[] = [];

    // DynamoDB BatchGet has a limit of 100 items
    for (let i = 0; i < logIds.length; i += 100) {
        const batch = logIds.slice(i, i + 100);
        const promises = batch.map((logId) => getSymptomLog(userId, logId));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter((log): log is SymptomLog => log !== null));
    }

    return results;
}

// Query by date range (optimized for calendar view)
export async function getSymptomLogsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
): Promise<SymptomLog[]> {
    const docClient = getDocClient();

    try {
        console.log(`Fetching symptom logs for user ${userId} from ${startDate} to ${endDate}`);

        // Use scan approach to match the API structure
        const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
        const command = new ScanCommand({
            TableName: dynamoDBTables.symptoms,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        });

        const response = await docClient.send(command);
        const allLogs = (response.Items as SymptomLog[]) || [];

        // Filter by date range on the client side
        const filteredLogs = allLogs.filter(log => {
            // Handle timezone issues by comparing dates properly
            let logDate: string;

            if (log.date.includes('T')) {
                // If it's an ISO string, parse it and format as local date
                const date = new Date(log.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                logDate = `${year}-${month}-${day}`;
            } else {
                // If it's already in YYYY-MM-DD format, use as is
                logDate = log.date;
            }

            return logDate >= startDate && logDate <= endDate;
        });

        console.log(`Found ${filteredLogs.length} symptom logs for date range ${startDate} to ${endDate}`);
        return filteredLogs;
    } catch (error) {
        console.error('Error fetching symptom logs by date range:', error);
        throw error;
    }
}
// Query symptom logs by month (optimized for calendar view)
export async function getSymptomLogsByMonth(
    userId: string,
    year: number,
    month: number
): Promise<SymptomLog[]> {
    try {
        console.log(`Fetching symptom logs for user ${userId}, month ${year}-${month + 1}`);

        // Call the API endpoint instead of accessing DynamoDB directly
        const response = await fetch(`/api/symptoms?userId=${encodeURIComponent(userId)}&limit=100`);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch symptom logs');
        }

        const allLogs = data.logs as SymptomLog[];

        // Calculate start and end dates for the month
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Filter logs for the specific month
        const filteredLogs = allLogs.filter(log => {
            // Handle timezone issues by comparing dates properly
            let logDate: string;

            if (log.date.includes('T')) {
                // If it's an ISO string, parse it and format as local date
                const date = new Date(log.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                logDate = `${year}-${month}-${day}`;
            } else {
                // If it's already in YYYY-MM-DD format, use as is
                logDate = log.date;
            }

            return logDate >= startDateStr && logDate <= endDateStr;
        });

        console.log(`Found ${filteredLogs.length} symptom logs for ${year}-${month + 1}`);
        return filteredLogs;
    } catch (error) {
        console.error('Error fetching symptom logs by month:', error);
        throw error;
    }
}
