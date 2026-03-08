import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { config } from 'dotenv';
config({ path: '.env.local' });

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const run = async () => {
    try {
        const command = new ListTablesCommand({});
        const response = await client.send(command);
        console.log("Existing Tables:", response.TableNames);
    } catch (e) {
        console.error("Error listing tables:", e.message);
    }
};
run();
