# AWS Bedrock Setup Guide

This guide will help you set up AWS Bedrock with Claude 3 Haiku for the Ovira AI application.

## Prerequisites

1. AWS Account with Bedrock access
2. AWS CLI configured with your credentials
3. Correct AWS credentials in `.env.local`

## Step 1: Enable Model Access

### Via AWS Console (Recommended)

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess)
2. Click "Manage model access" or "Model access" in the left sidebar
3. Find **Anthropic Claude 3 Haiku** in the list
4. Check the box next to it
5. Click "Request model access" or "Save changes"
6. Wait for approval (usually instant for Claude models)

### Via AWS CLI

```bash
# Check current model access
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?contains(modelId, 'claude-3-haiku')]"

# The model ID should be: anthropic.claude-3-haiku-20240307-v1:0
```

## Step 2: Verify IAM Permissions

Your IAM user/role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
                "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-express-v1"
            ]
        }
    ]
}
```

## Step 3: Verify Environment Variables

Check your `.env.local` file has:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Amazon Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_FALLBACK_MODEL_ID=amazon.titan-text-express-v1
BEDROCK_REGION=us-east-1
```

## Step 4: Test Bedrock Access

### Test via AWS CLI

```bash
# Test Claude 3 Haiku invocation
aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --region us-east-1 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
    output.json

# View the response
cat output.json
```

### Test via Application

1. Start your Next.js development server
2. Navigate to `/chat` page
3. Send a test message like "Hello"
4. Check the browser console and server logs for any errors

## Features Implemented

### 1. Chat with AI (`/chat` page)
- Real-time conversation with Claude 3 Haiku
- Conversation history context (last 10 messages)
- User profile context (age, conditions)
- Medical safety guardrails
- Fallback responses if Bedrock is unavailable

### 2. Health Report Generation (`/health-report` page)
- AI-powered analysis of symptom logs
- Doctor-friendly report format
- Statistical analysis
- Risk assessment
- Personalized recommendations
- Fallback to rule-based report if AI unavailable

## Medical Safety Features

The implementation includes:

1. **Prohibited Terms Filter**: Prevents diagnostic language
2. **Response Sanitization**: Replaces medical terms with decision-support language
3. **Disclaimer Addition**: Adds healthcare consultation reminders
4. **System Prompts**: Configured to provide educational information only
5. **Fallback Responses**: Pre-written safe responses if AI fails

## Troubleshooting

### Error: "AccessDeniedException"
**Solution**: Enable model access in Bedrock console (Step 1)

### Error: "ValidationException: The provided model identifier is invalid"
**Solution**: Verify the model ID is exactly `anthropic.claude-3-haiku-20240307-v1:0`

### Error: "ResourceNotFoundException"
**Solution**: Bedrock is not available in your region. Use `us-east-1`

### Chat returns fallback responses
**Causes**:
1. AWS credentials not configured
2. Model access not enabled
3. IAM permissions missing
4. Network/API issues

**Check**:
- Server logs for detailed error messages
- Browser console for API response errors
- AWS CloudWatch logs for Bedrock invocations

### Health report shows "AI service unavailable"
**Solution**: Same as chat troubleshooting above

## Cost Information

### Claude 3 Haiku Pricing (as of 2024)
- **Input**: $0.25 per million tokens (~$0.00025 per 1K tokens)
- **Output**: $1.25 per million tokens (~$0.00125 per 1K tokens)

### Estimated Costs
For a small application with 1000 users:
- **Chat**: ~$5-10/month (assuming 10 messages per user per month)
- **Health Reports**: ~$2-5/month (assuming 1 report per user per month)
- **Total**: ~$7-15/month

Claude 3 Haiku is one of the most cost-effective models available.

## Testing Checklist

- [ ] Model access enabled in Bedrock console
- [ ] IAM permissions configured
- [ ] Environment variables set correctly
- [ ] AWS CLI test successful
- [ ] Chat page loads without errors
- [ ] Can send and receive chat messages
- [ ] Health report generates successfully
- [ ] Fallback responses work when Bedrock unavailable
- [ ] Medical disclaimers appear in responses

## Next Steps

After setup:
1. Test the chat feature with various health questions
2. Generate a health report with sample symptom logs
3. Monitor AWS CloudWatch for Bedrock usage
4. Review costs in AWS Cost Explorer
5. Adjust system prompts if needed for better responses

## Support

If you encounter issues:
1. Check server logs: `npm run dev` output
2. Check browser console: F12 → Console tab
3. Check AWS CloudWatch Logs
4. Verify all environment variables are set
5. Test AWS credentials with CLI commands
