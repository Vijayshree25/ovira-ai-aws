# Design Document: Calendar Year/Month Dropdown Navigation

## Overview

This feature enhances the existing CalendarModal component by adding dropdown navigation for quick year and month selection. Currently, users can only navigate month-by-month using arrow buttons, which is inefficient for jumping to distant dates. The new dropdown interface will appear when users click the calendar header, providing immediate access to year and month selectors.

The implementation will be built on top of the existing React/Next.js calendar component architecture, maintaining consistency with the current design patterns and accessibility standards. The dropdown will be implemented as a new component that integrates seamlessly with the existing CalendarHeader component.

### Key Design Decisions

1. **Click-to-Open Pattern**: The header will become clickable, opening a dropdown panel below it. This is a common pattern in date pickers and provides good discoverability.

2. **Inline Dropdown**: The dropdown will appear inline within the modal rather than as a separate overlay, maintaining spatial context and simplifying the interaction model.

3. **Preserve Navigation Arrows**: The existing arrow buttons will remain functional even when the dropdown is open, providing multiple navigation methods.

4. **Year Range Strategy**: The year selector will provide a reasonable range (10 years past, 5 years future) to balance usability with performance. This range can be adjusted based on user feedback.

## Architecture

### Component Structure

The feature will introduce a new component and modify existing ones:

```
CalendarModal (existing - minor modifications)
├── CalendarHeader (existing - significant modifications)
│   └── MonthYearDropdown (new component)
│       ├── YearSelector (new component)
│       └── MonthSelector (new component)
├── CalendarGrid (existing - no changes)
└── CalendarLegend (existing - no changes)
```

### Component Responsibilities

**CalendarModal**
- Manages the dropdown open/close state
- Provides callbacks for year/month changes
- Handles click-outside detection for closing the dropdown
- Coordinates between dropdown selections and arrow navigation

**CalendarHeader**
- Renders the clickable month/year display
- Toggles dropdown visibility on header click
- Passes year/month state and callbacks to MonthYearDropdown
- Maintains existing arrow button functionality

**MonthYearDropdown**
- Manages the dropdown panel layout
- Coordinates between year and month selectors
- Handles focus management when opening/closing
- Provides accessibility attributes

**YearSelector**
- Renders a scrollable list of years
- Highlights the currently selected year
- Handles year selection and updates
- Generates the year range dynamically

**MonthSelector**
- Renders a grid of month buttons (3x4 layout)
- Highlights the currently selected month
- Handles month selection and updates
- Displays month names in user-readable format

### State Management

The dropdown state will be managed at the CalendarModal level to coordinate with other calendar interactions:

```typescript
interface CalendarModalState {
  currentYear: number;
  currentMonth: number;
  isDropdownOpen: boolean;
  // ... existing state
}
```

The dropdown open/close state needs to be at the modal level because:
- Click-outside detection requires access to the modal's backdrop
- Date selection should close the dropdown
- Arrow navigation should update dropdown selections

### Event Flow

1. **Opening Dropdown**:
   - User clicks header → CalendarModal sets `isDropdownOpen: true`
   - CalendarHeader receives prop and renders MonthYearDropdown
   - Focus moves to an appropriate element in the dropdown

2. **Selecting Year/Month**:
   - User clicks year/month → Callback fires to CalendarModal
   - CalendarModal updates `currentYear`/`currentMonth`
   - Calendar grid re-renders with new month data
   - Dropdown selections update to reflect current state

3. **Closing Dropdown**:
   - User clicks outside → CalendarModal detects and sets `isDropdownOpen: false`
   - User clicks header again → CalendarModal toggles state
   - User selects a date → CalendarModal closes both dropdown and modal
   - User presses Escape → CalendarModal closes dropdown (or entire modal if dropdown already closed)

## Components and Interfaces

### New Type Definitions

```typescript
// Add to src/components/calendar/types.ts

export interface MonthYearDropdownProps {
  year: number;
  month: number;
  isOpen: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onClose: () => void;
}

export interface YearSelectorProps {
  selectedYear: number;
  onYearSelect: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

export interface MonthSelectorProps {
  selectedMonth: number;
  onMonthSelect: (month: number) => void;
}
```

