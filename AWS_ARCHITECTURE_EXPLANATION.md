# Ovira AI - AWS Architecture & Generative AI Integration

## 🎯 Project Overview

**Ovira AI** is a women's health companion that uses AWS Generative AI services to provide personalized, stigma-free health insights and decision support.

---

## 🤖 Why AI is Required

### The Problem
Women's health is often stigmatized, leading to:
- Delayed medical consultations due to embarrassment
- Lack of accessible health information
- Difficulty tracking and understanding symptom patterns
- Limited decision-support tools for health management

### The AI Solution
Generative AI is **essential** because:

1. **Empathetic Communication**: AI provides stigma-free, judgment-free health conversations
2. **Pattern Recognition**: Analyzes symptom logs to identify health patterns across cycles
3. **Personalized Insights**: Generates tailored recommendations based on individual health data
4. **24/7 Availability**: Provides immediate health information when users need it
5. **Educational Support**: Explains complex health concepts in accessible language

**AI is not replacing doctors** - it's empowering women with information to make better healthcare decisions and know when to seek professional help.

---

## 🏗️ AWS Services Used

### 1. Amazon Bedrock (Generative AI Core)

**Service**: Amazon Bedrock with Claude 3 Haiku & Titan Text Express

**Why This Service**:
- Access to state-of-the-art foundation models (Claude 3 Haiku)
- Built-in safety guardrails for medical content
- Serverless - no infrastructure management
- Pay-per-token pricing (cost-effective for hackathon)

**How It's Used**:
```typescript
// Location: src/lib/aws/bedrock.ts
// AI Chat Assistant for health queries
const bedrockClient = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: awsCredentials
});

// Generates empathetic, non-diagnostic health responses
// Includes medical safety guardrails
// Provides decision-support information
```

**Value Added**:
- Empathetic, stigma-free health conversations
- Educational health information delivery
- Encourages professional consultation when needed
- Medical safety guardrails prevent diagnostic language

**Files**: 
- `src/lib/aws/bedrock.ts`
- `src/app/api/chat/route.ts`
- `src/app/(dashboard)/chat/page.tsx`

---

### 2. Amazon DynamoDB (NoSQL Database)

**Service**: Amazon DynamoDB with 4 tables

**Why This Service**:
- Serverless, fully managed NoSQL database
- Automatic scaling for variable workloads
- Single-digit millisecond latency
- Pay-per-request pricing (cost-effective)

**How It's Used**:
```typescript
// Tables:
// 1. ovira-users - User profiles and settings
// 2. ovira-symptoms - Daily symptom logs with timestamps
// 3. ovira-reports - Generated health analysis reports
// 4. ovira-chat-history - AI conversation history with TTL

// Location: src/lib/aws/dynamodb.ts
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Stores user health data securely
// Enables pattern analysis across time
// Supports AI context retrieval
```

**Value Added**:
- Fast retrieval of symptom history for AI analysis
- Scalable storage for growing user base
- TTL for automatic chat history cleanup (privacy)
- Global Secondary Indexes for date-based queries

**Files**:
- `src/lib/aws/dynamodb.ts`
- `src/app/api/analyze/route.ts`

---

### 3. Amazon S3 (Object Storage)

**Service**: Amazon S3 with encryption and versioning

**Why This Service**:
- Secure, durable object storage (99.999999999% durability)
- Encryption at rest (AES-256)
- Versioning for data protection
- Cost-effective for file storage

**How It's Used**:
```typescript
// Location: src/lib/aws/s3.ts
const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: awsCredentials
});

// Stores AI-generated health reports (PDFs)
// Enables secure sharing with healthcare providers
// Supports data export for medical consultations
```

**Value Added**:
- Secure storage for sensitive health reports
- Easy export for doctor visits
- Versioning protects against accidental deletion
- Encryption ensures data privacy

**Files**:
- `src/lib/aws/s3.ts`
- `src/app/api/health-report/route.ts`

---

### 4. AWS Cognito (Authentication)

**Service**: AWS Cognito User Pools

**Why This Service**:
- Fully managed user authentication
- Built-in security features (MFA, password policies)
- Email verification
- Secure token-based authentication

**How It's Used**:
```typescript
// Location: src/lib/aws/cognito.ts
// User Pool: us-east-1_itYHpVqJo
// Handles signup, signin, email verification
// Secure session management
```

