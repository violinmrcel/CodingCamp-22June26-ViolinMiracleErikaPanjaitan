# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a zero-dependency, single-page web application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. It runs entirely in the browser with no build step. Chart.js is the sole external library, loaded from a CDN. All persistence is handled by the browser's `window.localStorage` API.

The design follows a **reactive state-driven rendering** model: a single authoritative state object lives in memory; every user action mutates that state and then triggers a full re-render of all affected view regions. This keeps the data flow predictable and eliminates synchronisation bugs between UI regions.

---

## Architecture

### High-Level Design

```
┌────────────────────────────────────────────────────────┐
│                     Browser (DOM)                      │
│                                                        │
│  ┌──────────┐  events  ┌──────────────────────────┐   │
│  │    UI    │─────────▶│   Action Dispatcher      │   │
│  │ (index   │          │   (js/app.js)            │   │
│  │  .html)  │          └────────────┬─────────────┘   │
│  │          │                       │ mutates          │
│  │          │          ┌────────────▼─────────────┐   │
│  │          │          │    App State (in-memory)  │   │
│  │          │          │  transactions[], sort,    │   │
│  │          │          │  threshold, theme         │   │
│  │          │          └──────┬─────────┬──────────┘   │
│  │          │                 │         │              │
│  │          │       persist   │  render │              │
│  │          │          ┌──────▼─┐  ┌───▼───────────┐  │
│  │          │◀─────────│ Local  │  │  View Render  │  │
│  └──────────┘          │Storage │  │  Functions    │  │
│                        └────────┘  └───────────────┘  │
└────────────────────────────────────────────────────────┘
```

**Data flow (one-way):**

1. User interacts with the DOM (submit form, click delete, change sort, etc.)
2. An event listener calls an action function in `js/app.js`
3. The action validates input, mutates `AppState`, writes to Local Storage
4. The action calls `render()` which updates every view region from the current state

### Key Design Decisions

- **No framework / no build tool**: keeps the project self-contained and immediately runnable via any static file server or `file://`.
- **Single render pass**: after every state mutation the entire reactive UI is re-rendered. For a dataset of this scale this is imperceptibly fast and avoids partial-update bugs.
- **Chart.js via CDN**: avoids bundling while still providing a production-quality charting library.
- **CSS custom properties for theming**: switching themes is a single class toggle on `<body>`; no JavaScript style manipulation.

---

## Components and Interfaces

### JavaScript Module Structure (`js/app.js`)

`app.js` is organised into clearly separated concerns using plain functions. There are no ES modules or bundler; everything runs in the same script scope.

```
js/app.js
├── Constants
│   ├── CATEGORIES          — ['Food', 'Transport', 'Fun']
│   ├── CATEGORY_COLORS     — { Food: '#…', Transport: '#…', Fun: '#…' }
│   ├── LS_KEYS             — { TRANSACTIONS, SORT_ORDER, THRESHOLD, THEME }
│   └── SORT_OPTIONS        — { AMOUNT_ASC, AMOUNT_DESC, CATEGORY_ASC }
│
├── AppState (plain object)
│   ├── transactions        — Transaction[]
│   ├── sortOrder           — string
│   ├── threshold           — number | null
│   └── theme               — 'light' | 'dark'
│
├── Storage Layer
│   ├── storage.load()      — reads + parses all keys from localStorage
│   ├── storage.save()      — serialises AppState fields to localStorage
│   └── storage.isAvailable() — detects localStorage access errors
│
├── Business Logic
│   ├── computeBalance(transactions)         — number
│   ├── computeCategoryTotals(transactions)  — { Food, Transport, Fun }
│   ├── sortTransactions(transactions, order)— Transaction[]
│   ├── validateForm(name, amount, category) — { valid, errors }
│   └── isOverBudget(transaction, threshold) — boolean
│
├── Chart Management
│   ├── chartInstance       — Chart | null (singleton)
│   ├── initChart(ctx)      — creates or reuses Chart instance
│   └── updateChart(totals) — updates chart data + calls chart.update()
│
├── Render Functions
│   ├── renderBalance()
│   ├── renderTransactionList()
│   ├── renderChart()
│   ├── renderTheme()
│   └── render()            — calls all render functions above
│
├── Action Handlers
│   ├── handleAddTransaction(event)
│   ├── handleDeleteTransaction(id)
│   ├── handleSortChange(order)
│   ├── handleThresholdChange(value)
│   └── handleThemeToggle()
│
└── Initialisation
    └── init()              — called on DOMContentLoaded
```

