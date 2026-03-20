@echo off
echo ========================================
echo Delete OpenSearch Domains in All Regions
echo ========================================
echo.

set REGIONS=us-east-1 us-west-2 ap-south-1 eu-west-1 us-east-2 us-west-1 ap-southeast-1 ap-northeast-1

for %%R in (%REGIONS%) do (
    echo.
    echo Checking region: %%R
    echo ----------------------------------------
    
    REM List domains in this region
    aws opensearch list-domain-names --region %%R --output table
    
    REM Get domain names
    for /f "tokens=*" %%D in ('aws opensearch list-domain-names --region %%R --query "DomainNames[*].DomainName" --output text') do (
        if not "%%D"=="" (
            echo Found domain: %%D in region %%R
            echo Deleting domain: %%D
            aws opensearch delete-domain --domain-name %%D --region %%R
            echo Domain %%D deletion initiated in region %%R
        )
    )
)

echo.
echo ========================================
echo Deletion complete for all regions!
echo Note: Deletion may take 10-15 minutes to complete.
echo ========================================
pause
