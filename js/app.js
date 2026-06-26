// ============================================================
// Constants
// ============================================================

const CATEGORIES = ['Food', 'Transport', 'Fun'];

const CATEGORY_COLORS = {
  Food:      '#f59e0b',
  Transport: '#3b82f6',
  Fun:       '#10b981',
};

const LS_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  SORT_ORDER:   'ebv_sort_order',
  THRESHOLD:    'ebv_threshold',
  THEME:        'ebv_theme',
};

const SORT_OPTIONS = {
  AMOUNT_ASC:   'AMOUNT_ASC',
  AMOUNT_DESC:  'AMOUNT_DESC',
  CATEGORY_ASC: 'CATEGORY_ASC',
};

// ============================================================
// AppState
// ============================================================

const AppState = {
  /** @type {Array<{id: string, name: string, amount: number, category: string, createdAt: number}>} */
  transactions: [],

  /** @type {'AMOUNT_ASC'|'AMOUNT_DESC'|'CATEGORY_ASC'} */
  sortOrder: 'AMOUNT_ASC',

  /** @type {number|null} null means "not set" → no highlights */
  threshold: null,

  /** @type {'light'|'dark'} */
  theme: 'light',
};

// ============================================================
// Storage Layer
// ============================================================

const storage = {
  isAvailable() {
    try {
      const TEST_KEY = '__ebv_test__';
      localStorage.setItem(TEST_KEY, '1');
      localStorage.removeItem(TEST_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },

  load() {
    // Load transactions
    try {
      const raw = localStorage.getItem(LS_KEYS.TRANSACTIONS);
      AppState.transactions = raw ? JSON.parse(raw) : [];
    } catch (e) {
      AppState.transactions = [];
    }
    // Load sort order
    try {
      const raw = localStorage.getItem(LS_KEYS.SORT_ORDER);
      AppState.sortOrder = raw && Object.values(SORT_OPTIONS).includes(raw) ? raw : SORT_OPTIONS.AMOUNT_ASC;
    } catch (e) {
      AppState.sortOrder = SORT_OPTIONS.AMOUNT_ASC;
    }
    // Load threshold
    try {
      const raw = localStorage.getItem(LS_KEYS.THRESHOLD);
      AppState.threshold = raw !== null ? parseFloat(raw) : null;
      if (isNaN(AppState.threshold)) AppState.threshold = null;
    } catch (e) {
      AppState.threshold = null;
    }
    // Load theme
    try {
      const raw = localStorage.getItem(LS_KEYS.THEME);
      AppState.theme = (raw === 'light' || raw === 'dark') ? raw : 'light';
    } catch (e) {
      AppState.theme = 'light';
    }
  },

  save() {
    // throws on failure — caller should catch and rollback
    localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(AppState.transactions));
    localStorage.setItem(LS_KEYS.SORT_ORDER, AppState.sortOrder);
    localStorage.setItem(LS_KEYS.THRESHOLD, AppState.threshold !== null ? String(AppState.threshold) : '');
    localStorage.setItem(LS_KEYS.THEME, AppState.theme);
  },
};

// ============================================================
// Business Logic
// ============================================================

/**
 * Returns the arithmetic sum of all transaction amounts.
 * Returns 0 for an empty array.
 * @param {Array} transactions
 * @returns {number}
 */
function computeBalance(transactions) {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Returns per-category totals for the pie chart.
 * @param {Array} transactions
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function computeCategoryTotals(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of transactions) {
    if (totals[tx.category] !== undefined) {
      totals[tx.category] += tx.amount;
    }
  }
  return totals;
}

// Input Validation

/**
 * Validates transaction form input.
 * @param {string} name
 * @param {string} amount - raw string value from the input
 * @param {string} category
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateForm(name, amount, category) {
  const errors = {};

  // Name validation
  if (!name || name.trim() === '') {
    errors.name = 'Name is required.';
  }

  // Amount validation
  const amountStr = String(amount).trim();
  if (amountStr === '' || amountStr === null) {
    errors.amount = 'Amount is required.';
  } else if (/[^0-9.\-]/.test(amountStr)) {
    // contains currency symbols or invalid characters (allow digits, dot, leading minus)
    errors.amount = 'Amount must be a valid number (no currency symbols or special characters).';
  } else if ((amountStr.match(/\./g) || []).length > 1) {
    errors.amount = 'Amount must not contain multiple decimal points.';
  } else {
    const num = parseFloat(amountStr);
    if (isNaN(num)) {
      errors.amount = 'Amount must be a valid number.';
    } else if (num === 0) {
      errors.amount = 'Amount must not be zero.';
    } else if (num < 0) {
      errors.amount = 'Amount must be a positive number.';
    }
  }

  // Category validation
  if (!category || !CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid category.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Returns a sorted copy of the transactions array. Does NOT mutate the input.
 * @param {Array} transactions
 * @param {'AMOUNT_ASC'|'AMOUNT_DESC'|'CATEGORY_ASC'} order
 * @returns {Array}
 */
function sortTransactions(transactions, order) {
  const copy = [...transactions];
  switch (order) {
    case SORT_OPTIONS.AMOUNT_ASC:
      return copy.sort((a, b) => a.amount - b.amount);
    case SORT_OPTIONS.AMOUNT_DESC:
      return copy.sort((a, b) => b.amount - a.amount);
    case SORT_OPTIONS.CATEGORY_ASC:
      return copy.sort((a, b) => a.category.localeCompare(b.category));
    default:
      return copy;
  }
}

/**
 * Returns true when a positive threshold is set AND the transaction amount
 * strictly exceeds it.
 * @param {{ amount: number }} transaction
 * @param {number|null} threshold
 * @returns {boolean}
 */
function isOverBudget(transaction, threshold) {
  return (
    threshold !== null &&
    typeof threshold === 'number' &&
    threshold > 0 &&
    transaction.amount > threshold
  );
}

// ============================================================
// Render Functions
// ============================================================

/**
 * Renders the current balance to #balance-amount.
 * Displays $0.00 when no transactions exist.
 */
function renderBalance() {
  const el = document.getElementById('balance-amount');
  const balance = computeBalance(AppState.transactions);
  el.textContent = '$' + balance.toFixed(2);
}

/**
 * Syncs the data-theme attribute on body with AppState.theme
 * and updates the toggle button label.
 */
function renderTheme() {
  document.body.dataset.theme = AppState.theme;
  const btn = document.getElementById('theme-toggle');
  btn.textContent = AppState.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// ============================================================
// Chart Management
// ============================================================

/** @type {Chart|null} Singleton chart instance */
let chartInstance = null;

/**
 * Creates the Chart.js pie chart on #pie-chart canvas.
 * Should only be called when there is data to display.
 */
function initChart() {
  const canvas = document.getElementById('pie-chart');
  const ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: CATEGORIES,
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: CATEGORIES.map(c => CATEGORY_COLORS[c]),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

/**
 * Updates the pie chart data without recreating the chart.
 * @param {{ Food: number, Transport: number, Fun: number }} totals
 */
function updateChart(totals) {
  chartInstance.data.datasets[0].data = CATEGORIES.map(c => totals[c]);
  chartInstance.update();
}

/**
 * Rebuilds #transaction-list innerHTML from current AppState.
 * Shows placeholder when list is empty.
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  const sorted = sortTransactions(AppState.transactions, AppState.sortOrder);

  if (sorted.length === 0) {
    list.innerHTML = '<li id="list-placeholder">No transactions yet</li>';
    return;
  }

  list.innerHTML = '';
  for (const tx of sorted) {
    const li = document.createElement('li');
    if (isOverBudget(tx, AppState.threshold)) {
      li.classList.add('over-budget');
    }

    const info = document.createElement('div');
    info.className = 'tx-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'tx-name';
    nameEl.textContent = tx.name;

    const metaEl = document.createElement('span');
    metaEl.className = 'tx-meta';
    metaEl.textContent = '$' + tx.amount.toFixed(2) + ' · ' + tx.category;

    info.appendChild(nameEl);
    info.appendChild(metaEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.dataset.id = tx.id;
    deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
    deleteBtn.textContent = 'Delete';

    li.appendChild(info);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
}

/**
 * Renders the chart section: shows placeholder when no data,
 * otherwise initializes (first call) or updates (subsequent calls) the chart.
 * Requirements: 5.1, 5.2, 5.3
 */
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

  if (!chartInstance) {
    initChart();
  }
  updateChart(totals);
}

/**
 * Top-level render: re-renders all view regions from current AppState.
 * Called after every state mutation.
 * Requirements: 2.2, 2.3, 4.2, 5.2
 */
function render() {
  renderBalance();
  renderTransactionList();
  renderChart();
  renderTheme();
}

// ============================================================
// Action Handlers
// ============================================================

/**
 * Shows a message in the global error banner.
 * @param {string|null} message - null to hide the banner
 */
function showGlobalError(message) {
  const el = document.getElementById('global-error');
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

/**
 * Handles form submission to add a new transaction.
 * @param {Event} event
 */
function handleAddTransaction(event) {
  event.preventDefault();

  const nameInput = document.getElementById('name');
  const amountInput = document.getElementById('amount');
  const categoryInput = document.getElementById('category');

  const name = nameInput.value;
  const amount = amountInput.value;
  const category = categoryInput.value;

  // Validate
  const { valid, errors } = validateForm(name, amount, category);

  // Show/clear per-field errors
  document.getElementById('name-error').textContent = errors.name || '';
  document.getElementById('amount-error').textContent = errors.amount || '';
  document.getElementById('category-error').textContent = errors.category || '';

  if (!valid) return;

  // Create transaction
  const tx = {
    id: crypto.randomUUID(),
    name: name.trim(),
    amount: parseFloat(amount),
    category,
    createdAt: Date.now(),
  };

  // Mutate state
  AppState.transactions.push(tx);

  // Persist — rollback on failure
  try {
    storage.save();
  } catch (e) {
    AppState.transactions.pop();
    showGlobalError('Could not save transaction. Please try again.');
    return;
  }

  // Clear global error if it was showing
  showGlobalError(null);

  // Reset form
  nameInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';

  render();
}

// ============================================================
// Action Handlers
// ============================================================

/**
 * Removes a transaction by ID and persists the change.
 * Rolls back if storage fails.
 * Requirements: 4.6, 1.3
 * @param {string} id
 */
function handleDeleteTransaction(id) {
  const prev = AppState.transactions;
  AppState.transactions = prev.filter(tx => tx.id !== id);

  try {
    storage.save();
  } catch (e) {
    AppState.transactions = prev; // rollback
    showGlobalError('Could not delete transaction. Please try again.');
    return;
  }

  showGlobalError(null);
  render();
}

// (event delegation is wired in init())

// ============================================================
// Action Handlers
// ============================================================

/**
 * Handles sort order dropdown change.
 * @param {string} value - one of SORT_OPTIONS values
 */
function handleSortChange(value) {
  AppState.sortOrder = value;
  try {
    localStorage.setItem(LS_KEYS.SORT_ORDER, value);
  } catch (e) {
    // non-critical — sort order just won't persist
  }
  render();
}

/**
 * Handles budget threshold input change.
 * @param {string} value - raw string from the input element
 */
function handleThresholdChange(value) {
  const trimmed = value.trim();
  if (trimmed === '') {
    AppState.threshold = null;
  } else {
    const num = parseFloat(trimmed);
    AppState.threshold = isNaN(num) ? null : num;
  }

  try {
    localStorage.setItem(LS_KEYS.THRESHOLD, AppState.threshold !== null ? String(AppState.threshold) : '');
  } catch (e) {
    // non-critical
  }

  render();
}

/**
 * Toggles the theme between 'light' and 'dark'.
 */
function handleThemeToggle() {
  AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(LS_KEYS.THEME, AppState.theme);
  } catch (e) {
    // non-critical
  }
  render();
}

// ============================================================
// Initialisation
// ============================================================

/**
 * Initialises the app: checks storage availability, loads state,
 * binds all event listeners, and performs the first render.
 * Requirements: 1.4, 1.5, 6.4, 7.5, 8.3, 8.4
 */
function init() {
  // Check localStorage availability (Req 1.5)
  if (!storage.isAvailable()) {
    showGlobalError('Local storage is unavailable — your data will not be saved this session.');
  } else {
    // Load persisted state (Req 1.4)
    storage.load();
  }

  // Sync sort select UI with loaded state
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = AppState.sortOrder;

  // Sync threshold input UI with loaded state
  const thresholdInput = document.getElementById('threshold-input');
  if (thresholdInput && AppState.threshold !== null) {
    thresholdInput.value = AppState.threshold;
  }

  // Bind: form submit
  document.getElementById('transaction-form')
    .addEventListener('submit', handleAddTransaction);

  // Bind: delete button delegation on transaction list (Req 4.6)
  document.getElementById('transaction-list')
    .addEventListener('click', function (e) {
      const btn = e.target.closest('.delete-btn');
      if (btn) handleDeleteTransaction(btn.dataset.id);
    });

  // Bind: sort select change (Req 6.1)
  sortSelect.addEventListener('change', function (e) {
    handleSortChange(e.target.value);
  });

  // Bind: threshold input (Req 7.1)
  thresholdInput.addEventListener('input', function (e) {
    handleThresholdChange(e.target.value);
  });

  // Bind: theme toggle (Req 8.1)
  document.getElementById('theme-toggle')
    .addEventListener('click', handleThemeToggle);

  // First render
  render();
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', init);
