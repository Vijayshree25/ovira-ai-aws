@echo off
echo Testing AWS Bedrock Access...
echo.

echo Step 1: Checking AWS credentials...
aws sts get-caller-identity
if %errorlevel% neq 0 (
    echo ERROR: AWS credentials not configured properly
    pause
    exit /b 1
)
echo AWS credentials OK!
echo.

echo Step 2: Listing available Bedrock models...
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?contains(modelId, 'claude-3-haiku')].{ModelId:modelId,Name:modelName,Status:modelLifecycle.status}" --output table
echo.

echo Step 3: Testing Claude 3 Haiku invocation...
echo Creating test request...
echo {"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Say hello in one sentence"}]} > bedrock-test-request.json

echo Invoking model...
aws bedrock-runtime invoke-model ^
    --model-id anthropic.claude-3-haiku-20240307-v1:0 ^
    --region us-east-1 ^
    --body file://bedrock-test-request.json ^
    bedrock-test-response.json

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Bedrock is working!
    echo.
    echo Response:
    type bedrock-test-response.json
    echo.
    echo.
    echo Cleaning up test files...
    del bedrock-test-request.json
    del bedrock-test-response.json
) else (
    echo.
    echo ERROR: Bedrock invocation failed!
    echo.
    echo Common issues:
    echo 1. Model access not enabled - Go to AWS Bedrock Console and enable Claude 3 Haiku
    echo 2. IAM permissions missing - Add bedrock:InvokeModel permission
    echo 3. Wrong region - Make sure you're using us-east-1
    echo.
    echo Cleaning up test files...
    del bedrock-test-request.json 2>nul
    del bedrock-test-response.json 2>nul
)

echo.
pause
