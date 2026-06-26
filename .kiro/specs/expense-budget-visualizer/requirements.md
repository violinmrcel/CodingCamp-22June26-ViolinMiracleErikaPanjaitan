# Requirements Document

## Introduction

The **Expense & Budget Visualizer** is a mobile-friendly, single-page web application built with HTML, CSS, and Vanilla JavaScript — no backend server. All data persists exclusively in the browser's Local Storage. The application allows users to record income and expense transactions, view a live-updated total balance, visualize spending by category through a dynamic pie chart, sort transactions, monitor budget thresholds, and switch between dark and light themes.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single financial entry composed of a Name, Amount, and Category recorded by the user.
- **Name**: A non-empty text label identifying a transaction (e.g., "Lunch", "Bus fare").
- **Amount**: A non-zero numeric value representing the transaction's monetary value in the user's default currency.
- **Category**: One of three predefined labels assigned to a transaction: `Food`, `Transport`, or `Fun`.
- **Balance**: The running total calculated as the sum of all transaction amounts currently stored.
- **Transaction List**: The scrollable on-screen list that renders all stored transactions.
- **Pie Chart**: A circular chart rendered via Chart.js that displays the proportion of total spending attributed to each Category.
- **Budget Threshold**: A user-defined numeric value above which individual transaction amounts are considered over-budget.
- **Local Storage**: The browser's Web Storage API (`window.localStorage`) used as the sole persistence layer.
- **Sort Order**: The user-selected criterion (`Amount` ascending/descending or `Category` alphabetically) applied to the Transaction List display.
- **Theme**: The visual color scheme of the App; either `light` (default) or `dark`.
- **Delete Button**: A per-transaction UI control that permanently removes that transaction from storage and all views.

---

## Requirements

### Requirement 1: Persistent Data Storage

**User Story:** As a user, I want my transactions to be saved in the browser, so that my data is not lost when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is successfully added, THE App SHALL serialize the updated transaction list to Local Storage immediately.
2. IF serialization to Local Storage fails after a transaction is added, THEN THE App SHALL roll back the transaction addition and display an error message informing the user that the transaction could not be saved.
3. WHEN a transaction is deleted, THE App SHALL serialize the updated transaction list to Local Storage immediately.
4. WHEN the App initializes, THE App SHALL deserialize and load all previously stored transactions from Local Storage before rendering any view.
5. IF Local Storage is unavailable AND throws an error, THEN THE App SHALL display an inline error message informing the user that data cannot be saved.

---

### Requirement 2: Total Balance Display

**User Story:** As a user, I want to see my total balance prominently, so that I always know my current financial standing at a glance.

#### Acceptance Criteria

1. THE App SHALL display a Balance card at the top of the page showing the sum of all transaction amounts.
2. WHEN a transaction is added, THE App SHALL recalculate and re-render the Balance card within the same render cycle, before the next user interaction.
3. WHEN a transaction is deleted, THE App SHALL recalculate and re-render the Balance card within the same render cycle, before the next user interaction.
4. WHEN no transactions exist, THE App SHALL display a balance of `0` in the Balance card.

---

### Requirement 3: Transaction Input Form

**User Story:** As a user, I want a simple form to add transactions, so that I can quickly record my income and expenses.

#### Acceptance Criteria

1. THE App SHALL render an input form containing: a Name text field, an Amount number field, and a Category dropdown with exactly three options — `Food`, `Transport`, and `Fun`.
2. WHEN the user submits the form with all fields filled and a valid non-zero Amount, THE App SHALL create a new Transaction and add it to the Transaction List.
3. IF the user submits the form with one or more empty fields, THEN THE App SHALL display a validation error message adjacent to each empty field and SHALL NOT create a transaction.
4. IF the user submits the form with an Amount of zero, a negative value, any non-numeric input, a number with multiple decimal points, or a value containing currency symbols or other invalid characters, THEN THE App SHALL display a validation error message for the Amount field and SHALL NOT create a transaction.
5. WHEN a transaction is successfully added, THE App SHALL reset all form fields to their default empty/placeholder state.

---

### Requirement 4: Transaction List

**User Story:** As a user, I want to see a list of all my transactions, so that I can review and manage my financial records.

#### Acceptance Criteria