### Updated CalendarHeaderProps

```typescript
export interface CalendarHeaderProps {
  year: number;
  month: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canNavigateNext: boolean;
  isDropdownOpen: boolean;        // new
  onHeaderClick: () => void;      // new
}
```

### MonthYearDropdown Component

```typescript
// src/components/calendar/MonthYearDropdown.tsx

export default function MonthYearDropdown({
  year,
  month,
  isOpen,
  onYearChange,
  onMonthChange,
  onClose,
}: MonthYearDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus management on open
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstFocusable = dropdownRef.current.querySelector<HTMLElement>(
        'button, [tabindex="0"]'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4"
      role="region"
      aria-label="Month and year selection"
    >
      <div className="grid grid-cols-2 gap-4">
        <YearSelector
          selectedYear={year}
          onYearSelect={onYearChange}
        />
        <MonthSelector
          selectedMonth={month}
          onMonthSelect={onMonthChange}
        />
      </div>
    </div>
  );
}
```

### YearSelector Component

```typescript
// src/components/calendar/YearSelector.tsx

export default function YearSelector({
  selectedYear,
  onYearSelect,
  minYear,
  maxYear,
}: YearSelectorProps) {
  const currentYear = new Date().getFullYear();
  const yearMin = minYear ?? currentYear - 10;
  const yearMax = maxYear ?? currentYear + 5;
  
  const years = Array.from(
    { length: yearMax - yearMin + 1 },
    (_, i) => yearMin + i
  );

  return (
    <div className="flex flex-col">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Year</h4>
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearSelect(year)}
            className={`w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
              year === selectedYear
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700'
            }`}
            aria-pressed={year === selectedYear}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### MonthSelector Component

```typescript
// src/components/calendar/MonthSelector.tsx

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