### HTML Structure (`index.html`)

```
<body data-theme="light">
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <button id="theme-toggle">🌙 Dark Mode</button>
  </header>

  <main>
    <!-- Balance Card -->
    <section id="balance-card">
      <h2>Total Balance</h2>
      <p id="balance-amount">$0.00</p>
    </section>

    <!-- Transaction Form -->
    <section id="form-section">
      <form id="transaction-form">
        <label for="name">Name</label>
        <input type="text" id="name" placeholder="e.g. Lunch" />
        <span class="error" id="name-error"></span>

        <label for="amount">Amount</label>
        <input type="number" id="amount" step="0.01" placeholder="e.g. 12.50" />
        <span class="error" id="amount-error"></span>

        <label for="category">Category</label>
        <select id="category">
          <option value="">Select…</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <span class="error" id="category-error"></span>

        <button type="submit">Add Transaction</button>
      </form>
    </section>

    <!-- Controls: Sort + Threshold -->
    <section id="controls-section">
      <div id="sort-controls">
        <label for="sort-select">Sort by</label>
        <select id="sort-select">
          <option value="AMOUNT_ASC">Amount ↑</option>
          <option value="AMOUNT_DESC">Amount ↓</option>
          <option value="CATEGORY_ASC">Category A–Z</option>
        </select>
      </div>
      <div id="threshold-controls">
        <label for="threshold-input">Budget Threshold</label>
        <input type="number" id="threshold-input" step="0.01"
               placeholder="e.g. 50.00" min="0" />
      </div>
    </section>

    <!-- Transaction List -->
    <section id="list-section">
      <h2>Transactions</h2>
      <ul id="transaction-list">
        <!-- items rendered by JS -->
      </ul>
    </section>

    <!-- Chart -->
    <section id="chart-section">
      <h2>Spending by Category</h2>
      <div id="chart-placeholder" hidden>No data to display</div>
      <canvas id="pie-chart"></canvas>
    </section>
  </main>

  <div id="global-error" role="alert" aria-live="assertive" hidden></div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <script src="js/app.js"></script>
</body>
```

### CSS Structure (`css/style.css`)

```
css/style.css
├── CSS Custom Properties (variables)
│   ├── :root  — light theme tokens
│   └── [data-theme="dark"]  — dark theme overrides
├── Reset / Box-sizing
├── Base typography
├── Layout — mobile-first grid / flexbox
├── Component styles
│   ├── header
│   ├── .balance-card
│   ├── #transaction-form  (inputs, labels, button, .error)
│   ├── #controls-section
│   ├── #transaction-list  (li, .over-budget, .delete-btn)
│   └── #chart-section
└── Responsive breakpoints
    ├── @media (min-width: 600px)  — tablet layout
    └── @media (min-width: 1024px) — desktop layout
```

---

## Data Models

### Transaction Object

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id        — UUID generated with crypto.randomUUID()
 * @property {string}  name      — Non-empty display label
 * @property {number}  amount    — Non-zero numeric value (positive = income, negative = expense)
 * @property {string}  category  — 'Food' | 'Transport' | 'Fun'
 * @property {number}  createdAt — Unix timestamp (Date.now())
 */
