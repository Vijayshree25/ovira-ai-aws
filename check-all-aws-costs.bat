@echo off
echo ========================================
echo AWS Cost Investigation Script
echo ========================================
echo.

echo Checking billing for current month...
aws ce get-cost-and-usage --time-period Start=2026-03-01,End=2026-03-21 --granularity DAILY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE --region us-east-1 --output table
echo.

echo ========================================
echo Checking for expensive resources...
echo ========================================
echo.

echo [1] EC2 Instances (us-east-1):
aws ec2 describe-instances --region us-east-1 --query "Reservations[].Instances[?State.Name=='running'].[InstanceId,InstanceType,LaunchTime,Tags[?Key=='Name'].Value|[0]]" --output table
echo.

echo [2] RDS Databases (us-east-1):
aws rds describe-db-instances --region us-east-1 --query "DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus,InstanceCreateTime]" --output table
echo.

echo [3] OpenSearch Domains (us-east-1):
aws opensearch list-domain-names --region us-east-1 --output table
echo.

echo [4] NAT Gateways (us-east-1) - EXPENSIVE:
aws ec2 describe-nat-gateways --region us-east-1 --query "NatGateways[?State=='available'].[NatGatewayId,CreateTime,VpcId]" --output table
echo.

echo [5] Load Balancers (us-east-1):
aws elbv2 describe-load-balancers --region us-east-1 --query "LoadBalancers[*].[LoadBalancerName,Type,State.Code,CreatedTime]" --output table
echo.

echo [6] Elastic IPs (us-east-1) - Charged if not attached:
aws ec2 describe-addresses --region us-east-1 --query "Addresses[*].[PublicIp,InstanceId,AllocationId]" --output table
echo.

echo [7] EBS Volumes (us-east-1):
aws ec2 describe-volumes --region us-east-1 --query "Volumes[*].[VolumeId,Size,VolumeType,State,CreateTime]" --output table
echo.

echo [8] S3 Buckets (all regions):
aws s3 ls
echo.

echo [9] Lambda Functions (us-east-1):
aws lambda list-functions --region us-east-1 --query "Functions[*].[FunctionName,Runtime,LastModified]" --output table
echo.

echo [10] SageMaker Endpoints (us-east-1) - VERY EXPENSIVE:
aws sagemaker list-endpoints --region us-east-1 --output table
echo.

echo [11] Bedrock Usage (us-east-1):
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[*].[modelId,modelName]" --output table
echo.

echo ========================================
echo Check other regions? (y/n)
echo Common regions: us-west-2, eu-west-1, ap-south-1
echo ========================================
