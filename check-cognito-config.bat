@echo off
REM Check Cognito Configuration

set USER_POOL_ID=us-east-1_itYHpVqJo
set CLIENT_ID=4n87v3vht7famh7gp56hc1510o
set REGION=us-east-1

echo Checking Cognito User Pool Configuration...
echo.

echo User Pool Details:
aws cognito-idp describe-user-pool --user-pool-id %USER_POOL_ID% --region %REGION%

echo.
echo.
echo User Pool Client Details:
aws cognito-idp describe-user-pool-client --user-pool-id %USER_POOL_ID% --client-id %CLIENT_ID% --region %REGION%

pause