**Value Added**:
- Secure user authentication
- Email verification for account security
- Password policy enforcement
- User-only data access (privacy)

**Files**:
- `src/lib/aws/cognito.ts`
- `src/contexts/auth-context.tsx`
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/signin/route.ts`

---

### 5. AWS IAM (Access Control)

**Service**: AWS IAM Policies and Users

**Why This Service**:
- Least privilege access control
- Secure credential management
- Service-specific permissions

**How It's Used**:
```json
// IAM Policy: OviraAppPolicy
{
  "Effect": "Allow",
  "Action": [
    "cognito-idp:*",
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:Query",
    "s3:PutObject",
    "s3:GetObject",
    "bedrock:InvokeModel"
  ],
  "Resource": [...]
}
```

**Value Added**:
- Secure access to AWS services
- Prevents unauthorized data access
- Audit trail for security compliance

---

## 🎨 What Value the AI Layer Adds

### 1. Intelligent Health Companion

**AI Feature**: Conversational health assistant powered by Claude 3 Haiku

**Value**:
- Provides empathetic, stigma-free health conversations
- Answers questions about symptoms, cycles, and health concerns
- Available 24/7 without judgment
- Encourages professional consultation when needed

**Technical Implementation**:
```typescript
// AI generates contextual responses based on:
// - User's symptom history from DynamoDB
// - Current health concerns
// - Medical safety guardrails
// - Empathetic communication style
```

---

### 2. Pattern Analysis & Insights

**AI Feature**: Automated health pattern recognition

**Value**:
- Identifies symptom patterns across menstrual cycles
- Detects correlations (e.g., pain levels vs. cycle phase)
- Generates personalized health insights
- Provides statistical indicators (non-diagnostic)

**Technical Implementation**:
```typescript
// AI analyzes:
// - Historical symptom data from DynamoDB
// - Cycle patterns and trends
// - Pain, mood, energy correlations
// - Generates actionable insights
```

---

### 3. Personalized Health Reports

**AI Feature**: AI-generated health summaries for medical consultations

**Value**:
- Summarizes symptom history for doctor visits
- Highlights important patterns and trends
- Export-ready PDF format
- Saves time during medical appointments

**Technical Implementation**:
```typescript
// AI generates:
// - Comprehensive symptom summaries
// - Pattern analysis reports
// - Recommendations for healthcare providers
// - Stored securely in S3
```

---

### 4. Decision-Support (Not Diagnostic)

**AI Feature**: Medical safety guardrails and decision support

**Value**:
- Provides information to support healthcare decisions
- Never provides diagnoses or treatment recommendations
- Encourages professional medical consultation
- Transparent about AI limitations

**Technical Implementation**:
```typescript
// AI system prompts include:
// - "This is not medical advice"
// - "Consult a healthcare provider"
// - Blocks diagnostic language
// - Focuses on education and support
```

---

## 📊 AWS Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│              (Next.js 15 + React 18)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  AWS Cognito                                │
│            (Authentication & Authorization)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                      │
│         /api/chat | /api/analyze | /api/health-report      │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Amazon Bedrock   │ │  DynamoDB    │ │  Amazon S3   │
│ (Claude 3 Haiku) │ │ (User Data)  │ │  (Reports)   │
│                  │ │              │ │              │
│ • AI Chat        │ │ • Users      │ │ • PDFs       │
│ • Analysis       │ │ • Symptoms   │ │ • Encrypted  │
│ • Insights       │ │ • Reports    │ │ • Versioned  │
│ • Guardrails     │ │ • Chat Logs  │ │              │
└──────────────────┘ └──────────────┘ └──────────────┘
```

---

## 🔒 Security & Privacy

### Data Encryption
- **At Rest**: DynamoDB encryption, S3 AES-256 encryption
- **In Transit**: TLS 1.3 for all API calls
- **Credentials**: AWS IAM with least privilege access

### Privacy Features
- User-only data access via Cognito authentication
- Chat history TTL (automatic deletion)
- Data export capability
- Account deletion support

### Medical Safety
- AI guardrails prevent diagnostic language
- Encourages professional consultation
- Transparent about AI limitations
- Non-diagnostic statistical indicators only

