@echo off
REM Fix Cognito Client Configuration for Ovira AI

set USER_POOL_ID=us-east-1_itYHpVqJo
set CLIENT_ID=4n87v3vht7famh7gp56hc1510o
set REGION=us-east-1

echo Updating Cognito User Pool Client configuration...
echo.

aws cognito-idp update-user-pool-client ^
  --user-pool-id %USER_POOL_ID% ^
  --client-id %CLIENT_ID% ^
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ^
  --prevent-user-existence-errors ENABLED ^
  --region %REGION%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Success! Cognito client updated with correct authentication flows.
    echo.
    echo Please restart your Next.js dev server:
    echo   npm run dev
) else (
    echo.
    echo Error updating Cognito client. Please check your AWS credentials.
)

echo.
pause
