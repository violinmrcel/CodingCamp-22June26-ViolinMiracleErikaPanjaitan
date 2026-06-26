# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a zero-dependency, single-page web app using `index.html`, `css/style.css`, and `js/app.js`. The app follows a reactive state-driven rendering model: a single `AppState` object is mutated by action handlers and then triggers a full re-render of all affected view regions. All persistence is handled by `window.localStorage`.

---

## Tasks

- [x] 1. Set up project structure and static HTML scaffold
  - Create `index.html` at the project root with the full HTML structure (header, balance card, transaction form, controls, transaction list, chart section, global error container)
  - Add a `<script>` block inside `<head>` that reads `ebv_theme` from `localStorage` and applies `data-theme` to `<html>` before first paint
  - Include the Chart.js CDN `<script>` tag (pinned `chart.js@4`) and `<script src="js/app.js">` at the bottom of `<body>`
  - Create empty `css/style.css` and `js/app.js` placeholder files
  - _Requirements: 9.1, 8.3_

- [x] 2. Implement CSS — variables, reset, layout, and theming
  - [x] 2.1 Write CSS custom properties and base styles
    - Define `:root` light-theme tokens (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-over-budget`, `--color-border`) and `[data-theme="dark"]` overrides as specified in the design
    - Add CSS reset and base typography so no interactive element is smaller than 44×44 CSS pixels
    - _Requirements: 8.1, 8.2, 9.3, 9.4, 9.5_

  - [x] 2.2 Implement responsive layout
    - Write mobile-first single-column layout (`< 600px`) using flexbox/grid
    - Add `@media (min-width: 600px)` tablet adjustments
    - Add `@media (min-width: 1024px)` desktop two-column layout as described in the design
    - Ensure no horizontal scrolling from 320px to 1440px
    - _Requirements: 9.2_

  - [x] 2.3 Style all components
    - Style header, balance card, transaction form (inputs, labels, button, `.error` spans), controls section, transaction list (`li`, `.over-budget`, `.delete-btn`), and chart section
    - Apply `border-left` + `background-color` highlight to `li.over-budget` using `var(--color-over-budget)`
    - _Requirements: 7.2, 9.3_

- [x] 3. Implement JavaScript — constants, AppState, and storage layer
  - [x] 3.1 Define constants and AppState
    - Write `CATEGORIES`, `CATEGORY_COLORS`, `LS_KEYS`, and `SORT_OPTIONS` constants
    - Define the `AppState` plain object with fields `transactions`, `sortOrder`, `threshold`, `theme`
    - _Requirements: 1.1, 6.1, 7.1, 8.1_

  - [x] 3.2 Implement the storage layer
    - Write `storage.isAvailable()` using a `try/catch` write-and-delete probe on `localStorage`
    - Write `storage.load()` to read and `JSON.parse` all four `ebv_*` keys, falling back to defaults on parse failure
    - Write `storage.save()` to serialize `AppState` fields to `localStorage`, throwing on write failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.4, 7.5, 8.3_

  - [ ]* 3.3 Write property test for transaction serialization round-trip
    - **Property 1: Transaction serialization round-trip**
    - **Validates: Requirements 1.1, 1.3, 1.4**

- [x] 4. Implement business logic functions
  - [x] 4.1 Implement `computeBalance` and `computeCategoryTotals`
    - Write `computeBalance(transactions)` returning the arithmetic sum of all `amount` fields
    - Write `computeCategoryTotals(transactions)` returning `{ Food, Transport, Fun }` sums
    - _Requirements: 2.1, 2.4, 5.1_

  - [ ]* 4.2 Write property test for balance computation
    - **Property 2: Balance equals sum of all transaction amounts**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 4.3 Write property test for category totals vs chart data
    - **Property 9: Chart data matches per-category totals**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 4.4 Implement `validateForm`
    - Write `validateForm(name, amount, category)` returning `{ valid, errors }` covering: empty name, whitespace-only name, zero amount, negative amount, non-numeric input, multiple decimal points, currency symbols
    - _Requirements: 3.3, 3.4_

  - [ ]* 4.5 Write property test for invalid amount rejection
    - **Property 4: Invalid amount is always rejected**
    - **Validates: Requirements 3.4**

  - [ ]* 4.6 Write property test for empty/whitespace name rejection
    - **Property 5: Whitespace-only or empty name is always rejected**
    - **Validates: Requirements 3.3**

  - [x] 4.7 Implement `sortTransactions` and `isOverBudget`
    - Write `sortTransactions(transactions, order)` handling `AMOUNT_ASC`, `AMOUNT_DESC`, and `CATEGORY_ASC` without mutating the input array
    - Write `isOverBudget(transaction, threshold)` returning `true` only when `threshold` is a positive number and `transaction.amount` strictly exceeds it
    - _Requirements: 6.1, 6.2, 7.2, 7.4_

  - [ ]* 4.8 Write property test for sort order correctness
    - **Property 11: Sort order is applied without mutating storage**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 4.9 Write property test for budget threshold highlighting correctness
    - **Property 13: Budget threshold highlighting correctness**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 5. Checkpoint — ensure business logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Chart.js integration
  - [x] 6.1 Implement `initChart` and `updateChart`
    - Write `initChart()` creating a Chart.js pie chart on `#pie-chart` canvas with `CATEGORIES` labels, `CATEGORY_COLORS` backgrounds, and `responsive: true`
    - Write `updateChart(totals)` setting `chartInstance.data.datasets[0].data` and calling `chartInstance.update()`
    - Add `window.onerror` / `<script onerror>` handler on the Chart.js CDN script that hides `#chart-section` and shows "Chart unavailable"
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 6.2 Write property test for category color consistency
    - **Property 10: Category colors are consistent across renders**
    - **Validates: Requirements 5.4**

- [x] 7. Implement render functions
  - [x] 7.1 Implement `renderBalance`
    - Write `renderBalance()` calling `computeBalance(AppState.transactions)` and setting `#balance-amount` text content, defaulting to `0` when empty
    - _Requirements: 2.1, 2.4_

  - [x] 7.2 Implement `renderTransactionList`
    - Write `renderTransactionList()` that calls `sortTransactions`, iterates transactions, calls `isOverBudget`, builds `<li>` elements with name/amount/category text and a `.delete-btn` with `data-id`, adds `over-budget` class when applicable, and shows the "No transactions yet" placeholder when the list is empty
    - _Requirements: 4.1, 4.2, 4.4, 7.2, 7.3_

  - [ ]* 7.3 Write property test for transaction list rendering fields
    - **Property 7: Transaction list rendering includes all fields**
    - **Validates: Requirements 4.1**

  - [x] 7.4 Implement `renderChart`
    - Write `renderChart()` calling `computeCategoryTotals`, toggling `#chart-placeholder` / `#pie-chart` visibility based on whether any category has data, and calling `initChart()` on first use then `updateChart(totals)`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.5 Implement `renderTheme`
    - Write `renderTheme()` syncing `document.body.dataset.theme` with `AppState.theme` and updating the `#theme-toggle` button label (`🌙 Dark Mode` / ☀️ `Light Mode`)
    - _Requirements: 8.1, 8.2_

  - [x] 7.6 Implement the top-level `render` function
    - Write `render()` calling `renderBalance()`, `renderTransactionList()`, `renderChart()`, and `renderTheme()` in sequence
    - _Requirements: 2.2, 2.3, 4.2, 5.2_

- [x] 8. Implement action handlers
  - [x] 8.1 Implement `handleAddTransaction`
    - Write `handleAddTransaction(event)` that prevents default, calls `validateForm`, shows per-field error spans on failure, creates a Transaction object (`crypto.randomUUID()`, `Date.now()`), pushes to `AppState.transactions`, calls `storage.save()` with rollback on failure (show global error), resets form fields, calls `render()`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 1.1, 1.2_

  - [ ]* 8.2 Write property test for valid form submission adds exactly one transaction
    - **Property 3: Valid form submission adds exactly one transaction**
    - **Validates: Requirements 3.2, 4.1, 4.2**

  - [ ]* 8.3 Write property test for successful add resets all form fields
    - **Property 6: Successful add resets all form fields**
    - **Validates: Requirements 3.5**

  - [x] 8.4 Implement `handleDeleteTransaction`
    - Write `handleDeleteTransaction(id)` that filters the transaction from `AppState.transactions`, calls `storage.save()` with rollback on failure (show global error), calls `render()`
    - Wire event delegation on `#transaction-list` that reads `data-id` from clicked `.delete-btn` buttons
    - _Requirements: 4.6, 1.3_

  - [ ]* 8.5 Write property test for delete removes transaction from list and storage
    - **Property 8: Delete removes transaction from list and storage**
    - **Validates: Requirements 4.6, 1.3**

  - [x] 8.6 Implement `handleSortChange`
    - Write `handleSortChange(value)` that sets `AppState.sortOrder`, persists `ebv_sort_order` to localStorage, calls `render()`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 8.7 Write property test for sort order persistence across initialization
    - **Property 12: Sort order persists across initialization**
    - **Validates: Requirements 6.4**

  - [x] 8.8 Implement `handleThresholdChange`
    - Write `handleThresholdChange(value)` that parses the input value, sets `AppState.threshold` to the numeric value or `null` if empty/invalid, persists `ebv_threshold`, calls `render()`
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

  - [ ]* 8.9 Write property test for budget threshold persistence across initialization
    - **Property 14: Budget threshold persists across initialization**
    - **Validates: Requirements 7.5**

  - [x] 8.10 Implement `handleThemeToggle`
    - Write `handleThemeToggle()` that toggles `AppState.theme` between `'light'` and `'dark'`, persists `ebv_theme`, calls `render()`
    - _Requirements: 8.1, 8.2_

  - [ ]* 8.11 Write property test for theme persistence across initialization
    - **Property 15: Theme persists across initialization**
    - **Validates: Requirements 8.3**

- [x] 9. Implement `init` and wire everything together
  - [x] 9.1 Implement `init` and bind all event listeners
    - Write `init()` that: calls `storage.isAvailable()` (show global error and proceed with defaults if unavailable), calls `storage.load()` to populate `AppState`, calls `initChart()`, binds all event listeners listed in the design (`submit` on form, delegated `click` on list, `change` on sort select, `input` on threshold input, `click` on theme toggle), calls `render()`
    - Register `init` on `DOMContentLoaded`
    - _Requirements: 1.4, 1.5, 6.4, 7.5, 8.3, 8.4_

- [x] 10. Checkpoint — full integration test pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major phase
- Property tests (Properties 1–15) validate universal correctness guarantees; unit tests validate specific examples and edge cases
- Use [fast-check](https://github.com/dubzzz/fast-check) for property-based tests (minimum 100 iterations per property)
- The tiny theme-detection `<script>` block in `<head>` must run before the CSS is applied to avoid a flash of wrong theme (Requirement 8.3)

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.1"] },
    { "id": 1, "tasks": ["2.1", "3.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.3", "4.1", "4.4", "4.7"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.5", "4.6", "4.8", "4.9", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1", "7.2", "7.4", "7.5"] },
    { "id": 5, "tasks": ["7.3", "7.6"] },
    { "id": 6, "tasks": ["8.1", "8.4", "8.6", "8.8", "8.10"] },
    { "id": 7, "tasks": ["8.2", "8.3", "8.5", "8.7", "8.9", "8.11"] },
    { "id": 8, "tasks": ["9.1"] }
  ]
}
```
