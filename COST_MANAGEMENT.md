# Cost Management Guide for Hackathon

## 💰 Current Cost Estimate (Hackathon Usage)

For a 2-3 day hackathon with minimal users:

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| **Cognito** | $0 | Free tier: 50,000 MAUs |
| **DynamoDB** | $0-2 | On-demand pricing, minimal usage |
| **S3** | $0-1 | First 5GB free |
| **Bedrock** | $5-20 | Pay per token (Claude 3 Haiku) |
| **Total** | **$5-23** | For entire hackathon |

## 🛡️ Cost Protection Measures

### 1. Set Up AWS Budget Alerts

```bash
# Create a budget alert for $25
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

Create `budget.json`:
```json
{
  "BudgetName": "OviraHackathonBudget",
  "BudgetLimit": {
    "Amount": "25",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### 2. Monitor Costs Daily

Check your costs at: https://console.aws.amazon.com/cost-management/home

### 3. Limit Bedrock Usage

The biggest cost driver is Bedrock (AI chat). To minimize:

- Limit chat message length
- Use shorter responses
- Test with fewer messages
- Consider using Titan (cheaper) for testing

## 🗑️ Cleanup After Hackathon

### Option 1: Automated Cleanup (Recommended)

**Windows:**
```bash
cleanup-aws-resources.bat
```

**Mac/Linux:**
```bash
chmod +x cleanup-aws-resources.sh
./cleanup-aws-resources.sh
```

### Option 2: Manual Cleanup

1. **Delete DynamoDB Tables** (AWS Console → DynamoDB → Tables → Delete)
   - ovira-users
   - ovira-symptoms
   - ovira-reports
   - ovira-chat-history

2. **Delete S3 Bucket** (AWS Console → S3 → Select bucket → Empty → Delete)
   - ovira-reports-prototype

3. **Delete Cognito User Pool** (AWS Console → Cognito → User pools → Delete)
   - us-east-1_itYHpVqJo

4. **Delete IAM User** (AWS Console → IAM → Users → Delete)
   - ovira-app-user

5. **Delete IAM Policy** (AWS Console → IAM → Policies → Delete)
   - OviraAppPolicy

6. **Revoke Bedrock Access** (Optional - no cost when not used)
   - AWS Console → Bedrock → Model access → Revoke

## 💡 Cost-Saving Tips During Hackathon

### DynamoDB
- ✅ Already using on-demand pricing (no cost when idle)
- ✅ No need to provision capacity

### S3
- ✅ Minimal storage (only PDF reports)
- ✅ No transfer costs for same-region access

### Bedrock (Biggest Cost)
- ⚠️ **Limit AI chat usage during testing**
- Use shorter prompts and responses
- Test authentication/UI without AI first
- Consider using mock responses for demo

### Cognito
- ✅ Free tier covers hackathon usage
- No action needed

## 📊 Cost Monitoring Commands

Check current month costs:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-02-01,End=2025-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --region us-east-1
```

Check costs by service:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-02-01,End=2025-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --region us-east-1
```

## 🚨 Emergency: Stop All Costs Immediately

If costs are getting too high:

1. **Run cleanup script immediately**
2. **Delete IAM access keys** (stops all API access)
3. **Contact AWS Support** if needed

## ✅ Post-Hackathon Checklist

After your hackathon is complete:

- [ ] Run cleanup script (`cleanup-aws-resources.bat` or `.sh`)
- [ ] Verify all resources deleted in AWS Console
- [ ] Delete IAM user and policy
- [ ] Check AWS Cost Explorer (wait 24 hours for final costs)
- [ ] Revoke Bedrock model access (optional)
- [ ] Delete `.env.local` file (contains credentials)
- [ ] Rotate AWS access keys if you plan to keep the account

## 📞 Support

If you see unexpected charges:
1. Check AWS Cost Explorer
2. Review CloudWatch logs
3. Contact AWS Support (if you have a support plan)
4. Use AWS Free Tier usage alerts

---

**Remember:** AWS charges are prorated. Even if you forget to clean up for a few days, costs will be minimal (~$1-2/day for idle resources).
