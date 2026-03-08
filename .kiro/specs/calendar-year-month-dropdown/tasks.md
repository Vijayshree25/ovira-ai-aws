# Implementation Plan: Calendar Year/Month Dropdown Navigation

## Overview

This implementation adds dropdown navigation to the CalendarModal component, allowing users to quickly select year and month by clicking the calendar header. The feature introduces three new components (MonthYearDropdown, YearSelector, MonthSelector) and modifies existing components (CalendarModal, CalendarHeader) to support the dropdown interaction pattern.

## Tasks

- [x] 1. Create type definitions and interfaces
  - Add new TypeScript interfaces to `src/components/calendar/types.ts`
  - Define MonthYearDropdownProps, YearSelectorProps, MonthSelectorProps
  - Update CalendarHeaderProps with new dropdown-related props
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Implement YearSelector component
  - [x] 2.1 Create YearSelector component with year range calculation
    - Create `src/components/calendar/YearSelector.tsx`
    - Implement dynamic year range (current year - 10 to current year + 5)
    - Render scrollable list of year buttons
    - Add styling for selected year highlighting
    - _Requirements: 2.1, 2.2, 5.1_
  
  - [ ]* 2.2 Write property test for year range bounds
    - **Property 1: Year Range Bounds**
    - **Validates: Requirements 2.2**
  
  - [x] 2.3 Implement year selection handler
    - Add onClick handler to call onYearSelect callback
    - Add hover states and accessibility attributes (aria-pressed)
    - _Requirements: 2.3, 5.2_
  
  - [ ]* 2.4 Write property test for year selection updates
    - **Property 2: Year Selection Updates Calendar**
    - **Validates: Requirements 2.3**

- [ ] 3. Implement MonthSelector component
  - [x] 3.1 Create MonthSelector component with month grid
    - Create `src/components/calendar/MonthSelector.tsx`
    - Define MONTH_NAMES constant array
    - Render 3x4 grid of month buttons with abbreviations
    - Add styling for selected month highlighting
    - _Requirements: 3.1, 3.4, 5.1_
  
  - [-] 3.2 Implement month selection handler
    - Add onClick handler to call onMonthSelect callback
    - Add hover states and accessibility attributes (aria-pressed)
    - _Requirements: 3.2, 5.2_
  
  - [ ]* 3.3 Write property test for month selection updates
    - **Property 4: Month Selection Updates Calendar**
    - **Validates: Requirements 3.2**

- [ ] 4. Implement MonthYearDropdown component
  - [x] 4.1 Create MonthYearDropdown container component
    - Create `src/components/calendar/MonthYearDropdown.tsx`
    - Implement conditional rendering based on isOpen prop
    - Create two-column grid layout for year and month selectors
    - Add dropdown styling with positioning, shadow, and border
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [x] 4.2 Add focus management on dropdown open
    - Implement useEffect to focus first focusable element when opened
    - Add ref for dropdown container
    - Add ARIA attributes (role="region", aria-label)
    - _Requirements: 5.3, 5.5_
  
  - [ ]* 4.3 Write unit tests for MonthYearDropdown
    - Test conditional rendering based on isOpen
    - Test focus management on open
    - Test ARIA attributes
    - _Requirements: 1.1, 5.3, 5.4, 5.5_

- [-] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update CalendarHeader component
  - [~] 6.1 Make header clickable and add dropdown toggle
    - Modify `src/components/calendar/CalendarHeader.tsx`
    - Convert month/year display to button element
    - Add onHeaderClick handler and isDropdownOpen prop
    - Add visual indicators (cursor pointer, hover background)
    - Add ARIA attributes (aria-expanded, aria-haspopup)
    - _Requirements: 1.1, 1.3, 1.4, 5.4_
  
  - [~] 6.2 Integrate MonthYearDropdown into CalendarHeader
    - Import and render MonthYearDropdown component
    - Pass year, month, isOpen, and callback props
    - Add relative positioning to header container for dropdown anchoring
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [ ]* 6.3 Write unit tests for CalendarHeader updates
    - Test header click toggles dropdown
    - Test ARIA attributes update correctly
    - Test visual indicators for clickability
    - _Requirements: 1.1, 1.3, 1.4, 5.4_

- [ ] 7. Update CalendarModal component
  - [~] 7.1 Add dropdown state management
    - Modify `src/components/calendar/CalendarModal.tsx`
    - Add isDropdownOpen state with useState
    - Create handleHeaderClick callback to toggle dropdown
    - Create handleYearChange and handleMonthChange callbacks
    - _Requirements: 1.1, 2.3, 3.2_
  
  - [~] 7.2 Implement click-outside detection for dropdown
    - Update handleBackdropClick to close dropdown before closing modal
    - Distinguish between dropdown close and modal close
    - _Requirements: 1.2_
  
  - [~] 7.3 Close dropdown on date selection
    - Update handleDateSelect to set isDropdownOpen to false
    - Ensure dropdown closes when user selects a date
    - _Requirements: 4.4_
  
  - [~] 7.4 Pass new props to CalendarHeader
    - Pass isDropdownOpen, onHeaderClick, onYearChange, onMonthChange
    - Ensure arrow navigation updates trigger dropdown updates
    - _Requirements: 1.1, 4.1, 4.2_
  
  - [ ]* 7.5 Write property test for month preservation during year change
    - **Property 3: Month Preservation During Year Change**
    - **Validates: Requirements 2.4**
  
  - [ ]* 7.6 Write property test for year preservation during month change
    - **Property 5: Year Preservation During Month Change**
    - **Validates: Requirements 3.3**
  
  - [ ]* 7.7 Write property test for arrow navigation synchronization
    - **Property 6: Arrow Navigation Synchronization**
    - **Validates: Requirements 4.2**
  
  - [ ]* 7.8 Write integration tests for CalendarModal
    - Test opening dropdown on header click
    - Test closing dropdown on outside click
    - Test closing dropdown on header re-click
    - Test closing dropdown on date selection
    - Test arrow navigation while dropdown is open
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.4_

- [~] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and component interactions
- The implementation maintains existing arrow navigation functionality
- Focus management ensures accessibility for keyboard users
