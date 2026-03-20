# Ovira AI - Women's Health Symptom Intelligence Platform

<div align="center">

<img src="https://img.shields.io/badge/Ovira_AI-Women's_Health_Intelligence-7C3AED?style=for-the-badge&logo=heart&logoColor=white" alt="Ovira AI"/>

# 🩷 Ovira AI
### Women's Health Intelligence Platform — Built for India

*Not a period tracker. A health companion that actually understands you.*

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AWS Bedrock](https://img.shields.io/badge/Amazon_Bedrock-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![DynamoDB](https://img.shields.io/badge/DynamoDB-4053D6?style=flat-square&logo=amazondynamodb&logoColor=white)](https://aws.amazon.com/dynamodb/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**🏆 Built for AI for Bharat Hackathon 2025 — Powered by AWS**

[🚀 Live Demo](#) · [📹 Demo Video](#) · [📋 Docs](#architecture) · [🩷 Try as Priya](#demo-account)

</div>

---

## 🌟 What is Ovira AI?

Ovira AI is an **Indian-first women's health intelligence platform** that transforms daily symptom logs into personalised, doctor-ready health summaries — powered by a hybrid AI system built specifically for Indian women's health.

> *180 million Indian women track their health on WhatsApp. Not a health app. WhatsApp.*
> *Ovira exists to change that.*

**The core problem we solve:**
- 🩺 Women spend entire doctor appointments *explaining* their history instead of *getting help*
- 🍚 No health app understands Indian diet context — rice vs roti, jaggery, dal, iron absorption
- 🔬 Generic LLMs give generic advice — no app was trained on Indian menstrual health data
- ❌ Every app either tracks periods OR talks to AI — nothing connects tracking → AI → doctor

**Ovira connects all three.**

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📋 **Rich Onboarding** | Captures 3-month history, Indian diet (rice/roti), conditions, cycle data on Day 1 |
| 🤖 **Hybrid AI Routing** | Domain queries → MenstLLaMA (SLM), General queries → Amazon Bedrock |
| 🧬 **MenstLLaMA on EC2** | Fine-tuned SLM on 23,820 Indian menstrual health Q&As — outperforms GPT-4 on this domain |
| 📚 **RAG Pipeline** | Responses grounded in WHO, ACOG & NIH documents via Bedrock Knowledge Bases |
| 📊 **Pattern Analysis** | Statistical engine flags health concerns — PCOS, anaemia, endometriosis, PMS/PMDD |
| 📄 **Health Reports** | AI-generated doctor-ready summaries with concern flags & questions for your doctor |
| 🗓️ **Doctor Booking** | Browse verified gynaecologists, book slots, share complete health summary before appointment |
| 🔒 **Privacy First** | DPDP Act 2023 compliant — no PII sent to AI models, encrypted at rest |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OVIRA AI ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

  👩 Woman (User)
       │
       ▼
  ┌──────────────────┐
  │  Amazon Cognito  │  ← Signup, Login, OTP, JWT, Password Reset
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────────────────────────┐
  │      Next.js Serverless API Routes       │
  │  /api/auth    → Cognito flows            │
  │  /api/chat    → AI routing + context     │
  │  /api/symptoms → Symptom log CRUD        │
  │  /api/health-report → Report generation  │
  └────────────────────┬─────────────────────┘
                       │
           ┌───────────┴───────────┐
           │   Domain-specific?    │
           └───────┬───────────────┘
                   │
         YES ◄─────┴─────► NO
          │                  │
          ▼                  ▼
  ┌──────────────┐   ┌──────────────────────────────┐
  │     EC2      │   │       Amazon Bedrock          │
  │ MenstLLaMA  │   │  Claude 3 Haiku — AI chat     │
  │             │   │  Nova Micro — Fallback         │
  │ Fine-tuned  │   │  Titan Embeddings — RAG        │
  │ 23,820 Q&As │   │  Knowledge Bases:              │
  │ Indian data │   │  WHO + ACOG + NIH docs         │
  └──────┬───────┘   └──────────────┬───────────────┘
          └──────────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
  ┌─────────────────┐     ┌──────────────────┐
  │  Amazon         │     │    Amazon S3      │
  │  DynamoDB       │     │                  │
  │                 │     │  Health report   │
  │  User profiles  │     │  PDFs            │
  │  Symptom logs   │     │  Knowledge base  │
  │  Chat history   │     │  source files    │
  │  Appointments   │     │  (WHO, ACOG,NIH) │
  └─────────────────┘     └──────────────────┘
```

---

## 🤖 The AI Stack — What Makes Ovira Different

### Hybrid AI Routing
```
User asks: "Why do I get cramps before my period?"
    → routeToSLM("cramps before period") = TRUE
    → MenstLLaMA on EC2
    → Response grounded in Indian menstrual health training data
    → Badge shown: "🧬 Powered by MenstLLaMA"

User asks: "How much water should I drink daily?"
    → routeToSLM("water intake") = FALSE
    → Amazon Bedrock (Claude 3 Haiku + RAG)
    → Response grounded in WHO/ACOG/NIH documents
    → Citations shown to user
```

### MenstLLaMA
- **Base model:** LLaMA 3 8B Instruct, fine-tuned
- **Training data:** 23,820 menstrual health Q&A pairs (Indian context)
- **Published:** JMIR, January 2025
- **Performance:** Outperforms GPT-4o and Claude-3 on menstrual health domain accuracy
- **Deployment:** EC2 instance with llama-cpp-python (4-bit quantised GGUF)
- **Fallback:** If EC2 unavailable → Bedrock Claude Haiku automatically

### RAG Knowledge Base (2 separate KBs)
| KB | Purpose | Documents |
|---|---|---|
| Chatbot KB | Plain language patient responses | OWH Menstrual Cycle, PCOS, Endometriosis fact sheets |
| Clinical KB | Doctor-ready report generation | ACOG CPG No.7, WHO PCOS, NIH Iron Deficiency, FIGO HMB |

### Health Context Injection
Every single AI call receives the user's full health context:
```typescript
// Injected into EVERY prompt
healthContextSummary = `
  User is a [age] woman with [conditions].
  Follows a [diet] diet, [grain]-dominant staples.
  Cycle averages [N] days, [regularity].
  Personal goal: [goal].
  Iron-rich food intake: [frequency].
`
```
*This is why Ovira says "Given your PCOS and rice-dominant diet..." — not "Here is some general advice."*

---

## 🛠️ Tech Stack

### Frontend
```
Next.js 15 (App Router)    — Framework, SSR, API routes
TypeScript                  — Type safety throughout
Tailwind CSS               — All styling and responsive design
Lucide React               — Icon library
```

### AWS Backend
```
Amazon Cognito             — Auth: signup, OTP, JWT, password reset
Amazon DynamoDB            — Database: profiles, logs, chat, appointments
Amazon Bedrock             — AI: Claude 3 Haiku, Nova Micro, Titan, Knowledge Bases
Amazon S3                  — Storage: PDFs, knowledge base files
Amazon EC2                 — Compute: MenstLLaMA inference server
AWS SDK v3                 — @aws-sdk/client-* for all AWS connections
```

### AI Models
```
Claude 3 Haiku             — Primary AI companion chat
Nova Micro                 — Cost-efficient fallback
Titan Text Embeddings v2   — RAG document vectorisation
MenstLLaMA (EC2)           — Domain SLM for menstrual health queries
```

---

## 📁 Project Structure

```
ovira-ai/
├── src/
│   ├── app/
│   │   ├── (pages)/
│   │   │   ├── dashboard/          # Main dashboard + calendar heatmap
│   │   │   ├── chat/               # AI companion chat (Aria)
│   │   │   ├── chat/doctor/        # Structured pre-visit consultation
│   │   │   ├── log/                # Daily symptom logging
│   │   │   ├── reports/            # Health reports list
│   │   │   ├── health-report/      # Report generation + view
│   │   │   ├── doctors/            # Browse + book gynaecologists
│   │   │   ├── appointments/[id]/  # Appointment + health summary send
│   │   │   ├── articles/           # AI-personalised health content
│   │   │   ├── settings/           # Full health data hub
│   │   │   ├── onboarding/         # 6-step rich onboarding wizard
│   │   │   ├── login/              # Auth
│   │   │   └── signup/             # Auth
│   │   └── api/
│   │       ├── auth/               # Cognito flows (6 routes)
│   │       ├── chat/               # Hybrid AI routing
│   │       ├── symptoms/           # Symptom CRUD
│   │       ├── health-report/      # Report generation
│   │       ├── appointments/       # Booking + summary generation
│   │       ├── articles/           # AI-generated content
│   │       └── documents/          # Health document upload/fetch
│   ├── lib/
│   │   ├── aws/
│   │   │   ├── bedrock.ts          # Bedrock invocation + retry logic
│   │   │   ├── bedrock-kb.ts       # RAG Knowledge Base client
│   │   │   ├── cognito.ts          # Auth flows
│   │   │   ├── dynamodb.ts         # DB operations
│   │   │   └── s3.ts               # File storage
│   │   ├── menstllama-client.ts    # EC2 SLM client + routing logic
│   │   └── utils/
│   │       └── pattern-analysis.ts # Statistical concern flagging engine
│   ├── components/
│   │   ├── ui/                     # Design system components
│   │   ├── UpgradeGate.tsx         # Freemium enforcement wrapper
│   │   └── UpgradeModal.tsx        # Pro upgrade flow
│   ├── contexts/
│   │   └── auth-context.tsx        # Global user state + profile
│   └── types/
│       └── index.ts                # All TypeScript interfaces
├── scripts/
│   └── seed-demo-data.ts           # Seeds 365 days of data for Priya demo
└── public/
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AWS Account with Bedrock access enabled
- AWS CLI configured

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ovira-ai.git
cd ovira-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

```bash
# ── AWS Core ──────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# ── Amazon Cognito ────────────────────────────────────
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Amazon DynamoDB ───────────────────────────────────
DYNAMODB_TABLE_USERS=ovira-users
DYNAMODB_TABLE_SYMPTOMS=ovira-symptoms
DYNAMODB_TABLE_REPORTS=ovira-reports
DYNAMODB_TABLE_CHAT=ovira-chat-history
DYNAMODB_TABLE_APPOINTMENTS=ovira-appointments
DYNAMODB_TABLE_DOCUMENTS=ovira-documents

# ── Amazon Bedrock ────────────────────────────────────
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_FALLBACK_MODEL_ID=amazon.nova-micro-v1:0
BEDROCK_CHATBOT_KB_ID=your_chatbot_kb_id
BEDROCK_CLINICAL_KB_ID=your_clinical_kb_id

# ── Amazon S3 ─────────────────────────────────────────
S3_BUCKET_REPORTS=ovira-reports
S3_BUCKET_DOCUMENTS=ovira-documents
S3_BUCKET_KNOWLEDGE_BASE=ovira-knowledge-base

# ── MenstLLaMA EC2 ────────────────────────────────────
MENSTLLAMA_EC2_URL=http://your-ec2-public-ip:8080

# ── App ───────────────────────────────────────────────
NEXTAUTH_SECRET=your_secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Seed Demo Data

```bash
# Seeds 365 days of PCOS-pattern data for Priya demo account
npx ts-node scripts/seed-demo-data.ts
```

---

## 🩷 Demo Account

Want to explore Ovira AI without signing up?

```
Email:    demo@ovira.ai
Password: OviraDemo2025!
```

**Meet Priya** — our demo user:
- 27 years old, Bangalore
- Vegetarian, rice-dominant (South Indian) diet
- PCOS (diagnosed September 2024)
- 365 days of tracked symptom data
- Saved doctor: Dr. Meera Nair, Apollo Hospitals
- Uploaded document: Ultrasound report

> *Try asking Aria: "Why do I get acne before my period?" — watch MenstLLaMA respond with Indian context-aware advice*

---

## 💰 Cost Analysis

| Scale | Monthly Cost | Breakdown |
|---|---|---|
| **MVP / Dev** | ~$0 | All free tiers (Cognito 50K MAU, DynamoDB 25GB, S3 5GB) |
| **100 DAU** | ~$5–15 | Bedrock tokens only (Claude Haiku $0.25/1M input) |
| **1,000 DAU** | ~$28 | Bedrock + EC2 t3.medium (~$0.04/hr) |
| **10,000 DAU** | ~$245 | Bedrock scaled + response caching active |

**Cost optimisations built in:**
- Prompt hash caching → identical questions served from DynamoDB cache (TTL: 24h)
- Nova Micro fallback for simple queries (10x cheaper than Haiku)
- MenstLLaMA on EC2 for domain queries (fixed cost vs per-token Bedrock)
- Retry with exponential backoff (1s/2s/4s) prevents wasteful duplicate calls

---

## 🔒 Privacy & Responsible AI

### DPDP Act 2023 Compliance (India)
- ✅ Explicit consent screen before onboarding
- ✅ No PII sent to AI models — only anonymised health patterns
- ✅ Right to erasure — full account deletion in Settings
- ✅ Data localisation — all data in AWS ap-south-1 (Mumbai)
- ✅ User can export all their data as JSON at any time

### Responsible AI Principles
- ❌ **Never:** diagnose, diagnosis, you have [condition], treatment, prescribe
- ✅ **Always:** "this pattern is worth discussing with your doctor"
- ✅ Every AI response ends with consultation reminder
- ✅ Medical safety guardrails on every Bedrock and MenstLLaMA call
- ✅ Concern flagging only — never replaces professional medical consultation

---

## 🗺️ Roadmap

| Feature | Timeline |
|---|---|
| 🌐 Multilingual support (Hindi, Tamil, Telugu) | Q2 2025 |
| 📧 Doctor email delivery via Amazon SES | Q2 2025 |
| ⌚ Wearable device integration (period tracking sync) | Q3 2025 |
| 📤 FHIR export for hospital system integration | Q3 2025 |
| 🏥 Clinic dashboard for gynaecologists | Q4 2025 |
| 💊 Medication and supplement tracking | Q4 2025 |
| 🤝 B2B corporate wellness partnerships | 2026 |

---

## 📊 Business Model

```
FREE          →  Rs 0/month
              AI companion chat, basic symptom logging,
              1 health report/month

OVIRA PRO     →  Rs 199/month
              Doctor Chat (5 sessions), unlimited reports,
              doctor booking, PDF export, priority AI

OVIRA CLINIC  →  Rs 2,999/month
              Doctor dashboard, patient management,
              bulk appointment handling, API access
```

**Market:**
- TAM: 180M Indian women (18–45) with smartphones
- SAM: 45M urban women actively tracking health
- SOM: 12M willing to pay for personalised health tools

---

## 🏆 Hackathon

**Event:** AI for Bharat Hackathon 2025
**Powered by:** AWS · H2S · YourStory
**Prize pool:** ₹40 Lakhs

**Judging criteria we address:**
| Criterion | Weight | Our Approach |
|---|---|---|
| Implementation | 50% | Live URL, demo account, zero crashes |
| Technical Depth | 20% | MenstLLaMA + RAG + hybrid routing |
| Cost Efficiency | 10% | ~$0 MVP, caching, Nova Micro fallback |
| Impact & Viability | 10% | 180M TAM, freemium model, DPDP compliant |

---

## 👥 Team

Built with 🩷 for Indian women who deserve better healthcare technology.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Ovira AI — For the woman who deserves more than a 15-minute appointment.**

*🩷 Star this repo if you believe women's health deserves better technology*

[![GitHub stars](https://img.shields.io/github/stars/your-org/ovira-ai?style=social)](https://github.com/your-org/ovira-ai)

</div>
