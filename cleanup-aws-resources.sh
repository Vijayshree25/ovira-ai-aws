#!/bin/bash

# AWS Resource Cleanup Script for Ovira AI
# Run this script after your hackathon to delete all resources and avoid costs

echo "⚠️  WARNING: This will DELETE all Ovira AI AWS resources!"
echo "This includes:"
echo "  - DynamoDB Tables (all data will be lost)"
echo "  - S3 Bucket and all files"
echo "  - Cognito User Pool (all users will be deleted)"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

REGION="us-east-1"

echo ""
echo "🗑️  Starting cleanup in region: $REGION"
echo ""

# Delete DynamoDB Tables
echo "Deleting DynamoDB tables..."
aws dynamodb delete-table --table-name ovira-users --region $REGION 2>/dev/null && echo "✅ Deleted ovira-users" || echo "⚠️  ovira-users not found"
aws dynamodb delete-table --table-name ovira-symptoms --region $REGION 2>/dev/null && echo "✅ Deleted ovira-symptoms" || echo "⚠️  ovira-symptoms not found"
aws dynamodb delete-table --table-name ovira-reports --region $REGION 2>/dev/null && echo "✅ Deleted ovira-reports" || echo "⚠️  ovira-reports not found"
aws dynamodb delete-table --table-name ovira-chat-history --region $REGION 2>/dev/null && echo "✅ Deleted ovira-chat-history" || echo "⚠️  ovira-chat-history not found"

# Empty and Delete S3 Bucket
echo ""
echo "Emptying and deleting S3 bucket..."
aws s3 rm s3://ovira-reports-prototype --recursive --region $REGION 2>/dev/null && echo "✅ Emptied bucket" || echo "⚠️  Bucket empty or not found"
aws s3api delete-bucket --bucket ovira-reports-prototype --region $REGION 2>/dev/null && echo "✅ Deleted S3 bucket" || echo "⚠️  S3 bucket not found"

# Delete Cognito User Pool
echo ""
echo "Deleting Cognito User Pool..."
USER_POOL_ID="us-east-1_itYHpVqJo"
aws cognito-idp delete-user-pool --user-pool-id $USER_POOL_ID --region $REGION 2>/dev/null && echo "✅ Deleted Cognito User Pool" || echo "⚠️  User Pool not found"

# Note: Bedrock access doesn't incur costs when not in use, so no cleanup needed

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "💡 Remember to also:"
echo "  1. Delete IAM user 'ovira-app-user' from AWS Console"
echo "  2. Delete IAM policy 'OviraAppPolicy' from AWS Console"
echo "  3. Revoke Bedrock model access if desired (no cost when not used)"
echo "  4. Check AWS Cost Explorer to verify no ongoing charges"
echo ""
