# Implementation Plan

- [-] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Upload Fails with Missing AWS Resources
  - **CRITICAL**: This test MUST FAIL on unfixed infrastructure - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the infrastructure when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists (missing DynamoDB table, S3 bucket, or env var)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - valid file uploads (≤10MB) with valid userId
  - Test that POST /api/documents with valid file (≤10MB) and userId successfully uploads to S3 and saves metadata to DynamoDB
  - The test assertions should match: result.success = true, document.s3Key exists in S3, document metadata exists in DynamoDB
  - Run test on UNFIXED infrastructure (before adding env var, before verifying AWS resources)
  - **EXPECTED OUTCOME**: Test FAILS with "Requested resource not found", "ResourceNotFoundException", or "NoSuchBucket" error
  - Document counterexamples found: specific AWS error messages, which resources are missing
  - Check AWS Console or CLI to verify which resources (table/bucket) don't exist
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Upload Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED infrastructure for non-upload operations (GET, DELETE, PATCH)
  - Write property-based tests capturing observed behavior patterns:
    - GET requests for document lists return same results
    - GET requests with docId generate presigned URLs correctly
    - DELETE requests remove documents from S3 and DynamoDB
    - File size validation rejects files > 10MB with "File too large"
    - Missing parameter validation rejects uploads without file/userId
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED infrastructure
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed infrastructure
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for health documents upload issue

  - [ ] 3.1 Configure environment variable
    - Add `NEXT_PUBLIC_DYNAMODB_DOCUMENTS_TABLE=ovira-documents` to `.env.local`
    - Verify the variable is properly loaded by the application
    - _Bug_Condition: isBugCondition(input) where valid file upload fails due to missing AWS resources_
    - _Expected_Behavior: Successful upload to S3 and DynamoDB save for valid files_
    - _Preservation: Non-upload operations (GET, DELETE, PATCH) remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Verify and create DynamoDB table
    - Run `scripts/create-tables.mjs` to ensure `ovira-documents` table exists
    - Verify table has correct schema: userId (HASH key), docId (RANGE key)
    - Check AWS Console or use AWS CLI to confirm table creation
    - _Bug_Condition: isBugCondition(input) where DynamoDB table doesn't exist_
    - _Expected_Behavior: Table exists and is accessible for PutItem and Query operations_
    - _Preservation: Existing document queries and deletions continue to work_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.3 Verify and create S3 bucket
    - Check if `ovira-reports-prototype` bucket exists in AWS S3
    - Create bucket if missing, or verify access permissions if it exists
    - Ensure bucket has appropriate permissions for PutObject and GetObject operations
    - _Bug_Condition: isBugCondition(input) where S3 bucket doesn't exist or is inaccessible_
    - _Expected_Behavior: Bucket exists and is accessible for file uploads and presigned URL generation_
    - _Preservation: Existing document viewing and deletion continue to work_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.4 Verify IAM permissions
    - Confirm AWS credentials have `dynamodb:PutItem` and `dynamodb:Query` permissions on documents table
    - Confirm AWS credentials have `s3:PutObject` and `s3:GetObject` permissions on reports bucket
    - Test permissions using AWS CLI or Console if needed
    - _Bug_Condition: isBugCondition(input) where credentials lack necessary permissions_
    - _Expected_Behavior: Credentials have all required permissions for upload and retrieval operations_
    - _Preservation: All existing operations continue to work with proper permissions_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Upload Succeeds with Configured AWS Resources
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - file uploads to S3, metadata saves to DynamoDB)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Upload Operations Still Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in GET, DELETE, PATCH operations)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Verify bug condition exploration test passes (uploads work correctly)
  - Verify preservation tests pass (existing functionality unchanged)
  - Test full upload flow in UI: select file → POST to API → verify in AWS → see in document list
  - Ensure all tests pass, ask the user if questions arise