```

### AppState Object

```js
const AppState = {
  /** @type {Transaction[]} */
  transactions: [],

  /** @type {'AMOUNT_ASC'|'AMOUNT_DESC'|'CATEGORY_ASC'} */
  sortOrder: 'AMOUNT_ASC',

  /** @type {number|null} null means "not set" → no highlights */
  threshold: null,

  /** @type {'light'|'dark'} */
  theme: 'light',
};
```

### Local Storage Schema

All keys live under a shared namespace prefix `ebv_` to avoid collisions.

| Key                     | Value type        | Example value                                  |
|-------------------------|-------------------|------------------------------------------------|
| `ebv_transactions`      | JSON string       | `'[{"id":"…","name":"Lunch","amount":12.5,…}]'` |
| `ebv_sort_order`        | Plain string      | `'CATEGORY_ASC'`                               |
| `ebv_threshold`         | Numeric string    | `'50'`                                         |
| `ebv_theme`             | Plain string      | `'dark'`                                       |

Reads use `JSON.parse` wrapped in `try/catch`; a parse failure resets to the field's default value. Writes use `JSON.stringify` for the transaction array and plain `.toString()` for scalar values.

---

## UI Component Design and Layout

### Mobile-First Layout (< 600 px)

```
┌──────────────────────────────┐
│  Header (title + theme btn)  │
├──────────────────────────────┤
│  Balance Card                │
├──────────────────────────────┤
│  Add Transaction Form        │
├──────────────────────────────┤
│  Sort Controls               │
│  Threshold Input             │
├──────────────────────────────┤
│  Transaction List            │
├──────────────────────────────┤
│  Pie Chart (full width)      │
└──────────────────────────────┘
```

### Desktop Layout (≥ 1024 px)

```
┌─────────────────────────────────────────────────────┐
│  Header                                             │
├──────────────────────┬──────────────────────────────┤
│                      │  Balance Card                 │
│  Add Transaction     ├──────────────────────────────┤
│  Form                │  Sort + Threshold Controls    │
│                      ├──────────────────────────────┤
│                      │  Pie Chart                    │
├──────────────────────┴──────────────────────────────┤
│  Transaction List (full width)                      │
└─────────────────────────────────────────────────────┘
```

### Theming Approach

Theme switching is implemented purely in CSS using `data-theme` on `<body>`:

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f5f5f5;
  --color-text: #1a1a1a;
  --color-accent: #2563eb;
  --color-over-budget: #dc2626;
  --color-border: #e2e8f0;
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-accent: #60a5fa;
  --color-over-budget: #f87171;
  --color-border: #334155;
}
```

JavaScript toggles the attribute: `document.body.dataset.theme = newTheme`.

To prevent a flash of unstyled/wrong theme, the theme preference is read from Local Storage in a tiny `<script>` block in `<head>` — before the stylesheet is parsed — which sets `document.documentElement.dataset.theme` immediately.

### Budget Threshold Highlighting

Transactions whose `amount` exceeds the threshold receive the class `over-budget` on their `<li>` element. CSS then applies the highlight:

```css
#transaction-list li.over-budget {
  border-left: 4px solid var(--color-over-budget);
  background-color: color-mix(in srgb, var(--color-over-budget) 10%, transparent);
}
```

---

## Event Handling and State Management

### Event Wiring (set up in `init()`)

| DOM event                        | Target element          | Action handler             |
|----------------------------------|-------------------------|----------------------------|
| `submit`                         | `#transaction-form`     | `handleAddTransaction(e)`  |
| `click` (delegated)              | `#transaction-list`     | `handleDeleteTransaction(id)` |
| `change`                         | `#sort-select`          | `handleSortChange(value)`  |
| `input`                          | `#threshold-input`      | `handleThresholdChange(v)` |
| `click`                          | `#theme-toggle`         | `handleThemeToggle()`      |

The delete button click is delegated to the `#transaction-list` container; the `data-id` attribute on each `<button class="delete-btn">` carries the transaction ID.

### State Mutation Pattern

Every action follows the same pattern:

```
1. Validate input (if applicable)
   → if invalid: display errors, return early
2. Mutate AppState (add/remove/update fields)
3. Persist to Local Storage
   → if persistence fails: rollback AppState mutation, show error, return
4. Call render()
```

This guarantees that AppState and Local Storage never diverge.

### Render Function

```js
function render() {
  renderBalance();          // updates #balance-amount text
  renderTransactionList();  // rebuilds #transaction-list innerHTML
  renderChart();            // updates Chart.js dataset
  renderTheme();            // syncs data-theme attribute + button label
}
```

`renderTransactionList()` calls `sortTransactions(AppState.transactions, AppState.sortOrder)` and for each transaction calls `isOverBudget(tx, AppState.threshold)` to decide whether to add the `over-budget` class.

---

## Chart.js Integration

### Library Loading