export default function MonthSelector({
  selectedMonth,
  onMonthSelect,
}: MonthSelectorProps) {
  return (
    <div className="flex flex-col">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Month</h4>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((name, index) => (
          <button
            key={index}
            onClick={() => onMonthSelect(index)}
            className={`px-2 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
              index === selectedMonth
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700'
            }`}
            aria-pressed={index === selectedMonth}
          >
            {name.substring(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Updated CalendarHeader Component

The CalendarHeader will be modified to:
- Make the month/year text clickable
- Add visual indicators for clickability (cursor pointer, hover state)
- Render the MonthYearDropdown component
- Use relative positioning to anchor the dropdown

```typescript
// Key changes to CalendarHeader

export default function CalendarHeader({
  year,
  month,
  onPreviousMonth,
  onNextMonth,
  canNavigateNext,
  isDropdownOpen,
  onHeaderClick,
}: CalendarHeaderProps) {
  return (
    <div className="relative mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          {/* ... existing arrow SVG ... */}
        </button>

        <button
          onClick={onHeaderClick}
          className="text-xl font-semibold text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          aria-label="Select month and year"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {formatMonthYear(year, month)}
        </button>

        <button
          onClick={onNextMonth}
          disabled={!canNavigateNext}
          className={/* ... existing classes ... */}
          aria-label="Next month"
        >
          {/* ... existing arrow SVG ... */}
        </button>
      </div>

      <MonthYearDropdown
        year={year}
        month={month}
        isOpen={isDropdownOpen}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
        onClose={onClose}
      />
    </div>
  );
}
```

### Updated CalendarModal Component

The CalendarModal will be modified to:
- Add `isDropdownOpen` state
- Provide `handleHeaderClick` callback
- Handle click-outside detection for the dropdown
- Update the dropdown when arrow navigation is used

```typescript
// Key additions to CalendarModal

const [isDropdownOpen, setIsDropdownOpen] = useState(false);

const handleHeaderClick = useCallback(() => {
  setIsDropdownOpen(prev => !prev);
}, []);

const handleYearChange = useCallback((year: number) => {
  setCurrentYear(year);
}, []);

const handleMonthChange = useCallback((month: number) => {
  setCurrentMonth(month);
}, []);

const handleDateSelect = useCallback((date: Date) => {
  setIsDropdownOpen(false);  // Close dropdown
  onDateSelect(date);
  onClose();
}, [onDateSelect, onClose]);

// Update click-outside to handle dropdown
const handleBackdropClick = useCallback(
  (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      } else {
        onClose();
      }
    }
  },
  [isDropdownOpen, onClose]
);
```

## Data Models

### Year Range Calculation

The year range will be calculated dynamically based on the current date:

```typescript
interface YearRange {
  minYear: number;
  maxYear: number;
}

function calculateYearRange(): YearRange {
  const currentYear = new Date().getFullYear();
  return {
    minYear: currentYear - 10,
    maxYear: currentYear + 5,
  };
}
```

This provides:
- 10 years in the past (sufficient for most symptom tracking history)
- 5 years in the future (allows for planning/scheduling)
- Total of 16 years in the dropdown

### Month Data

Months will be represented as zero-indexed numbers (0-11) internally, matching JavaScript's Date API:

```typescript
const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];
```

### Dropdown State

The dropdown state is a simple boolean flag managed at the CalendarModal level:

```typescript
interface DropdownState {
  isOpen: boolean;
}
```

This state coordinates with:
- Header click events
- Click-outside detection
- Date selection events
- Escape key handling


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Year Range Bounds

For any current date, the calculated year range should include at least 10 years in the past and at least 5 years in the future from the current year.

**Validates: Requirements 2.2**

### Property 2: Year Selection Updates Calendar

For any valid year within the selectable range, when that year is selected, the calendar component's displayed year should be updated to match the selected year.

**Validates: Requirements 2.3**

### Property 3: Month Preservation During Year Change

For any valid year and month combination, when the year is changed to a different valid year, the month value should remain unchanged.

**Validates: Requirements 2.4**

### Property 4: Month Selection Updates Calendar

For any valid month (0-11), when that month is selected, the calendar component's displayed month should be updated to match the selected month.

**Validates: Requirements 3.2**

### Property 5: Year Preservation During Month Change

For any valid year and month combination, when the month is changed to a different valid month, the year value should remain unchanged.

**Validates: Requirements 3.3**

### Property 6: Arrow Navigation Synchronization

For any calendar state with the dropdown open, when navigation arrows are used to change the month/year, the dropdown's selected year and month values should be updated to reflect the new calendar state.

**Validates: Requirements 4.2**

## Error Handling

### Invalid Year Selection

If a year outside the valid range is somehow selected (edge case in testing), the component should:
- Log a warning to the console
- Clamp the year to the nearest valid value (min or max)
- Update the calendar with the clamped value

### Invalid Month Selection

If a month outside 0-11 is selected (edge case in testing), the component should:
- Log a warning to the console
- Clamp the month to 0 or 11
- Update the calendar with the clamped value

### Dropdown Rendering Errors

If the dropdown fails to render due to missing props or state issues:
- The component should fail gracefully without crashing the parent modal
- An error boundary could catch rendering errors and display a fallback
- The arrow navigation should continue to work as a fallback

### Focus Management Failures

If focus cannot be set to an element in the dropdown (e.g., element not found):
- The component should log a warning but continue functioning
- Focus should remain on the header button as a fallback
- Keyboard navigation should still be possible via Tab key

### Click-Outside Detection Edge Cases

The click-outside handler should properly distinguish between:
- Clicks on the dropdown itself (should not close)
- Clicks on the header (should toggle)
- Clicks on the modal backdrop (should close dropdown, not modal)
- Clicks on calendar dates (should close dropdown and modal)

## Testing Strategy

### Unit Testing Approach

Unit tests will focus on specific examples, edge cases, and component interactions:

**CalendarModal Integration Tests:**
- Opening dropdown on header click
- Closing dropdown on outside click
- Closing dropdown on header re-click
- Closing dropdown on date selection
- Arrow navigation while dropdown is open

**MonthYearDropdown Tests:**
- Rendering year and month selectors when open
- Not rendering when closed
- Focus management on open
- Proper ARIA attributes

**YearSelector Tests:**
- Rendering all years in the range
- Highlighting selected year
- Handling year selection clicks
- Scrollable container for long lists

**MonthSelector Tests:**
- Rendering all 12 months
- Highlighting selected month
- Handling month selection clicks
- Displaying month abbreviations

**Accessibility Tests:**
- Header has proper ARIA attributes (aria-expanded, aria-haspopup)
- Dropdown has role="region" and aria-label
- Selected items have aria-pressed="true"
- Focus moves into dropdown on open
- Keyboard navigation works (Tab, Enter, Escape)

### Property-Based Testing Approach

Property-based tests will verify universal properties across all inputs using the fast-check library (already in package.json). Each test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Property Test 1: Year Range Bounds**
- Generate random current dates
- Calculate year range for each
- Verify minYear = currentYear - 10 and maxYear = currentYear + 5
- Tag: **Feature: calendar-year-month-dropdown, Property 1: For any current date, the calculated year range should include at least 10 years in the past and at least 5 years in the future from the current year.**

**Property Test 2: Year Selection Updates Calendar**
- Generate random valid years within the range
- Simulate year selection
- Verify calendar's displayed year matches selected year
- Tag: **Feature: calendar-year-month-dropdown, Property 2: For any valid year within the selectable range, when that year is selected, the calendar component's displayed year should be updated to match the selected year.**

**Property Test 3: Month Preservation During Year Change**
- Generate random valid year/month combinations
- Change the year to a different random valid year
- Verify the month value remains unchanged
- Tag: **Feature: calendar-year-month-dropdown, Property 3: For any valid year and month combination, when the year is changed to a different valid year, the month value should remain unchanged.**

**Property Test 4: Month Selection Updates Calendar**
- Generate random valid months (0-11)
- Simulate month selection
- Verify calendar's displayed month matches selected month
- Tag: **Feature: calendar-year-month-dropdown, Property 4: For any valid month (0-11), when that month is selected, the calendar component's displayed month should be updated to match the selected month.**

**Property Test 5: Year Preservation During Month Change**
- Generate random valid year/month combinations
- Change the month to a different random valid month
- Verify the year value remains unchanged
- Tag: **Feature: calendar-year-month-dropdown, Property 5: For any valid year and month combination, when the month is changed to a different valid month, the year value should remain unchanged.**

**Property Test 6: Arrow Navigation Synchronization**
- Generate random calendar states with dropdown open
- Simulate arrow navigation (previous/next month)
- Verify dropdown's selected values update to match new calendar state
- Tag: **Feature: calendar-year-month-dropdown, Property 6: For any calendar state with the dropdown open, when navigation arrows are used to change the month/year, the dropdown's selected year and month values should be updated to reflect the new calendar state.**

### Testing Configuration

All property-based tests will be configured with:
```typescript
fc.assert(
  fc.property(/* generators */, (/* inputs */) => {
    // test logic
  }),
  { numRuns: 100 }
);
```

### Test File Organization

```
src/
├── components/
│   └── calendar/
│       ├── __tests__/
│       │   ├── CalendarModal.test.tsx (unit + integration)
│       │   ├── CalendarHeader.test.tsx (unit)
│       │   ├── MonthYearDropdown.test.tsx (unit)
│       │   ├── YearSelector.test.tsx (unit)
│       │   ├── MonthSelector.test.tsx (unit)
│       │   └── calendar-dropdown.properties.test.tsx (property-based)
│       ├── CalendarModal.tsx
│       ├── CalendarHeader.tsx
│       ├── MonthYearDropdown.tsx
│       ├── YearSelector.tsx
│       └── MonthSelector.tsx
```

### Complementary Testing Strategy

The dual testing approach ensures comprehensive coverage:

- **Unit tests** catch concrete bugs in specific scenarios (e.g., clicking header opens dropdown, selecting January updates to month 0)
- **Property tests** verify general correctness across all possible inputs (e.g., any year selection updates correctly, month is always preserved during year changes)

Together, these approaches provide confidence that the feature works correctly for both common cases and edge cases across the entire input space.