---

## 💰 Cost Optimization

### Serverless Architecture
- **No idle costs**: Pay only for actual usage
- **Auto-scaling**: Handles variable workloads
- **Hackathon estimate**: $5-23 for 2-3 days

### Service Costs
- **Cognito**: Free (< 50K MAUs)
- **DynamoDB**: On-demand pricing (~$2-5)
- **S3**: Minimal storage (~$1)
- **Bedrock**: Pay-per-token (~$5-20)

---

## 🚀 Deployment & Scalability

### Current Setup
- **Frontend**: Next.js 15 (can deploy to AWS Amplify)
- **API**: Next.js API routes (can migrate to Lambda)
- **Database**: DynamoDB (auto-scales)
- **Storage**: S3 (unlimited scalability)

### Production Recommendations
1. Deploy to **AWS Amplify** for frontend hosting
2. Migrate API routes to **AWS Lambda** + **API Gateway**
3. Use **CloudFront** for global CDN
4. Enable **CloudWatch** for monitoring
5. Implement **AWS WAF** for security

---

## 📈 Future AWS Enhancements

### 1. Amazon Comprehend Medical
- Extract medical entities from symptom logs
- Identify health conditions mentioned in chat
- Improve pattern recognition accuracy

### 2. AWS Lambda for Background Jobs
- Scheduled cycle predictions
- Automated health report generation
- Email notifications via SES

### 3. Amazon SageMaker
- Custom ML models for cycle prediction
- Personalized symptom pattern recognition
- Anomaly detection for health concerns

### 4. AWS Step Functions
- Orchestrate complex health analysis workflows
- Multi-step report generation
- Error handling and retries

---

## 🎯 Hackathon Evaluation Criteria

### ✅ Why AI is Required
- Empathetic health conversations (stigma-free)
- Pattern recognition across symptom data
- Personalized health insights
- 24/7 decision-support availability

### ✅ How AWS Services are Used
- **Bedrock**: Foundation model access (Claude 3 Haiku)
- **DynamoDB**: Scalable NoSQL storage
- **S3**: Secure report storage
- **Cognito**: User authentication
- **IAM**: Access control

### ✅ What Value the AI Layer Adds
- Stigma-free health conversations
- Automated pattern analysis
- Personalized recommendations
- Decision-support (not diagnostic)
- Export-ready health reports

### ✅ AWS-Native Patterns
- Serverless architecture (no servers to manage)
- Pay-per-use pricing model
- Auto-scaling infrastructure
- Built-in security and encryption
- Fully managed services

---

## 📚 Technical Documentation

### Key Files
- `src/lib/aws/bedrock.ts` - AI integration
- `src/lib/aws/dynamodb.ts` - Database operations
- `src/lib/aws/s3.ts` - File storage
- `src/lib/aws/cognito.ts` - Authentication
- `src/app/api/chat/route.ts` - AI chat endpoint
- `src/app/api/analyze/route.ts` - Pattern analysis

### Environment Variables
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***

# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=***
NEXT_PUBLIC_COGNITO_CLIENT_ID=***

# DynamoDB Tables
NEXT_PUBLIC_DYNAMODB_USERS_TABLE=ovira-users
NEXT_PUBLIC_DYNAMODB_SYMPTOMS_TABLE=ovira-symptoms
NEXT_PUBLIC_DYNAMODB_REPORTS_TABLE=ovira-reports
NEXT_PUBLIC_DYNAMODB_CHAT_TABLE=ovira-chat-history

# S3
NEXT_PUBLIC_S3_REPORTS_BUCKET=ovira-reports-prototype

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

---

## 🏆 Conclusion

**Ovira AI** demonstrates comprehensive use of AWS Generative AI services to solve a real-world problem in women's health. The architecture leverages:

- **Amazon Bedrock** for empathetic AI conversations
- **DynamoDB** for scalable data storage
- **S3** for secure report storage
- **Cognito** for user authentication
- **IAM** for security and access control

The AI layer adds significant value by providing stigma-free health support, automated pattern analysis, and personalized insights - all while maintaining medical safety guardrails and encouraging professional consultation.

This is a production-ready, scalable, and cost-effective solution built entirely on AWS-native services.

---

**Made with ❤️ for women's health | Powered by AWS**
