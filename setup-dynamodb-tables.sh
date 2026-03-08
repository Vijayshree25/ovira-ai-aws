#!/bin/bash

echo "Creating DynamoDB tables for Ovira AI..."
echo ""

# Create ovira-symptoms table
echo "Creating ovira-symptoms table..."
aws dynamodb create-table \
    --table-name ovira-symptoms \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-symptoms table created successfully!"
else
    echo "Failed to create ovira-symptoms table or it already exists."
fi

echo ""
echo "Waiting for table to be active..."
aws dynamodb wait table-exists --table-name ovira-symptoms --region us-east-1

echo ""
echo "Creating ovira-users table..."
aws dynamodb create-table \
    --table-name ovira-users \
    --attribute-definitions \
        AttributeName=uid,AttributeType=S \
    --key-schema \
        AttributeName=uid,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-users table created successfully!"
else
    echo "Failed to create ovira-users table or it already exists."
fi

echo ""
echo "Creating ovira-reports table..."
aws dynamodb create-table \
    --table-name ovira-reports \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=reportId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=reportId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-reports table created successfully!"
else
    echo "Failed to create ovira-reports table or it already exists."
fi

echo ""
echo "Creating ovira-chat-history table..."
aws dynamodb create-table \
    --table-name ovira-chat-history \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=sessionId_timestamp,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=sessionId_timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-chat-history table created successfully!"
else
    echo "Failed to create ovira-chat-history table or it already exists."
fi

echo ""
echo "Creating ovira-appointments table..."
aws dynamodb create-table \
    --table-name ovira-appointments \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=appointmentId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=appointmentId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-appointments table created successfully!"
else
    echo "Failed to create ovira-appointments table or it already exists."
fi

echo ""
echo "Creating ovira-doctors table..."
aws dynamodb create-table \
    --table-name ovira-doctors \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=doctorId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=doctorId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-doctors table created successfully!"
else
    echo "Failed to create ovira-doctors table or it already exists."
fi

echo ""
echo "Creating ovira-documents table..."
aws dynamodb create-table \
    --table-name ovira-documents \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=docId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=docId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-documents table created successfully!"
else
    echo "Failed to create ovira-documents table or it already exists."
fi

echo ""
echo "Creating ovira-articles table..."
aws dynamodb create-table \
    --table-name ovira-articles \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "ovira-articles table created successfully!"
else
    echo "Failed to create ovira-articles table or it already exists."
fi

echo ""
echo "========================================"
echo "DynamoDB tables setup complete!"
echo "========================================"
echo ""
echo "Tables created:"
echo "- ovira-symptoms (for symptom logs)"
echo "- ovira-users (for user profiles)"
echo "- ovira-reports (for health reports)"
echo "- ovira-chat-history (for chat messages)"
echo "- ovira-doctors (for doctor portfolio)"
echo "- ovira-documents (for medical records)"
echo "- ovira-articles (for AI insights cache)"
echo ""
echo "You can verify the tables in AWS Console:"
echo "https://console.aws.amazon.com/dynamodb/home?region=us-east-1#tables:"
echo ""
