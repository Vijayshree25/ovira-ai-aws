# Implementation Plan

- [-] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Auth State Not Updated After Login
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: successful login followed by immediate state check
  - Test that after successful login (storing tokens in localStorage), the AuthContext user state is populated before redirect
  - Test that completeOnboarding can be called successfully after authentication tokens are stored
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "user state is null after login despite valid tokens in localStorage")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Authenticated User Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy scenarios:
    - Unauthenticated users are redirected to login page when accessing protected routes
    - Logout clears user state and tokens
    - getCurrentUser() is called on AuthContext mount
    - Invalid/expired tokens are handled gracefully
    - Email verification flow displays appropriate messages
    - Onboarding completion with valid user state updates profile correctly
  - Write property-based tests capturing these observed behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [-] 3. Fix authentication state management bug

  - [x] 3.1 Add user state refresh mechanism after login
    - Modify login page to call AuthContext refresh method after storing tokens
    - Ensure user state is populated before router.push('/dashboard')
    - Add await for state update to complete before redirect
    - _Bug_Condition: User successfully logs in and tokens are stored, but AuthContext user state remains null_
    - _Expected_Behavior: AuthContext user state is populated with authenticated user before redirect_
    - _Preservation: Unauthenticated users still redirected to login, logout still clears state, getCurrentUser still called on mount_
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

  - [x] 3.2 Add user state initialization in onboarding flow
    - Ensure AuthContext checks for stored tokens when onboarding page loads
    - Populate user state from tokens before onboarding form is submitted
    - Add error handling if tokens are invalid during onboarding
    - _Bug_Condition: User navigates to onboarding after signup but AuthContext user state is not populated_
    - _Expected_Behavior: AuthContext user state is populated from stored tokens when onboarding page loads_
    - _Preservation: Invalid/expired tokens handled gracefully, email verification flow unchanged_
    - _Requirements: 1.2, 1.4, 2.2, 2.4_

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Auth State Updated After Login
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Authenticated User Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