Chart.js is loaded synchronously via CDN before `app.js` in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script src="js/app.js"></script>
```

The pinned version (`chart.js@4`) ensures reproducibility.

### Chart Initialization

```js
let chartInstance = null;

function initChart() {
  const ctx = document.getElementById('pie-chart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: CATEGORIES,                          // ['Food', 'Transport', 'Fun']
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: CATEGORIES.map(c => CATEGORY_COLORS[c]),
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}
```

### Chart Update

```js
function updateChart(totals) {
  // totals: { Food: number, Transport: number, Fun: number }
  chartInstance.data.datasets[0].data = CATEGORIES.map(c => totals[c]);
  chartInstance.update();
}
```

### Empty State Handling

```js
function renderChart() {
  const totals = computeCategoryTotals(AppState.transactions);
  const hasData = CATEGORIES.some(c => totals[c] > 0);
  const placeholder = document.getElementById('chart-placeholder');
  const canvas = document.getElementById('pie-chart');

  if (!hasData) {
    placeholder.hidden = false;
    canvas.hidden = true;
    return;
  }
  placeholder.hidden = true;
  canvas.hidden = false;

  if (!chartInstance) initChart();
  updateChart(totals);
}
```

### Category Color Assignment

Colors are defined as a static constant map, guaranteeing consistency across all renders:

```js
const CATEGORY_COLORS = {
  Food:      '#f59e0b',   // amber
  Transport: '#3b82f6',   // blue
  Fun:       '#10b981',   // emerald
};
```

---

## Rendering Pipeline / Update Flow

```
User Action
    │
    ▼
Event Handler
    │
    ├── Input Validation
    │       └── (fail) → show error messages, STOP
    │
    ├── Mutate AppState
    │
    ├── Persist to Local Storage
    │       └── (fail) → rollback AppState, show global error, STOP
    │
    └── render()
            ├── renderBalance()
            │       └── computeBalance(AppState.transactions)
            │           → update #balance-amount
            │
            ├── renderTransactionList()
            │       ├── sortTransactions(transactions, sortOrder)
            │       ├── for each tx: isOverBudget(tx, threshold)
            │       └── rebuild #transaction-list DOM
            │
            ├── renderChart()
            │       ├── computeCategoryTotals(transactions)
            │       ├── (no data) → show placeholder
            │       └── updateChart(totals)
            │
            └── renderTheme()
                    └── sync data-theme + button label
```

### Initialization Flow

```
DOMContentLoaded
    │
    ├── storage.isAvailable()
    │       └── (false) → show global error, render with defaults
    │
    ├── storage.load() → populate AppState
    │
    ├── initChart()    → create Chart.js instance
    │
    ├── bindEvents()   → wire all event listeners
    │
    └── render()       → first paint
```

---

## Error Handling

| Error scenario | Detection | Recovery |
|---|---|---|
| localStorage unavailable on init | `try/catch` around `localStorage.setItem` test | Display global inline error; app still usable in-memory for the session |
| localStorage write fails on add | `try/catch` in `storage.save()` | Roll back AppState transaction addition; show inline error near form |
| localStorage write fails on delete | `try/catch` in `storage.save()` | Roll back AppState deletion; show inline error |
| Corrupted JSON in localStorage | `try/catch` in `JSON.parse` | Treat as empty/default; silently discard bad value |
| Chart.js CDN load failure | `window.onerror` / `<script onerror>` | Hide chart section; show message "Chart unavailable" |
| Form validation failure | Pre-submit validation in `validateForm()` | Display per-field error messages; do not mutate state |

All user-visible error messages are injected into elements with `role="alert"` so screen readers announce them.

---

## Testing Strategy

### Property-Based Testing

Since this is a pure-JavaScript application with clearly testable business logic, property-based testing (PBT) is applicable to the core computation functions: balance calculation, input validation, sorting, category totals, and Local Storage serialization.

**PBT library**: [fast-check](https://github.com/dubzzz/fast-check) (loaded via CDN in the test harness or installed as a dev dependency). Minimum **100 iterations** per property test.

Each property test is tagged with a comment:
```
// Feature: expense-budget-visualizer, Property N: <property text>
```

### Unit Tests

Unit tests cover:
- Specific form validation examples (zero amount, currency symbols, multiple decimals)
- Empty-state rendering (placeholder messages)
- Error handling paths (localStorage failure, chart CDN failure)
- Theme toggle transitions
- Delete button removes correct transaction

### Integration Tests

- App initialization with pre-seeded Local Storage data
- Full add → render → delete → render cycle

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction serialization round-trip

*For any* list of valid transactions added to the app, serializing to Local Storage and then deserializing should produce a list with the same transactions (same id, name, amount, category) in the same order.

**Validates: Requirements 1.1, 1.3, 1.4**

---

### Property 2: Balance equals sum of all transaction amounts

*For any* list of transactions (including the empty list), the value displayed in the Balance card must equal the arithmetic sum of all transaction amounts in the list.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 3: Valid form submission adds exactly one transaction

*For any* valid (non-empty name, non-zero numeric amount, valid category) form submission, the transaction list grows by exactly one entry and that entry contains the submitted name, amount, and category.

**Validates: Requirements 3.2, 4.1, 4.2**

---

### Property 4: Invalid amount is always rejected

*For any* amount value that is zero, negative, non-numeric, contains multiple decimal points, or contains currency symbols, submitting the form must not add any transaction to the list, and the list length must remain unchanged.

**Validates: Requirements 3.4**

---

### Property 5: Whitespace-only or empty name is always rejected

*For any* form submission where the name field is empty or contains only whitespace characters, no transaction should be added and the list remains unchanged.

**Validates: Requirements 3.3**

---

### Property 6: Successful add resets all form fields

*For any* valid transaction that is successfully added, the Name input value, Amount input value, and Category select value must each return to their initial/default state after the add.

**Validates: Requirements 3.5**

---

### Property 7: Transaction list rendering includes all fields

*For any* transaction stored in the app state, the rendered list item for that transaction must contain its name, amount, and category as visible text content.

**Validates: Requirements 4.1**

---

### Property 8: Delete removes transaction from list and storage

*For any* transaction in the list, clicking its delete button must result in: (a) that transaction's ID no longer appearing in the rendered list, and (b) that transaction's ID no longer present in the `ebv_transactions` Local Storage entry.

**Validates: Requirements 4.6, 1.3**

---

### Property 9: Chart data matches per-category totals

*For any* set of transactions, the data values passed to Chart.js for each category slice must equal the sum of amounts of all transactions belonging to that category.

**Validates: Requirements 5.1, 5.2**

---

### Property 10: Category colors are consistent across renders

*For any* two separate render calls with any transaction data, the background color assigned to the Food slice, the Transport slice, and the Fun slice must be identical in both renders.

**Validates: Requirements 5.4**

---

### Property 11: Sort order is applied without mutating storage

*For any* transaction list and any selected sort order, the rendered list order matches the sort criterion (amount ascending/descending or category alphabetically ascending), AND the `ebv_transactions` entry in Local Storage remains in the original insertion order.

**Validates: Requirements 6.2, 6.3**

---

### Property 12: Sort order persists across initialization

*For any* sort order value ('AMOUNT_ASC', 'AMOUNT_DESC', 'CATEGORY_ASC'), writing it to `ebv_sort_order` in Local Storage and then calling `init()` must result in the same sort order being applied to the rendered transaction list.

**Validates: Requirements 6.4**

---

### Property 13: Budget threshold highlighting correctness

*For any* positive threshold value and *for any* list of transactions, every transaction whose amount strictly exceeds the threshold must have the `over-budget` CSS class applied to its list item, and every transaction whose amount is less than or equal to the threshold must not have that class.

**Validates: Requirements 7.2, 7.3, 7.4**

---

### Property 14: Budget threshold persists across initialization

*For any* budget threshold value written to `ebv_threshold` in Local Storage, calling `init()` must restore the same threshold and apply correct `over-budget` highlighting to all transactions.

**Validates: Requirements 7.5**

---

### Property 15: Theme persists across initialization

*For any* theme value ('light' or 'dark') written to `ebv_theme` in Local Storage, calling `init()` must result in `document.body.dataset.theme` equalling that value before the first render completes.

**Validates: Requirements 8.3**