1. THE App SHALL render a scrollable Transaction List displaying each transaction's Name, Amount, and Category.
2. WHEN a new transaction is added, THE App SHALL append the transaction to the Transaction List without requiring a page reload.
3. IF a new transaction is added but the Transaction List display fails to update, THEN THE App SHALL display an error state informing the user that the list could not be refreshed.
4. WHEN no transactions exist, THE App SHALL display a placeholder message (e.g., "No transactions yet") inside the Transaction List area.
5. IF transactions exist but the Transaction List fails to render, THEN THE App SHALL display an error state or loading indicator in the Transaction List area instead of the placeholder message.
6. WHEN the user clicks the Delete Button on a transaction, THE App SHALL remove that transaction from the Transaction List and from Local Storage.

---

### Requirement 5: Dynamic Pie Chart

**User Story:** As a user, I want a visual chart of my spending by category, so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a Pie Chart using Chart.js (loaded via CDN) that shows the total amount per Category as proportional slices.
2. WHEN a transaction is added or deleted, THE App SHALL update the Pie Chart data and re-render the chart within the same render cycle.
3. WHEN no transactions exist OR all transaction amounts are zero, THE App SHALL display a placeholder message (e.g., "No data to display") in the Pie Chart area instead of rendering a chart.
4. THE App SHALL assign a distinct, consistent color to each Category slice across all renders.

---

### Requirement 6: Sort Transactions

**User Story:** As a user, I want to sort my transaction list, so that I can view transactions in a meaningful order.

#### Acceptance Criteria

1. THE App SHALL provide sort controls allowing the user to sort the Transaction List by `Amount` (ascending or descending) or by `Category` (alphabetically ascending).
2. WHEN the user selects a Sort Order, THE App SHALL re-render the Transaction List in the chosen order without modifying the underlying stored data.
3. WHEN a new transaction is added, THE App SHALL apply the currently active Sort Order when rendering the updated Transaction List.
4. WHEN the page is reloaded, THE App SHALL restore the previously selected Sort Order from Local Storage and apply it on initialization.

---

### Requirement 7: Budget Threshold Highlighting

**User Story:** As a user, I want over-budget transactions to be visually highlighted, so that I can quickly identify spending that exceeds my limit.

#### Acceptance Criteria

1. THE App SHALL provide an input field where the user can set a Budget Threshold value.
2. WHERE the user has explicitly set a Budget Threshold through the input field AND the Budget Threshold is a positive numeric value, THE App SHALL apply a distinct visual highlight (e.g., a colored border or background) to every transaction whose Amount exceeds the Budget Threshold.
3. WHEN the Budget Threshold changes, THE App SHALL immediately re-evaluate and update the highlight state of all transactions in the Transaction List.
4. WHEN the user clears the Budget Threshold field, THE App SHALL immediately remove all threshold highlights from every transaction in the Transaction List, regardless of each transaction's Amount.
5. WHEN the page is reloaded, THE App SHALL restore the previously set Budget Threshold from Local Storage and apply highlights on initialization.

---

### Requirement 8: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light modes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control (e.g., a button or switch) that switches the Theme between `light` and `dark`.
2. WHEN the user activates the toggle, THE App SHALL apply the selected Theme to the entire page without a page reload.
3. WHEN the page is reloaded, IF a Theme preference exists in Local Storage, THEN THE App SHALL restore the previously selected Theme from Local Storage and apply it before the first paint to avoid a flash of the wrong theme.
4. WHEN no Theme preference is stored, THE App SHALL default to the `light` Theme, while still allowing the user to subsequently switch to `dark` Theme via the toggle.

---

### Requirement 9: Responsive & Accessible Layout

**User Story:** As a user, I want the app to look good and work well on both my phone and desktop, so that I can use it anywhere.

#### Acceptance Criteria

1. THE App SHALL use a single CSS file located at `css/style.css` and a single JavaScript file located at `js/app.js`, with `index.html` at the project root.
2. THE App SHALL render a usable and visually correct layout on viewport widths from 320px to 1440px without horizontal scrolling.
3. THE App SHALL apply readable typography and sufficient spacing so that no interactive element has a tap target smaller than 44×44 CSS pixels on mobile viewports.
4. THE App SHALL apply sufficient color contrast between text and background for the `dark` Theme to meet WCAG AA contrast ratio requirements (minimum 4.5:1 for normal text), regardless of whether the `dark` Theme is currently active.
5. THE App SHALL apply sufficient color contrast between text and background for the `light` Theme to meet WCAG AA contrast ratio requirements (minimum 4.5:1 for normal text), regardless of whether the `light` Theme is currently active.
