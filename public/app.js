const state = {
  me: null,
  users: [],
  inventory: [],
  products: [],
  sales: [],
  orders: [],
  accountingCounts: [],
  menuItems: [],
  menuEditMode: false,
  ordersTab: 'active',
  tasks: [],
  serviceSchedule: [],
  selectedServiceDate: null,
  planningEditMode: false,
  serviceDrawerOpen: false,
  pushNotificationsEnabled: false,
  orderSummaryCollapsed: false,
  cart: [],
  menuCart: [],
  menuDrafts: [],
  notifications: [],
  dashboardDateFrom: '',
  dashboardDateTo: '',
  currentView: 'menu',
  menuCustomerMode: false,
  mobileNavOpen: false,
  adminNavOpen: false,
  adminUnlocked: false,
  accountingEditingEntryId: null,
  authSlide: 'login',
};

let eventSource = null;
let pendingPaymentResolver = null;
let menuDraggedItemId = null;
let menuDraftSyncTimer = null;
let menuDraftSyncInFlight = false;
let pendingMenuDraftSync = null;
let menuDraftLastSyncedSignature = '';
let ordersRealtimePollTimer = null;
let ordersRealtimePollInFlight = false;
let ordersRealtimeSignature = '';
const PUSH_PREF_KEY = 'cafecfoc_push_notifications_enabled';
const DEFAULT_CURRENCY = 'CAD';
const MENU_SECTIONS = ['food', 'drink'];
const ADMIN_VIEWS = ['dashboard', 'accounting'];
const ADMIN_UNLOCK_CODE = '7838';
const AUTH_SLIDES = ['login', 'register', 'forgot'];
const MENU_DRAFT_SYNC_DELAY_MS = 320;
const ORDERS_REALTIME_POLL_MS = 1200;
const ACCOUNTING_DENOMINATIONS = [
  { id: 'coin_5c', type: 'coin', label: '5¢', value: 0.05 },
  { id: 'coin_10c', type: 'coin', label: '10¢', value: 0.1 },
  { id: 'coin_25c', type: 'coin', label: '25¢', value: 0.25 },
  { id: 'coin_1', type: 'coin', label: '$1', value: 1 },
  { id: 'coin_2', type: 'coin', label: '$2', value: 2 },
  { id: 'bill_5', type: 'bill', label: '$5', value: 5 },
  { id: 'bill_10', type: 'bill', label: '$10', value: 10 },
  { id: 'bill_20', type: 'bill', label: '$20', value: 20 },
  { id: 'bill_50', type: 'bill', label: '$50', value: 50 },
  { id: 'bill_100', type: 'bill', label: '$100', value: 100 },
];

const els = {
  authSection: document.getElementById('auth-section'),
  authCarouselTrack: document.getElementById('auth-carousel-track'),
  appSection: document.getElementById('app-section'),
  notifList: document.getElementById('notif-list'),
  stats: document.getElementById('stats'),
  dashboardDateFrom: document.getElementById('dashboard-date-from'),
  dashboardDateTo: document.getElementById('dashboard-date-to'),
  dashboardRangeReset: document.getElementById('dashboard-range-reset'),
  dashboardRangeLabel: document.getElementById('dashboard-range-label'),
  financeChart: document.getElementById('finance-chart'),
  financeChartSummary: document.getElementById('finance-chart-summary'),
  mobileNavToggle: document.getElementById('mobile-nav-toggle'),
  mobileNavBackdrop: document.getElementById('mobile-nav-backdrop'),
  appSidebar: document.getElementById('app-sidebar'),
  adminNavToggle: document.getElementById('admin-nav-toggle'),
  adminNavLabel: document.getElementById('admin-nav-label'),
  adminSubtabs: document.getElementById('admin-subtabs'),
  menuView: document.getElementById('view-menu'),
  menuEditToggle: document.getElementById('menu-edit-toggle'),
  menuCustomerToggle: document.getElementById('menu-customer-toggle'),
  menuSaveAllBtn: document.getElementById('menu-save-all'),
  menuAddSection: document.getElementById('menu-add-section'),
  menuAddItemBtn: document.getElementById('menu-add-item'),
  menuFoodGrid: document.getElementById('menu-food-grid'),
  menuDrinkGrid: document.getElementById('menu-drink-grid'),
  stockForm: document.getElementById('stock-form'),
  inventoryBody: document.getElementById('inventory-body'),
  productForm: document.getElementById('product-form'),
  productsBody: document.getElementById('products-body'),
  salesBody: document.getElementById('sales-body'),
  ordersView: document.getElementById('view-orders'),
  ordersTabActive: document.getElementById('orders-tab-active'),
  ordersTabArchive: document.getElementById('orders-tab-archive'),
  ordersNavBadge: document.getElementById('orders-nav-badge'),
  ordersListActive: document.getElementById('orders-list-active'),
  ordersListArchive: document.getElementById('orders-list-archive'),
  accountingView: document.getElementById('view-accounting'),
  accountingForm: document.getElementById('accounting-form'),
  accountingCoinsBody: document.getElementById('accounting-coins-body'),
  accountingBillsBody: document.getElementById('accounting-bills-body'),
  accountingCoinsTotal: document.getElementById('accounting-coins-total'),
  accountingBillsTotal: document.getElementById('accounting-bills-total'),
  accountingElectronicTotal: document.getElementById('accounting-electronic-total'),
  accountingExpenseTotal: document.getElementById('accounting-expense-total'),
  accountingTotal: document.getElementById('accounting-total'),
  accountingSubmitBtn: document.getElementById('accounting-submit-btn'),
  accountingHistoryBody: document.getElementById('accounting-history-body'),
  tasksBody: document.getElementById('tasks-body'),
  serviceWeeks: document.getElementById('service-weeks'),
  serviceDrawer: document.getElementById('service-drawer'),
  serviceDrawerBackdrop: document.getElementById('service-drawer-backdrop'),
  serviceDrawerTitle: document.getElementById('service-drawer-title'),
  serviceDrawerClose: document.getElementById('service-drawer-close'),
  serviceVolunteerSelect: document.getElementById('service-volunteer-select'),
  serviceVolunteerAssign: document.getElementById('service-volunteer-assign'),
  serviceAssignedList: document.getElementById('service-assigned-list'),
  planningEditToggle: document.getElementById('planning-edit-toggle'),
  profileNotifToggle: document.getElementById('profile-notif-toggle'),
  profileNotifStatus: document.getElementById('profile-notif-status'),
  cartBody: document.getElementById('cart-body'),
  cartTotals: document.getElementById('cart-totals'),
  toastContainer: document.getElementById('toast-container'),
  cartProduct: document.getElementById('cart-product'),
  taskAssignee: document.getElementById('task-assignee'),
  productStockLink: document.getElementById('product-stock-link'),
  orderNotes: document.getElementById('order-notes'),
  sidebarOrderCard: document.getElementById('sidebar-order-card'),
  sidebarOrderItems: document.getElementById('sidebar-order-items'),
  sidebarOrderTotal: document.getElementById('sidebar-order-total'),
  sidebarOrderNumber: document.getElementById('sidebar-order-number'),
  sidebarOrderNote: document.getElementById('sidebar-order-note'),
  sidebarOrderSend: document.getElementById('sidebar-order-send'),
  sidebarOrderClear: document.getElementById('sidebar-order-clear'),
  sidebarOrderToggle: document.getElementById('sidebar-order-toggle'),
  mobileSidebarOrderCard: document.getElementById('mobile-menu-order-card'),
  mobileSidebarOrderItems: document.getElementById('mobile-sidebar-order-items'),
  mobileSidebarOrderTotal: document.getElementById('mobile-sidebar-order-total'),
  mobileSidebarOrderNumber: document.getElementById('mobile-sidebar-order-number'),
  mobileSidebarOrderNote: document.getElementById('mobile-sidebar-order-note'),
  mobileSidebarOrderSend: document.getElementById('mobile-sidebar-order-send'),
  mobileSidebarOrderClear: document.getElementById('mobile-sidebar-order-clear'),
  mobileSidebarOrderToggle: document.getElementById('mobile-sidebar-order-toggle'),
  paymentModal: document.getElementById('payment-modal'),
  paymentModalOrderNumber: document.getElementById('payment-modal-order-number'),
  paymentModalAmount: document.getElementById('payment-modal-amount'),
  paymentModalMethodCash: document.getElementById('payment-modal-method-cash'),
  paymentModalMethodCard: document.getElementById('payment-modal-method-card'),
  paymentModalConfirm: document.getElementById('payment-modal-confirm'),
  paymentModalCancel: document.getElementById('payment-modal-cancel'),
  profileForm: document.getElementById('profile-form'),
};

state.pushNotificationsEnabled = loadPushPreference();
{
  const initialRange = getDefaultDashboardRange();
  state.dashboardDateFrom = initialRange.from;
  state.dashboardDateTo = initialRange.to;
}

function moneyTotalsToText(totals) {
  const entries = Object.entries(totals || {});
  if (!entries.length) return '-';
  return entries.map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`).join(' | ');
}

function formatOrderNumber(orderNumber) {
  const parsed = Number(orderNumber || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '000';
  }
  return String(Math.trunc(parsed)).padStart(3, '0');
}

function getNextOrderNumber() {
  const maxOrderNumber = state.orders.reduce((maxValue, order) => {
    const value = Number(order.orderNumber || 0);
    return Number.isFinite(value) && value > maxValue ? value : maxValue;
  }, 0);
  return maxOrderNumber + 1;
}

function userNameById(userId) {
  const user = state.users.find((entry) => entry.id === userId);
  return user ? user.name : 'N/A';
}

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-CA');
}

function parseTimeStamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function getOrderTimerEnd(order) {
  if (!isOrderArchived(order)) return null;

  if (order?.archivedAt) return order.archivedAt;

  const deliveredTimes = (Array.isArray(order?.items) ? order.items : [])
    .map((item) => parseTimeStamp(item?.deliveredAt))
    .filter((value) => value !== null);

  if (!deliveredTimes.length) return order?.createdAt || null;
  return new Date(Math.max(...deliveredTimes)).toISOString();
}

function formatElapsedTime(startIso, endIso) {
  const start = parseTimeStamp(startIso);
  if (start === null) return '--:--';

  const end = parseTimeStamp(endIso);
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor(((end === null ? now : end) - start) / 1000));

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateOrderTimers() {
  const timerElements = document.querySelectorAll('[data-order-timer]');
  for (const timerElement of timerElements) {
    const startAt = timerElement.dataset.startAt || '';
    const endAt = timerElement.dataset.endAt || '';
    timerElement.textContent = formatElapsedTime(startAt, endAt || null);
  }
}

function orderStatusLabel(order, archived) {
  if (archived) return 'archived';
  const status = String(order?.status || '').toLowerCase();
  if (status === 'in_progress') return 'in progress';
  if (status === 'completed') return 'completed';
  return 'new';
}

function todayISODate() {
  return toISODate(new Date());
}

function parseISODate(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDefaultDashboardRange() {
  const to = todayISODate();
  const toDate = parseISODate(to) || new Date();
  const from = toISODate(addDays(toDate, -29));
  return { from, to };
}

function ensureDashboardDateRange() {
  const defaults = getDefaultDashboardRange();
  let from = String(state.dashboardDateFrom || '').trim();
  let to = String(state.dashboardDateTo || '').trim();

  if (!parseISODate(from)) from = defaults.from;
  if (!parseISODate(to)) to = defaults.to;

  if (from > to) {
    const temp = from;
    from = to;
    to = temp;
  }

  state.dashboardDateFrom = from;
  state.dashboardDateTo = to;
  return { from, to };
}

function dateInRange(dateStr, from, to) {
  const date = String(dateStr || '').slice(0, 10);
  if (!date || !parseISODate(date)) return false;
  return date >= from && date <= to;
}

function applyDashboardRangeFromInputs() {
  const defaults = getDefaultDashboardRange();
  const fromInput = String(els.dashboardDateFrom?.value || '').trim();
  const toInput = String(els.dashboardDateTo?.value || '').trim();

  state.dashboardDateFrom = parseISODate(fromInput) ? fromInput : defaults.from;
  state.dashboardDateTo = parseISODate(toInput) ? toInput : defaults.to;
  ensureDashboardDateRange();
}

function getWeekStartMonday(date) {
  const day = date.getDay();
  const offset = (day + 6) % 7;
  return addDays(date, -offset);
}

function getNextFourWeeks() {
  const weeks = [];
  const firstMonday = getWeekStartMonday(new Date());
  for (let weekIndex = 0; weekIndex < 4; weekIndex += 1) {
    const weekStart = addDays(firstMonday, weekIndex * 7);
    const days = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      days.push(addDays(weekStart, dayIndex));
    }
    weeks.push(days);
  }
  return weeks;
}

function formatDisplayDate(dateStr) {
  const date = parseISODate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'short' });
}

function loadPushPreference() {
  try {
    return localStorage.getItem(PUSH_PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

function savePushPreference(enabled) {
  try {
    localStorage.setItem(PUSH_PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore storage failures
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMenuPrice(item) {
  const note = item.priceNote ? ` ${item.priceNote}` : '';
  return `${Number(item.price || 0).toFixed(2)} ${DEFAULT_CURRENCY}${note}`;
}

function formatMenuQuantity(item) {
  const quantity = Number(item.quantity || 0);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return 'Qty: 0';
  }
  return `Qty: ${quantity}`;
}

function roundMoney(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function shortText(value, maxLength = 88) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function isHalfStepPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return false;
  return Math.abs((numeric * 2) - Math.round(numeric * 2)) < 1e-9;
}

function getAccountingLinesFromForm() {
  if (!els.accountingForm) return [];

  return ACCOUNTING_DENOMINATIONS.map((denomination) => {
    const input = els.accountingForm.elements[`count_${denomination.id}`];
    const rawCount = Number(input?.value || 0);
    const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.trunc(rawCount) : 0;
    const value = Number(denomination.value || 0);
    const subtotal = roundMoney(value * count);
    return {
      id: denomination.id,
      label: denomination.label,
      type: denomination.type,
      value,
      count,
      subtotal,
    };
  });
}

function computeAccountingTotal(lines) {
  return roundMoney((lines || []).reduce((sum, line) => sum + Number(line.subtotal || 0), 0));
}

function computeAccountingEntryCashTotal(entry) {
  const fallback = roundMoney(Number(entry?.totalAmount || 0));
  if (!Array.isArray(entry?.lines) || entry.lines.length === 0) return fallback;

  const computed = roundMoney(
    entry.lines.reduce((sum, line) => {
      const rawSubtotal = Number(line?.subtotal);
      if (Number.isFinite(rawSubtotal) && rawSubtotal >= 0) {
        return sum + rawSubtotal;
      }

      const value = Number(line?.value || 0);
      const rawCount = Number(line?.count || 0);
      const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.trunc(rawCount) : 0;
      if (!Number.isFinite(value) || value < 0 || count <= 0) return sum;
      return sum + (value * count);
    }, 0),
  );

  return computed;
}

function parseAccountingAmount(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return roundMoney(parsed);
}

function getElectronicPaymentsFromForm() {
  if (!els.accountingForm) {
    return { visaAmount: 0, creditAmount: 0 };
  }

  const visaAmount = parseAccountingAmount(els.accountingForm.elements.visaAmount?.value);
  const creditAmount = parseAccountingAmount(els.accountingForm.elements.creditAmount?.value);

  return { visaAmount, creditAmount };
}

function getAccountingExpenseFromForm() {
  if (!els.accountingForm) return 0;
  return parseAccountingAmount(els.accountingForm.elements.expenseAmount?.value);
}

function getAccountingSelectedDateFromForm() {
  if (!els.accountingForm) return todayISODate();
  const dateValue = String(els.accountingForm.elements.countDate?.value || '').trim();
  return dateValue || todayISODate();
}

function updateAccountingSubmitButton() {
  if (!els.accountingSubmitBtn) return;
  const editing = Boolean(state.accountingEditingEntryId);
  els.accountingSubmitBtn.textContent = editing ? 'Update' : 'Submit count';
}

function clearAccountingEditMode() {
  if (!state.accountingEditingEntryId) return;
  state.accountingEditingEntryId = null;
  updateAccountingSubmitButton();
}

function startAccountingEdit(entry) {
  if (!els.accountingForm || !entry) return;
  const lines = Array.isArray(entry.lines) ? entry.lines : [];

  renderAccountingFormRows();
  for (const denomination of ACCOUNTING_DENOMINATIONS) {
    const lineById = lines.find((line) => String(line?.id || '') === denomination.id);
    const matchedLine = lineById || lines.find((line) => (
      String(line?.label || '').trim() === denomination.label
      && String(line?.type || '').trim().toLowerCase() === denomination.type
    ));
    const rawCount = Number(matchedLine?.count || 0);
    const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.trunc(rawCount) : 0;
    const input = els.accountingForm.elements[`count_${denomination.id}`];
    if (input) {
      input.value = String(count);
    }
  }

  const electronicPayments = entry.electronicPayments || {};
  if (els.accountingForm.elements.visaAmount) {
    els.accountingForm.elements.visaAmount.value = String(parseAccountingAmount(electronicPayments.visaAmount));
  }
  if (els.accountingForm.elements.creditAmount) {
    els.accountingForm.elements.creditAmount.value = String(parseAccountingAmount(electronicPayments.creditAmount));
  }
  if (els.accountingForm.elements.expenseAmount) {
    els.accountingForm.elements.expenseAmount.value = String(parseAccountingAmount(entry.expenseAmount));
  }
  if (els.accountingForm.elements.countDate) {
    const countDate = String(entry.countDate || '').trim() || String(entry.createdAt || '').slice(0, 10) || todayISODate();
    els.accountingForm.elements.countDate.value = countDate;
  }

  if (els.accountingForm.elements.countedBy) {
    els.accountingForm.elements.countedBy.value = String(entry.countedBy || '').trim();
  }
  if (els.accountingForm.elements.countedSignature) {
    els.accountingForm.elements.countedSignature.value = String(entry.countedSignature || '').trim();
  }
  if (els.accountingForm.elements.verifiedBy) {
    els.accountingForm.elements.verifiedBy.value = String(entry.verifiedBy || '').trim();
  }
  if (els.accountingForm.elements.verifiedSignature) {
    els.accountingForm.elements.verifiedSignature.value = String(entry.verifiedSignature || '').trim();
  }
  if (els.accountingForm.elements.notes) {
    els.accountingForm.elements.notes.value = String(entry.notes || '').trim();
  }

  state.accountingEditingEntryId = String(entry.id || '').trim() || null;
  updateAccountingSubmitButton();
  updateAccountingTotals();

  if (els.accountingView && typeof els.accountingView.scrollIntoView === 'function') {
    els.accountingView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function escapePdfText(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ');
}

function toLatin1Bytes(value) {
  const text = String(value || '');
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0) || 63;
    if (code <= 255) {
      bytes.push(code);
    } else {
      bytes.push(63);
    }
  }
  return Uint8Array.from(bytes);
}

function wrapTextLines(text, maxChars = 86) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return ['-'];
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

function buildSimplePdfBlob(contentLines) {
  const commands = [];
  let y = 804;

  commands.push('0.6 w 40 790 m 555 790 l S');
  commands.push(`BT /F1 18 Tf 1 0 0 1 40 ${y} Tm (${escapePdfText('CFOC Café (Missions)')}) Tj ET`);
  y -= 28;

  for (const line of contentLines) {
    if (y < 36) break;
    commands.push(`BT /F1 10.5 Tf 1 0 0 1 40 ${y} Tm (${escapePdfText(line)}) Tj ET`);
    y -= 14;
  }

  const streamContent = `${commands.join('\n')}\n`;
  const streamBytes = toLatin1Bytes(streamContent);

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}endstream\nendobj\n`,
  ];

  const parts = [];
  const offsets = [0];
  let cursor = 0;

  const header = toLatin1Bytes('%PDF-1.4\n');
  parts.push(header);
  cursor += header.length;

  for (const objectText of objects) {
    offsets.push(cursor);
    const objectBytes = toLatin1Bytes(objectText);
    parts.push(objectBytes);
    cursor += objectBytes.length;
  }

  const xrefStart = cursor;
  const xrefRows = offsets
    .map((offset, index) => (
      index === 0
        ? '0000000000 65535 f \n'
        : `${String(offset).padStart(10, '0')} 00000 n \n`
    ))
    .join('');

  const trailer = [
    `xref\n0 ${offsets.length}\n`,
    xrefRows,
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\n`,
    `startxref\n${xrefStart}\n%%EOF`,
  ].join('');

  parts.push(toLatin1Bytes(trailer));
  return new Blob(parts, { type: 'application/pdf' });
}

function downloadAccountingPdf(sourceEntry = null) {
  const fromArchive = Boolean(sourceEntry && typeof sourceEntry === 'object');
  if (!fromArchive && !els.accountingForm) return;

  const currency = fromArchive
    ? (String(sourceEntry.currency || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY)
    : DEFAULT_CURRENCY;

  const lines = fromArchive
    ? (Array.isArray(sourceEntry.lines) ? sourceEntry.lines : []).map((line) => {
      const value = parseAccountingAmount(line?.value);
      const rawCount = Number(line?.count || 0);
      const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.trunc(rawCount) : 0;
      const subtotal = roundMoney(value * count);
      return {
        id: String(line?.id || '').trim(),
        label: String(line?.label || line?.id || '-').trim() || '-',
        type: String(line?.type || '').trim().toLowerCase(),
        value,
        count,
        subtotal,
      };
    })
    : getAccountingLinesFromForm();
  const coinLines = lines.filter((line) => line.type === 'coin');
  const billLines = lines.filter((line) => line.type === 'bill');
  const coinsTotal = roundMoney(coinLines.reduce((sum, line) => sum + line.subtotal, 0));
  const billsTotal = roundMoney(billLines.reduce((sum, line) => sum + line.subtotal, 0));
  const electronic = fromArchive
    ? {
      visaAmount: parseAccountingAmount(sourceEntry?.electronicPayments?.visaAmount),
      creditAmount: parseAccountingAmount(sourceEntry?.electronicPayments?.creditAmount),
    }
    : getElectronicPaymentsFromForm();
  const electronicTotal = roundMoney(Number(electronic.visaAmount || 0) + Number(electronic.creditAmount || 0));
  const expenseTotal = fromArchive
    ? parseAccountingAmount(sourceEntry?.expenseAmount)
    : getAccountingExpenseFromForm();
  const total = fromArchive
    ? computeAccountingEntryCashTotal(sourceEntry)
    : computeAccountingTotal(lines);

  const formData = fromArchive ? null : new FormData(els.accountingForm);
  const countDate = fromArchive
    ? (String(sourceEntry?.countDate || '').trim() || String(sourceEntry?.createdAt || '').slice(0, 10) || todayISODate())
    : getAccountingSelectedDateFromForm();
  const countedBy = fromArchive
    ? (String(sourceEntry?.countedBy || '').trim() || '-')
    : (String(formData.get('countedBy') || '').trim() || '-');
  const countedSignature = fromArchive
    ? (String(sourceEntry?.countedSignature || '').trim() || '-')
    : (String(formData.get('countedSignature') || '').trim() || '-');
  const verifiedBy = fromArchive
    ? (String(sourceEntry?.verifiedBy || '').trim() || '-')
    : (String(formData.get('verifiedBy') || '').trim() || '-');
  const verifiedSignature = fromArchive
    ? (String(sourceEntry?.verifiedSignature || '').trim() || '-')
    : (String(formData.get('verifiedSignature') || '').trim() || '-');
  const notes = fromArchive
    ? (String(sourceEntry?.notes || '').trim() || '-')
    : (String(formData.get('notes') || '').trim() || '-');

  const now = new Date().toLocaleString('en-CA');
  const textLines = [];
  const appendWrappedLine = (line) => {
    wrapTextLines(line, 88).forEach((wrapped) => textLines.push(wrapped));
  };
  const appendAmountLine = (label, amount) => {
    appendWrappedLine(`${label}: ${Number(amount || 0).toFixed(2)} ${currency}`);
  };
  const appendDenominationSection = (sectionTitle, sectionLines, sectionTotal) => {
    textLines.push(sectionTitle);
    textLines.push('Denomination | Qty | Value | Subtotal');
    sectionLines.forEach((line) => {
      appendWrappedLine(`${line.label} | ${line.count} | ${line.value.toFixed(2)} ${currency} | ${line.subtotal.toFixed(2)} ${currency}`);
    });
    appendAmountLine(`Total ${sectionTitle}`, sectionTotal);
    textLines.push('');
  };

  textLines.push(
    `Count date: ${countDate}`,
    `Genere le: ${now}`,
    '',
    `Counted by: ${countedBy} | Signature: ${countedSignature}`,
    `Verified by: ${verifiedBy} | Signature: ${verifiedSignature}`,
    '',
  );

  appendDenominationSection('Tableau Coins', coinLines, coinsTotal);
  appendDenominationSection('Tableau Billets', billLines, billsTotal);

  textLines.push('Tableau Electronic payment');
  appendAmountLine('Visa amount', electronic.visaAmount);
  appendAmountLine('Credit amount', electronic.creditAmount);
  appendAmountLine('Total tableau Electronic payment', electronicTotal);
  textLines.push('');

  textLines.push('Tableau Expense');
  appendAmountLine('Expense amount', expenseTotal);
  appendWrappedLine(`Date expense: ${countDate}`);
  appendAmountLine('Total tableau Expense', expenseTotal);
  textLines.push('');

  appendAmountLine('Count total', total);
  textLines.push('', 'Note:', ...wrapTextLines(notes, 88));

  const pdfBlob = buildSimplePdfBlob(textLines);
  const fileDate = String(countDate || todayISODate()).trim() || todayISODate();
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cfoc-count-${fileDate}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function getAmountFromCurrencyTotals(totalsByCurrency, currency = DEFAULT_CURRENCY) {
  const normalizedCurrency = String(currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const amount = Number(totalsByCurrency?.[normalizedCurrency] || 0);
  if (!Number.isFinite(amount)) return 0;
  return roundMoney(amount);
}

function normalizeOrderPaymentMethod(value, fallback = 'unknown') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cash') return 'cash';
  if (normalized === 'card' || normalized === 'credit' || normalized === 'visa' || normalized === 'debit') return 'card';
  const normalizedFallback = String(fallback || '').trim().toLowerCase();
  if (normalizedFallback === 'cash' || normalizedFallback === 'card') return normalizedFallback;
  return 'unknown';
}

function getOrderPaymentMethod(order) {
  const directMethod = normalizeOrderPaymentMethod(order?.paymentMethod, '');
  if (directMethod !== 'unknown') return directMethod;

  const sourceText = String(order?.source || '').trim().toLowerCase();
  if (sourceText.includes(':')) {
    const sourceParts = sourceText.split(':');
    if (sourceParts.length >= 2) {
      const sourceMethod = normalizeOrderPaymentMethod(sourceParts[1], '');
      if (sourceMethod !== 'unknown') return sourceMethod;
    }
  }

  return 'unknown';
}

function formatShortDate(dateStr) {
  const date = parseISODate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-CA', { day: '2-digit', month: 'short' });
}

function getFinancialRevenueRecords() {
  const salesRecords = Array.isArray(state.sales) ? state.sales : [];
  const orderRecords = Array.isArray(state.orders)
    ? state.orders.map((order) => ({
      createdAt: order.createdAt,
      totalsByCurrency: order.totalsByCurrency,
    }))
    : [];
  return salesRecords.concat(orderRecords);
}

function buildFinancialTrendSeries(fromDate, toDate) {
  const startDate = parseISODate(fromDate);
  const endDate = parseISODate(toDate);
  if (!startDate || !endDate || startDate > endDate) return [];

  const points = [];
  const pointsByDate = new Map();
  const dateCursor = new Date(startDate);
  const maxDays = 366;

  while (dateCursor <= endDate && points.length < maxDays) {
    const date = toISODate(dateCursor);
    const point = {
      date,
      sales: 0,
      expenses: 0,
      net: 0,
      cumulativeNet: 0,
    };
    points.push(point);
    pointsByDate.set(date, point);
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  for (const revenueRecord of getFinancialRevenueRecords()) {
    const date = String(revenueRecord.createdAt || '').slice(0, 10);
    if (!dateInRange(date, fromDate, toDate)) continue;
    const point = pointsByDate.get(date);
    if (!point) continue;
    point.sales = roundMoney(point.sales + getAmountFromCurrencyTotals(revenueRecord.totalsByCurrency, DEFAULT_CURRENCY));
  }

  for (const entry of state.accountingCounts) {
    const date = String(entry.countDate || '').trim() || String(entry.createdAt || '').slice(0, 10);
    if (!dateInRange(date, fromDate, toDate)) continue;
    const point = pointsByDate.get(date);
    if (!point) continue;
    point.expenses = roundMoney(point.expenses + parseAccountingAmount(entry.expenseAmount));
  }

  let runningNet = 0;
  for (const point of points) {
    point.net = roundMoney(point.sales - point.expenses);
    runningNet = roundMoney(runningNet + point.net);
    point.cumulativeNet = runningNet;
  }

  return points;
}

function renderFinanceChart(fromDate, toDate) {
  if (!els.financeChart) return;

  const points = buildFinancialTrendSeries(fromDate, toDate);
  if (!points.length) {
    els.financeChart.innerHTML = '<p class="muted">No financial data.</p>';
    if (els.financeChartSummary) els.financeChartSummary.textContent = '';
    return;
  }

  const totalSales = roundMoney(points.reduce((sum, point) => sum + point.sales, 0));
  const totalExpenses = roundMoney(points.reduce((sum, point) => sum + point.expenses, 0));
  const totalNet = roundMoney(totalSales - totalExpenses);

  if (els.financeChartSummary) {
    els.financeChartSummary.textContent = `${formatDisplayDate(fromDate)} -> ${formatDisplayDate(toDate)} | ${totalSales.toFixed(2)} ${DEFAULT_CURRENCY} - ${totalExpenses.toFixed(2)} ${DEFAULT_CURRENCY} = ${totalNet.toFixed(2)} ${DEFAULT_CURRENCY}`;
  }

  const values = points.map((point) => point.cumulativeNet);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = Math.max(1, maxValue - minValue);

  const width = 760;
  const height = 220;
  const paddingLeft = 42;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 34;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const stepX = points.length > 1 ? graphWidth / (points.length - 1) : 0;
  const toY = (value) => paddingTop + ((maxValue - value) / range) * graphHeight;
  const zeroY = toY(0);

  const polylinePoints = points
    .map((point, index) => `${(paddingLeft + index * stepX).toFixed(2)},${toY(point.cumulativeNet).toFixed(2)}`)
    .join(' ');

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = paddingTop + graphHeight * ratio;
      return `<line x1="${paddingLeft}" y1="${y.toFixed(2)}" x2="${(width - paddingRight).toFixed(2)}" y2="${y.toFixed(2)}" class="finance-grid-line"></line>`;
    })
    .join('');

  const labelIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));
  const dateLabels = labelIndexes
    .map((index) => {
      const x = paddingLeft + stepX * index;
      const label = formatShortDate(points[index].date);
      return `<text x="${x.toFixed(2)}" y="${(height - 10).toFixed(2)}" text-anchor="middle" class="finance-axis-label">${escapeHtml(label)}</text>`;
    })
    .join('');

  const lastIndex = points.length - 1;
  const lastX = paddingLeft + stepX * lastIndex;
  const lastY = toY(points[lastIndex].cumulativeNet);

  els.financeChart.innerHTML = `
    <div class="finance-chart-legend">
      <span><i class="finance-dot finance-dot-net"></i>Cumulative net (${points.length} days)</span>
      <span><i class="finance-dot finance-dot-sales"></i>Sales: ${totalSales.toFixed(2)} ${DEFAULT_CURRENCY}</span>
      <span><i class="finance-dot finance-dot-expense"></i>Expenses: ${totalExpenses.toFixed(2)} ${DEFAULT_CURRENCY}</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" class="finance-svg" role="img" aria-label="Financial trend sales minus expense">
      ${gridLines}
      <line x1="${paddingLeft}" y1="${zeroY.toFixed(2)}" x2="${(width - paddingRight).toFixed(2)}" y2="${zeroY.toFixed(2)}" class="finance-zero-line"></line>
      <polyline points="${polylinePoints}" class="finance-net-line"></polyline>
      <circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="4" class="finance-last-point"></circle>
      ${dateLabels}
    </svg>
  `;
}

function menuSectionLabel(section) {
  return section === 'drink' ? 'Pop & Drink' : 'Food & Snack';
}

function normalizeMenuSection(section) {
  return section === 'drink' ? 'drink' : 'food';
}

function buildNewMenuItemName(section) {
  const base = section === 'drink' ? 'New drink' : 'New item';
  const existingNames = new Set(state.menuItems.map((item) => String(item.name || '').trim().toLowerCase()).filter(Boolean));

  let index = 1;
  while (existingNames.has(`${base} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${base} ${index}`;
}

function findMenuItemById(menuItemId) {
  return state.menuItems.find((item) => item.id === menuItemId);
}

function reorderMenuItems(draggedItemId, targetItemId, targetSection) {
  const draggedId = String(draggedItemId || '').trim();
  const destinationTargetId = String(targetItemId || '').trim();
  if (!draggedId || !destinationTargetId || draggedId === destinationTargetId) return false;

  const draggedIndex = state.menuItems.findIndex((item) => item.id === draggedId);
  const targetIndex = state.menuItems.findIndex((item) => item.id === destinationTargetId);
  if (draggedIndex < 0 || targetIndex < 0) return false;

  const nextItems = state.menuItems.map((item) => ({ ...item }));
  const draggedItem = nextItems[draggedIndex];
  const targetItem = nextItems[targetIndex];
  const draggedSection = normalizeMenuSection(draggedItem.section);
  const nextTargetSection = normalizeMenuSection(targetItem.section || targetSection || draggedSection);

  nextItems[draggedIndex] = {
    ...targetItem,
    section: draggedSection,
  };
  nextItems[targetIndex] = {
    ...draggedItem,
    section: nextTargetSection,
  };

  const currentSignature = state.menuItems.map((item) => `${item.id}:${item.section}`).join('|');
  const nextSignature = nextItems.map((item) => `${item.id}:${item.section}`).join('|');
  if (currentSignature === nextSignature) return false;

  state.menuItems = nextItems;
  return true;
}

async function persistMenuOrder() {
  const orderedIds = state.menuItems.map((item) => item.id);
  const sections = Object.fromEntries(state.menuItems.map((item) => [item.id, item.section]));

  await api('/api/menu-items/reorder', {
    method: 'PUT',
    body: {
      orderedIds,
      sections,
    },
  });
}

function normalizeMenuDraftItems(items) {
  const grouped = new Map();

  for (const rawItem of Array.isArray(items) ? items : []) {
    const menuItemId = String(rawItem?.menuItemId || '').trim();
    const qty = Number(rawItem?.qty || 0);
    if (!menuItemId || !Number.isFinite(qty) || qty <= 0) continue;
    if (!findMenuItemById(menuItemId)) continue;

    const roundedQty = Math.max(1, Math.round(qty));
    grouped.set(menuItemId, (grouped.get(menuItemId) || 0) + roundedQty);
  }

  const normalized = [];
  for (const [menuItemId, groupedQty] of grouped.entries()) {
    const item = findMenuItemById(menuItemId);
    if (!item) continue;
    const availableQty = Number(item.quantity || 0);
    const cappedQty = Number.isFinite(availableQty) && availableQty >= 0
      ? Math.min(groupedQty, Math.floor(availableQty))
      : groupedQty;
    if (!Number.isFinite(cappedQty) || cappedQty <= 0) continue;
    normalized.push({ menuItemId, qty: cappedQty });
  }

  normalized.sort((left, right) => left.menuItemId.localeCompare(right.menuItemId));
  return normalized;
}

function getMenuDraftPayload() {
  const items = normalizeMenuDraftItems(state.menuCart);

  return {
    items,
    note: String(getOrderNoteValue() || '').trim().slice(0, 240),
  };
}

function getMenuDraftsWithLocalState() {
  const drafts = (Array.isArray(state.menuDrafts) ? state.menuDrafts : [])
    .filter((draft) => draft && typeof draft === 'object')
    .map((draft) => ({
      userId: String(draft.userId || '').trim(),
      items: normalizeMenuDraftItems(draft.items),
      note: String(draft.note || '').trim().slice(0, 240),
      updatedAt: String(draft.updatedAt || ''),
    }))
    .filter((draft) => draft.userId && (draft.items.length > 0 || draft.note));

  const myUserId = String(state.me?.id || '').trim();
  if (!myUserId) return drafts;

  const localDraft = getMenuDraftPayload();
  const withoutMine = drafts.filter((draft) => draft.userId !== myUserId);

  if (localDraft.items.length || localDraft.note) {
    withoutMine.push({
      userId: myUserId,
      items: localDraft.items,
      note: localDraft.note,
      updatedAt: new Date().toISOString(),
    });
  }

  return withoutMine;
}

function getCombinedMenuCart() {
  const grouped = new Map();

  for (const draft of getMenuDraftsWithLocalState()) {
    for (const item of draft.items) {
      grouped.set(item.menuItemId, (grouped.get(item.menuItemId) || 0) + Number(item.qty || 0));
    }
  }

  return normalizeMenuDraftItems(
    Array.from(grouped.entries()).map(([menuItemId, qty]) => ({ menuItemId, qty })),
  );
}

function getCombinedMenuQty(menuItemId, { excludeCurrentUser = false } = {}) {
  const targetId = String(menuItemId || '').trim();
  if (!targetId) return 0;

  const myUserId = String(state.me?.id || '').trim();
  let total = 0;

  for (const draft of getMenuDraftsWithLocalState()) {
    if (excludeCurrentUser && myUserId && draft.userId === myUserId) continue;
    const match = draft.items.find((entry) => entry.menuItemId === targetId);
    if (!match) continue;
    total += Number(match.qty || 0);
  }

  return Number.isFinite(total) ? total : 0;
}

function applyLocalMenuDraftFromSharedState() {
  const myUserId = String(state.me?.id || '').trim();
  if (!myUserId) return;

  const myDraft = (Array.isArray(state.menuDrafts) ? state.menuDrafts : [])
    .find((draft) => String(draft?.userId || '').trim() === myUserId);

  if (!myDraft) {
    state.menuCart = [];
    clearOrderNoteValue();
    return;
  }

  state.menuCart = normalizeMenuDraftItems(myDraft.items);
  setOrderNoteValue(String(myDraft.note || ''), null);
}

function menuDraftSignature(payload) {
  return JSON.stringify(payload || { items: [], note: '' });
}

function resetMenuDraftSyncState() {
  if (menuDraftSyncTimer) {
    clearTimeout(menuDraftSyncTimer);
    menuDraftSyncTimer = null;
  }
  pendingMenuDraftSync = null;
  menuDraftSyncInFlight = false;
  menuDraftLastSyncedSignature = '';
}

function scheduleMenuDraftSync({ immediate = false } = {}) {
  if (!state.me) return;

  const payload = getMenuDraftPayload();
  const signature = menuDraftSignature(payload);

  pendingMenuDraftSync = { payload, signature };
  if (!menuDraftSyncInFlight && signature === menuDraftLastSyncedSignature) {
    pendingMenuDraftSync = null;
    return;
  }

  if (menuDraftSyncTimer) {
    clearTimeout(menuDraftSyncTimer);
    menuDraftSyncTimer = null;
  }

  if (immediate) {
    void flushMenuDraftSync();
    return;
  }

  menuDraftSyncTimer = setTimeout(() => {
    menuDraftSyncTimer = null;
    void flushMenuDraftSync();
  }, MENU_DRAFT_SYNC_DELAY_MS);
}

async function flushMenuDraftSync() {
  if (!state.me || menuDraftSyncInFlight) return;
  const queued = pendingMenuDraftSync;
  if (!queued) return;
  if (queued.signature === menuDraftLastSyncedSignature) {
    pendingMenuDraftSync = null;
    return;
  }

  pendingMenuDraftSync = null;
  menuDraftSyncInFlight = true;

  try {
    const shouldDelete = queued.payload.items.length === 0 && !queued.payload.note;
    const response = await api('/api/menu-draft', {
      method: shouldDelete ? 'DELETE' : 'PUT',
      body: shouldDelete ? undefined : queued.payload,
    });
    if (Array.isArray(response?.menuDrafts)) {
      state.menuDrafts = response.menuDrafts;
      renderSidebarOrder();
    }
    menuDraftLastSyncedSignature = queued.signature;
  } catch (err) {
    console.warn('Menu draft sync failed:', err.message);
  } finally {
    menuDraftSyncInFlight = false;
    if (pendingMenuDraftSync && pendingMenuDraftSync.signature !== menuDraftLastSyncedSignature) {
      void flushMenuDraftSync();
    }
  }
}

function addMenuItemToCart(menuItemId, qty = 1) {
  const item = findMenuItemById(menuItemId);
  if (!item) {
    showToast('Menu item not found');
    return;
  }

  const parsedQty = Number(qty);
  if (!Number.isFinite(parsedQty) || parsedQty <= 0) return;

  const existing = state.menuCart.find((entry) => entry.menuItemId === menuItemId);
  const nextQty = (existing ? existing.qty : 0) + parsedQty;
  const nextCombinedQty = getCombinedMenuQty(menuItemId) + parsedQty;
  const availableQty = Number(item.quantity || 0);
  if (Number.isFinite(availableQty) && availableQty >= 0 && nextCombinedQty > availableQty) {
    showToast(`Insufficient menu stock for ${item.name}`);
    return;
  }

  if (existing) {
    existing.qty = nextQty;
  } else {
    state.menuCart.push({ menuItemId, qty: parsedQty });
  }
}

function setMenuCartQuantity(menuItemId, qty) {
  const item = findMenuItemById(menuItemId);
  if (!item) {
    state.menuCart = state.menuCart.filter((entry) => entry.menuItemId !== menuItemId);
    return;
  }

  const parsedQty = Number(qty);
  if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
    state.menuCart = state.menuCart.filter((entry) => entry.menuItemId !== menuItemId);
    return;
  }

  const localCurrentQty = state.menuCart.find((cartEntry) => cartEntry.menuItemId === menuItemId)?.qty || 0;
  const combinedWithoutMineQty = getCombinedMenuQty(menuItemId, { excludeCurrentUser: true });
  const nextCombinedQty = combinedWithoutMineQty + parsedQty;
  const availableQty = Number(item.quantity || 0);
  if (Number.isFinite(availableQty) && availableQty >= 0 && nextCombinedQty > availableQty) {
    showToast(`Insufficient menu stock for ${item.name}`);
    return;
  }

  const entry = state.menuCart.find((cartEntry) => cartEntry.menuItemId === menuItemId);
  if (entry) {
    entry.qty = parsedQty;
    return;
  }

  if (localCurrentQty <= 0) {
    state.menuCart.push({ menuItemId, qty: parsedQty });
  }
}

function getOrderNoteValue() {
  if (els.sidebarOrderNote && els.sidebarOrderNote.value) return els.sidebarOrderNote.value;
  if (els.mobileSidebarOrderNote && els.mobileSidebarOrderNote.value) return els.mobileSidebarOrderNote.value;
  return '';
}

function setOrderNoteValue(value, sourceInput = null) {
  const nextValue = String(value || '');
  const inputs = [els.sidebarOrderNote, els.mobileSidebarOrderNote].filter(Boolean);
  for (const input of inputs) {
    if (sourceInput && input === sourceInput) continue;
    if (input.value !== nextValue) {
      input.value = nextValue;
    }
  }
}

function clearOrderNoteValue() {
  setOrderNoteValue('', null);
}

function handleSidebarOrderItemsClick(event) {
  const action = event.target.dataset.action;
  const menuItemId = event.target.dataset.menuItemId;
  if (!action || !menuItemId) return;

  const entry = state.menuCart.find((item) => item.menuItemId === menuItemId);
  if (action === 'sidebar-order-inc') {
    const currentQty = entry ? Number(entry.qty || 0) : 0;
    setMenuCartQuantity(menuItemId, currentQty + 1);
  } else if (action === 'sidebar-order-dec') {
    if (!entry) return;
    setMenuCartQuantity(menuItemId, entry.qty - 1);
  } else if (action === 'sidebar-order-remove') {
    if (!entry) return;
    state.menuCart = state.menuCart.filter((item) => item.menuItemId !== menuItemId);
  }

  renderSidebarOrder();
  scheduleMenuDraftSync();
}

function clearSidebarOrderSelection() {
  state.menuCart = [];
  renderSidebarOrder();
  scheduleMenuDraftSync();
}

function applySidebarOrderCollapsedState() {
  const collapsed = state.orderSummaryCollapsed === true;
  [els.sidebarOrderCard, els.mobileSidebarOrderCard].forEach((card) => {
    if (!card) return;
    card.classList.toggle('sidebar-order-collapsed', collapsed);
  });

  const label = collapsed ? 'Show more' : 'Collapse';
  const symbol = collapsed ? '+' : '-';
  [els.sidebarOrderToggle, els.mobileSidebarOrderToggle].forEach((button) => {
    if (!button) return;
    button.textContent = symbol;
    button.setAttribute('title', label);
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
}

async function sendSidebarOrder() {
  if (menuDraftSyncTimer) {
    clearTimeout(menuDraftSyncTimer);
    menuDraftSyncTimer = null;
  }
  await flushMenuDraftSync();

  try {
    const latestDrafts = await api('/api/menu-drafts');
    if (Array.isArray(latestDrafts?.menuDrafts)) {
      state.menuDrafts = latestDrafts.menuDrafts;
    }
  } catch {
    // non-blocking: keep local/last-known draft state
  }

  const sharedMenuCart = getCombinedMenuCart();
  if (!sharedMenuCart.length) {
    showToast('No item in the order');
    return;
  }

  const total = sharedMenuCart.reduce((acc, entry) => {
    const menuItem = findMenuItemById(entry.menuItemId);
    if (!menuItem) return acc;
    return acc + Number(menuItem.price || 0) * Number(entry.qty || 0);
  }, 0);

  await syncOrdersFromServer();
  const nextOrderNumber = getNextOrderNumber();
  const paymentMethod = await requestPaymentConfirmation(total, nextOrderNumber);
  if (!paymentMethod) return;

  try {
    const response = await api('/api/orders', {
      method: 'POST',
      body: {
        menuItems: sharedMenuCart.map((entry) => ({
          menuItemId: entry.menuItemId,
          qty: Number(entry.qty || 0),
        })),
        notes: getOrderNoteValue(),
        paymentMethod,
      },
    });

    if (response?.order?.id) {
      state.orders = [response.order].concat(state.orders.filter((entry) => entry.id !== response.order.id));
    }
    if (Array.isArray(response?.menuItems)) {
      state.menuItems = response.menuItems;
      renderMenu();
    }
    if (Array.isArray(response?.inventory)) {
      state.inventory = response.inventory;
    }

    state.menuCart = [];
    state.menuDrafts = [];
    clearOrderNoteValue();
    renderSidebarOrder();
    scheduleMenuDraftSync({ immediate: true });
    renderStats();

    const orderRef = `#${formatOrderNumber(response?.order?.orderNumber || nextOrderNumber)}`;
    showToast(`Order ${orderRef} sent to the team`);
  } catch (err) {
    showToast(err.message);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });
}

function closePaymentModal(selectedPaymentMethod = null) {
  if (!els.paymentModal) return;
  els.paymentModal.classList.add('hidden');
  if (pendingPaymentResolver) {
    const resolver = pendingPaymentResolver;
    pendingPaymentResolver = null;
    const resolvedMethod = normalizeOrderPaymentMethod(selectedPaymentMethod, 'unknown');
    resolver(resolvedMethod === 'unknown' ? null : resolvedMethod);
  }
}

function requestPaymentConfirmation(totalAmount, orderNumber) {
  if (!els.paymentModal || !els.paymentModalAmount || !els.paymentModalOrderNumber) {
    const confirmed = confirm(`Confirm payment of ${totalAmount.toFixed(2)} ${DEFAULT_CURRENCY} ?`);
    return Promise.resolve(confirmed ? 'cash' : null);
  }

  els.paymentModalOrderNumber.textContent = `#${formatOrderNumber(orderNumber)}`;
  els.paymentModalAmount.textContent = `Payment: ${Number(totalAmount || 0).toFixed(2)} ${DEFAULT_CURRENCY}`;
  if (els.paymentModalMethodCash) els.paymentModalMethodCash.checked = true;
  if (els.paymentModalMethodCard) els.paymentModalMethodCard.checked = false;
  els.paymentModal.classList.remove('hidden');

  return new Promise((resolve) => {
    pendingPaymentResolver = resolve;
  });
}

async function api(path, options = {}) {
  const config = { ...options };
  config.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(path, config);
  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.error || 'API error');
    error.status = response.status;
    throw error;
  }

  return payload;
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 720px)').matches;
}

function applyMobileNavState() {
  const shouldOpen = Boolean(
    state.me
      && state.mobileNavOpen
      && isMobileViewport()
      && !document.body.classList.contains('menu-customer-mode'),
  );

  document.body.classList.toggle('mobile-nav-open', shouldOpen);

  if (els.mobileNavToggle) {
    els.mobileNavToggle.classList.toggle('active', shouldOpen);
    els.mobileNavToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    els.mobileNavToggle.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
  }

  if (els.mobileNavBackdrop) {
    els.mobileNavBackdrop.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  }
}

function isAdminView(view) {
  return ADMIN_VIEWS.includes(String(view || '').trim());
}

function requestAdminUnlock() {
  const enteredCode = prompt('Enter admin code to unlock:');
  if (enteredCode === null) {
    return false;
  }

  if (String(enteredCode).trim() !== ADMIN_UNLOCK_CODE) {
    showToast('Invalid admin code');
    return false;
  }

  state.adminUnlocked = true;
  state.adminNavOpen = true;
  showToast('Admin unlocked');
  return true;
}

function updateAdminNavState() {
  if (!els.adminNavToggle || !els.adminSubtabs) return;
  const adminActive = isAdminView(state.currentView);
  const isUnlocked = state.adminUnlocked === true;
  const isExpanded = isUnlocked && Boolean(state.adminNavOpen);

  els.adminNavToggle.classList.toggle('active', isUnlocked && adminActive);
  els.adminNavToggle.classList.toggle('locked', !isUnlocked);
  els.adminNavToggle.classList.toggle('collapsed', !isExpanded);
  els.adminNavToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  els.adminNavToggle.setAttribute('aria-label', isUnlocked ? 'Admin' : 'Admin (locked)');
  if (els.adminNavLabel) {
    els.adminNavLabel.textContent = isUnlocked ? 'Admin' : 'Admin (Locked)';
  }
  els.adminSubtabs.classList.toggle('hidden', !isExpanded);
}

function setView(view) {
  let nextView = String(view || 'menu').trim() || 'menu';
  if (isAdminView(nextView) && !state.adminUnlocked) {
    const unlocked = requestAdminUnlock();
    if (!unlocked) {
      return;
    }
  }

  state.currentView = nextView;
  if (isAdminView(nextView)) {
    state.adminNavOpen = true;
  }

  document.querySelectorAll('.tab[data-view]').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === nextView);
  });

  document.querySelectorAll('.view').forEach((panel) => {
    panel.classList.add('hidden');
  });

  const target = document.getElementById(`view-${nextView}`);
  if (target) target.classList.remove('hidden');
  if (state.mobileNavOpen && isMobileViewport()) {
    state.mobileNavOpen = false;
  }
  updateAdminNavState();
  applyMenuCustomerModeState();
}

function applyMenuCustomerModeState() {
  const customerModeActive = Boolean(state.me && state.menuCustomerMode && state.currentView === 'menu');
  document.body.classList.toggle('menu-customer-mode', customerModeActive);

  if (els.menuCustomerToggle) {
    els.menuCustomerToggle.classList.toggle('active', state.menuCustomerMode);
    els.menuCustomerToggle.setAttribute('aria-pressed', state.menuCustomerMode ? 'true' : 'false');
    els.menuCustomerToggle.title = state.menuCustomerMode ? 'Exit customer mode' : 'Enable customer mode';
  }

  applyMobileNavState();
}

function normalizeAuthSlide(value) {
  const slide = String(value || '').trim().toLowerCase();
  return AUTH_SLIDES.includes(slide) ? slide : 'login';
}

function renderAuthCarousel() {
  const activeSlide = normalizeAuthSlide(state.authSlide);
  state.authSlide = activeSlide;

  if (els.authCarouselTrack) {
    const index = AUTH_SLIDES.indexOf(activeSlide);
    els.authCarouselTrack.style.setProperty('--auth-slide-index', String(index >= 0 ? index : 0));
  }

  document.querySelectorAll('[data-action="switch-auth-slide"]').forEach((button) => {
    const buttonSlide = normalizeAuthSlide(button.dataset.authSlide);
    const isActive = buttonSlide === activeSlide;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setAuthSlide(nextSlide) {
  state.authSlide = normalizeAuthSlide(nextSlide);
  renderAuthCarousel();
}

function showAuth() {
  state.me = null;
  state.menuEditMode = false;
  state.menuCustomerMode = false;
  state.mobileNavOpen = false;
  state.adminNavOpen = false;
  state.adminUnlocked = false;
  state.accountingEditingEntryId = null;
  state.currentView = 'menu';
  state.authSlide = 'login';
  state.planningEditMode = false;
  state.serviceDrawerOpen = false;
  state.menuCart = [];
  state.menuDrafts = [];
  resetMenuDraftSyncState();
  closePaymentModal(null);
  els.authSection.classList.remove('hidden');
  els.appSection.classList.add('hidden');
  document.body.classList.remove('app-active');

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  stopOrdersRealtimePolling();

  applyMenuCustomerModeState();
  renderAuthCarousel();
  document.body.classList.remove('app-booting');
}

function showApp() {
  els.authSection.classList.add('hidden');
  els.appSection.classList.remove('hidden');
  document.body.classList.add('app-active');
  applyMobileNavState();
  startOrdersRealtimePolling();
  document.body.classList.remove('app-booting');
}

function addNotification(message, withBrowser = false) {
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    message,
    at: new Date().toISOString(),
  };

  state.notifications.unshift(item);
  state.notifications = state.notifications.slice(0, 25);
  renderNotifications();
  renderStats();
  showToast(message);

  if (withBrowser && state.pushNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('CafeCFOC', { body: message });
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3600);
}

function renderNotifications() {
  if (!state.notifications.length) {
    els.notifList.innerHTML = '<li>No recent notifications.</li>';
    return;
  }

  els.notifList.innerHTML = state.notifications
    .slice(0, 8)
    .map((item) => `<li>${item.message} <span class="muted">(${formatDateTime(item.at)})</span></li>`)
    .join('');
}

function renderStats() {
  const { from, to } = ensureDashboardDateRange();
  if (els.dashboardDateFrom && els.dashboardDateFrom.value !== from) {
    els.dashboardDateFrom.value = from;
  }
  if (els.dashboardDateTo && els.dashboardDateTo.value !== to) {
    els.dashboardDateTo.value = to;
  }

  const lowStockCount = state.inventory.filter((item) => Number(item.quantity) <= Number(item.threshold)).length;
  const ordersInRangeRecords = state.orders.filter((order) => dateInRange(order.createdAt, from, to));
  const ordersInRange = ordersInRangeRecords.length;

  const orderCashTotals = {};
  const orderCardTotals = {};
  for (const order of ordersInRangeRecords) {
    const paymentMethod = getOrderPaymentMethod(order);
    const targetTotals = paymentMethod === 'cash'
      ? orderCashTotals
      : paymentMethod === 'card'
        ? orderCardTotals
        : null;
    if (!targetTotals) continue;

    for (const [currency, amount] of Object.entries(order.totalsByCurrency || {})) {
      targetTotals[currency] = (targetTotals[currency] || 0) + Number(amount || 0);
    }
  }

  const salesInRange = getFinancialRevenueRecords().filter((sale) => dateInRange(sale.createdAt, from, to));
  const saleTotals = {};
  let salesCadTotal = 0;
  for (const sale of salesInRange) {
    salesCadTotal = roundMoney(salesCadTotal + getAmountFromCurrencyTotals(sale.totalsByCurrency, DEFAULT_CURRENCY));
    for (const [currency, amount] of Object.entries(sale.totalsByCurrency || {})) {
      saleTotals[currency] = (saleTotals[currency] || 0) + Number(amount || 0);
    }
  }
  const expensesCadTotal = roundMoney(
    state.accountingCounts.reduce((sum, entry) => {
      const countDate = String(entry.countDate || '').trim() || String(entry.createdAt || '').slice(0, 10);
      if (!dateInRange(countDate, from, to)) return sum;
      return sum + parseAccountingAmount(entry.expenseAmount);
    }, 0),
  );
  const netCadTotal = roundMoney(salesCadTotal - expensesCadTotal);

  const today = todayISODate();
  const latestCashCount = (state.accountingCounts || [])
    .map((entry) => {
      const countDate = String(entry.countDate || '').trim() || String(entry.createdAt || '').slice(0, 10);
      if (!parseISODate(countDate) || countDate > today) return null;
      const createdAtTs = parseTimeStamp(entry.createdAt) || 0;
      return { entry, countDate, createdAtTs };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.countDate !== right.countDate) {
        return left.countDate < right.countDate ? 1 : -1;
      }
      return right.createdAtTs - left.createdAtTs;
    })[0] || null;
  const cashBeforeSales = latestCashCount ? computeAccountingEntryCashTotal(latestCashCount.entry) : null;
  const cashBeforeSalesText = cashBeforeSales === null ? '-' : `${cashBeforeSales.toFixed(2)} ${DEFAULT_CURRENCY}`;
  const cashBeforeSalesMeta = latestCashCount
    ? `Base: ${formatDisplayDate(latestCashCount.countDate)}`
    : 'No accounting count';

  const volunteerUsers = state.users.filter((user) => String(user.role || '').toLowerCase() === 'volunteer');
  const volunteerIds = new Set(volunteerUsers.map((user) => String(user.id || '').trim()).filter(Boolean));
  const nextFourWeekDates = new Set(getNextFourWeeks().flat().map((date) => toISODate(date)));
  const activeVolunteerIds = new Set();
  for (const entry of state.serviceSchedule || []) {
    const date = String(entry?.date || '').slice(0, 10);
    if (!nextFourWeekDates.has(date)) continue;
    for (const userId of (Array.isArray(entry?.assignedUserIds) ? entry.assignedUserIds : [])) {
      const normalizedUserId = String(userId || '').trim();
      if (volunteerIds.has(normalizedUserId)) {
        activeVolunteerIds.add(normalizedUserId);
      }
    }
  }
  const volunteerCount = volunteerUsers.length;
  const activeVolunteerCount = activeVolunteerIds.size;

  els.stats.innerHTML = `
    <article class="stat">
      Low stock (current)
      <strong>${lowStockCount}</strong>
    </article>
    <article class="stat">
      Orders (period)
      <strong>${ordersInRange}</strong>
    </article>
    <article class="stat">
      Sales (period)
      <strong>${moneyTotalsToText(saleTotals)}</strong>
    </article>
    <article class="stat">
      Cash payments (period)
      <strong>${moneyTotalsToText(orderCashTotals)}</strong>
    </article>
    <article class="stat">
      Card payments (period)
      <strong>${moneyTotalsToText(orderCardTotals)}</strong>
    </article>
    <article class="stat">
      Cash-flow before sales (day)
      <strong>${cashBeforeSalesText}</strong>
      <span class="stat-meta muted">${cashBeforeSalesMeta}</span>
    </article>
    <article class="stat">
      Volunteer count
      <strong>${volunteerCount}</strong>
    </article>
    <article class="stat">
      Active volunteers (4 weeks)
      <strong>${activeVolunteerCount}</strong>
    </article>
  `;
  if (els.dashboardRangeLabel) {
    els.dashboardRangeLabel.textContent = `Period: ${formatDisplayDate(from)} -> ${formatDisplayDate(to)} | Net: ${netCadTotal.toFixed(2)} ${DEFAULT_CURRENCY}`;
  }
  renderFinanceChart(from, to);
}

function renderHeader() {
  if (!state.me) return;
  renderOrdersNavBadge();
}

function getActiveOrdersCount() {
  return state.orders.filter((order) => !isOrderArchived(order)).length;
}

function renderOrdersNavBadge(activeCount = null) {
  if (!els.ordersNavBadge) return;
  const nextCount = Number.isFinite(activeCount) ? Math.max(0, activeCount) : getActiveOrdersCount();
  els.ordersNavBadge.textContent = nextCount > 99 ? '99+' : String(nextCount);
  els.ordersNavBadge.classList.toggle('hidden', nextCount <= 0);
}

function renderInventory() {
  if (!els.inventoryBody) return;

  if (!state.inventory.length) {
    els.inventoryBody.innerHTML = '<tr><td colspan="5">No stock item.</td></tr>';
    return;
  }

  els.inventoryBody.innerHTML = state.inventory
    .map((item) => {
      const isLow = Number(item.quantity) <= Number(item.threshold);
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>
            ${item.quantity} ${item.unit}
            <span class="badge ${isLow ? 'warn' : 'ok'}">${isLow ? 'low' : 'ok'}</span>
          </td>
          <td>${item.threshold} ${item.unit}</td>
          <td>
            <button type="button" data-action="edit-stock" data-id="${item.id}">Edit</button>
            <button type="button" class="secondary" data-action="delete-stock" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderProducts() {
  if (els.productsBody) {
    if (!state.products.length) {
      els.productsBody.innerHTML = '<tr><td colspan="4">No product.</td></tr>';
    } else {
      els.productsBody.innerHTML = state.products
        .map((product) => {
          const stockRef = state.inventory.find((inv) => inv.id === product.stockItemId);
          return `
            <tr>
              <td>
                ${product.name}
                <div class="muted">${product.stockUsage || 0} stock unit / sale</div>
              </td>
              <td>${product.category}</td>
              <td>${Number(product.price).toFixed(2)} ${product.currency}</td>
              <td>
                ${stockRef ? `${stockRef.name}` : 'None'}
                <button type="button" class="secondary" data-action="delete-product" data-id="${product.id}">Delete</button>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  const stockOptions = ['<option value="">No stock link</option>']
    .concat(state.inventory.map((item) => `<option value="${item.id}">${item.name}</option>`))
    .join('');
  if (els.productStockLink) {
    els.productStockLink.innerHTML = stockOptions;
  }

  const cartOptions = state.products.length
    ? state.products.map((item) => `<option value="${item.id}">${item.name} - ${Number(item.price).toFixed(2)} ${item.currency}</option>`).join('')
    : '<option value="">No product</option>';
  if (els.cartProduct) {
    els.cartProduct.innerHTML = cartOptions;
  }
}

function renderCart() {
  if (!state.cart.length) {
    els.cartBody.innerHTML = '<tr><td colspan="5">Cart is empty.</td></tr>';
    els.cartTotals.textContent = '-';
    return;
  }

  const totals = {};

  els.cartBody.innerHTML = state.cart
    .map((entry) => {
      const product = state.products.find((item) => item.id === entry.productId);
      if (!product) return '';

      const lineTotal = entry.qty * Number(product.price);
      totals[product.currency] = (totals[product.currency] || 0) + lineTotal;

      return `
        <tr>
          <td>${product.name}</td>
          <td>${entry.qty}</td>
          <td>${Number(product.price).toFixed(2)} ${product.currency}</td>
          <td>${lineTotal.toFixed(2)} ${product.currency}</td>
          <td><button type="button" class="secondary" data-action="remove-cart" data-id="${entry.productId}">Remove</button></td>
        </tr>
      `;
    })
    .join('');

  els.cartTotals.textContent = moneyTotalsToText(totals);
}

function renderSales() {
  if (!state.sales.length) {
    els.salesBody.innerHTML = '<tr><td colspan="3">No sales.</td></tr>';
    return;
  }

  els.salesBody.innerHTML = state.sales
    .slice(0, 20)
    .map((sale) => `
      <tr>
        <td>${formatDateTime(sale.createdAt)}</td>
        <td>${userNameById(sale.createdBy)}</td>
        <td>${moneyTotalsToText(sale.totalsByCurrency)}</td>
      </tr>
    `)
    .join('');
}

function isOrderArchived(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const allDelivered = items.length > 0 && items.every((item) => item.delivered === true);
  return Boolean(order?.archived) || allDelivered;
}

function renderOrderItemPhoto(item) {
  const title = escapeHtml(item.name || 'Article');
  const imageUrl = String(item.imageUrl || '').trim();
  const theme = escapeHtml(item.theme || 'default');

  if (imageUrl) {
    return `<span class="order-item-photo"><img src="${escapeHtml(imageUrl)}" alt="${title}"></span>`;
  }
  return `<span class="order-item-photo order-item-photo-fallback menu-photo-${theme}" aria-hidden="true"></span>`;
}

function renderOrderCard(order, archived) {
  const orderId = escapeHtml(order.id || '');
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const deliveredCount = orderItems.filter((item) => item.delivered === true).length;
  const orderEndAt = getOrderTimerEnd(order);
  const orderBadgeLabel = orderStatusLabel(order, archived);
  const badgeClass = !archived && orderBadgeLabel === 'new' ? 'badge badge-new' : 'badge';
  const elapsedDisplay = formatElapsedTime(order.createdAt, orderEndAt);
  const itemsList = orderItems.length
    ? orderItems
      .map((item) => {
        const lineId = escapeHtml(String(item.lineId || ''));
        const itemName = escapeHtml(item.name || 'Article');
        const qty = Number(item.qty || 0);
        const lineTotal = Number(item.lineTotal || 0);
        const currency = escapeHtml(item.currency || DEFAULT_CURRENCY);
        const delivered = item.delivered === true;

        return `
          <label class="order-item-row ${delivered ? 'delivered' : ''}">
            ${renderOrderItemPhoto(item)}
            <span class="order-item-main">
              <strong>${qty}x ${itemName}</strong>
              <span class="muted">${lineTotal.toFixed(2)} ${currency}</span>
            </span>
            <input
              type="checkbox"
              data-action="order-item-delivered"
              data-order-id="${orderId}"
              data-line-id="${lineId}"
              ${delivered ? 'checked' : ''}
              ${archived ? 'disabled' : ''}
            >
          </label>
        `;
      })
      .join('')
    : '<p class="muted">No item.</p>';

  const orderRef = order.orderNumber ? `#${formatOrderNumber(order.orderNumber)}` : `#${String(order.id || '').slice(0, 6)}`;

  return `
    <article class="order-card ${archived ? 'order-card-archived' : ''}">
      <div class="order-card-head">
        <strong class="order-ref">Order ${orderRef}</strong>
        <div class="order-head-meta">
          <span class="${badgeClass}">${orderBadgeLabel}</span>
          <span class="order-elapsed" data-order-timer data-start-at="${escapeHtml(order.createdAt || '')}" data-end-at="${escapeHtml(orderEndAt || '')}">${elapsedDisplay}</span>
        </div>
      </div>
      <div><strong>Total:</strong> ${moneyTotalsToText(order.totalsByCurrency)}</div>
      <div><strong>Note:</strong> ${order.notes || '-'}</div>
      <div class="muted">Delivered items: ${deliveredCount}/${orderItems.length}</div>
      <div class="order-items-checklist">${itemsList}</div>
    </article>
  `;
}

function renderOrders() {
  const activeOrders = state.orders.filter((order) => !isOrderArchived(order));
  const archivedOrders = state.orders.filter((order) => isOrderArchived(order));
  renderOrdersNavBadge(activeOrders.length);

  if (!activeOrders.length && !archivedOrders.length) {
    if (els.ordersListActive) {
      els.ordersListActive.innerHTML = '<p>No order sent to the team.</p>';
    }
    if (els.ordersListArchive) {
      els.ordersListArchive.innerHTML = '<p>No archived order.</p>';
    }
  } else {
    if (els.ordersListActive) {
      els.ordersListActive.innerHTML = activeOrders.length
        ? activeOrders.map((order) => renderOrderCard(order, false)).join('')
        : '<p>No active order.</p>';
    }

    if (els.ordersListArchive) {
      els.ordersListArchive.innerHTML = archivedOrders.length
        ? archivedOrders.map((order) => renderOrderCard(order, true)).join('')
        : '<p>No archived order.</p>';
    }
  }

  const tab = state.ordersTab === 'archive' ? 'archive' : 'active';
  if (els.ordersTabActive) {
    els.ordersTabActive.textContent = `Active (${activeOrders.length})`;
    els.ordersTabActive.classList.toggle('active', tab === 'active');
  }
  if (els.ordersTabArchive) {
    els.ordersTabArchive.textContent = `Archive (${archivedOrders.length})`;
    els.ordersTabArchive.classList.toggle('active', tab === 'archive');
  }
  if (els.ordersListActive) {
    els.ordersListActive.classList.toggle('hidden', tab !== 'active');
  }
  if (els.ordersListArchive) {
    els.ordersListArchive.classList.toggle('hidden', tab !== 'archive');
  }
  updateOrderTimers();
}

function renderAccountingFormRows() {
  if (!els.accountingCoinsBody || !els.accountingBillsBody) return;
  if (els.accountingCoinsBody.dataset.ready === '1' && els.accountingBillsBody.dataset.ready === '1') return;

  const renderRows = (type) => ACCOUNTING_DENOMINATIONS
    .filter((line) => line.type === type)
    .map((line) => `
      <tr data-accounting-line-id="${line.id}">
        <td data-label="Denomination">${line.label}</td>
        <td data-label="Quantity">
          <input
            type="number"
            min="0"
            step="1"
            name="count_${line.id}"
            value="0"
            data-action="accounting-count-change"
          >
        </td>
        <td data-label="Subtotal"><span data-accounting-subtotal="${line.id}">0.00 ${DEFAULT_CURRENCY}</span></td>
      </tr>
    `)
    .join('');

  els.accountingCoinsBody.innerHTML = renderRows('coin');
  els.accountingBillsBody.innerHTML = renderRows('bill');
  els.accountingCoinsBody.dataset.ready = '1';
  els.accountingBillsBody.dataset.ready = '1';
}

function updateAccountingTotals() {
  if (!els.accountingForm || !els.accountingTotal) return;
  const lines = getAccountingLinesFromForm();
  const total = computeAccountingTotal(lines);
  const coinsTotal = roundMoney(lines
    .filter((line) => line.type === 'coin')
    .reduce((sum, line) => sum + Number(line.subtotal || 0), 0));
  const billsTotal = roundMoney(lines
    .filter((line) => line.type === 'bill')
    .reduce((sum, line) => sum + Number(line.subtotal || 0), 0));
  const electronic = getElectronicPaymentsFromForm();
  const electronicTotal = roundMoney(Number(electronic.visaAmount || 0) + Number(electronic.creditAmount || 0));
  const expenseTotal = getAccountingExpenseFromForm();

  for (const line of lines) {
    const subtotalEl = els.accountingForm?.querySelector(`[data-accounting-subtotal="${line.id}"]`);
    if (subtotalEl) {
      subtotalEl.textContent = `${line.subtotal.toFixed(2)} ${DEFAULT_CURRENCY}`;
    }
  }

  if (els.accountingCoinsTotal) {
    els.accountingCoinsTotal.textContent = `${coinsTotal.toFixed(2)} ${DEFAULT_CURRENCY}`;
  }
  if (els.accountingBillsTotal) {
    els.accountingBillsTotal.textContent = `${billsTotal.toFixed(2)} ${DEFAULT_CURRENCY}`;
  }
  if (els.accountingElectronicTotal) {
    els.accountingElectronicTotal.textContent = `${electronicTotal.toFixed(2)} ${DEFAULT_CURRENCY}`;
  }
  if (els.accountingExpenseTotal) {
    els.accountingExpenseTotal.textContent = `${expenseTotal.toFixed(2)} ${DEFAULT_CURRENCY}`;
  }

  els.accountingTotal.textContent = `${total.toFixed(2)} ${DEFAULT_CURRENCY}`;
}

function renderAccountingHistory() {
  if (!els.accountingHistoryBody) return;

  if (!state.accountingCounts.length) {
    els.accountingHistoryBody.innerHTML = '<p class="muted accounting-archive-empty">No count yet.</p>';
    return;
  }

  const historyEntries = state.accountingCounts.slice(0, 30);

  els.accountingHistoryBody.innerHTML = historyEntries
    .map((entry, index) => {
      const currency = escapeHtml(entry.currency || DEFAULT_CURRENCY);
      const rawSummary = String(entry.summary || '').trim();
      const cleanedSummary = rawSummary
        .replace(/(?:\s*\|\s*)?Visa:\s*[^|]+/gi, '')
        .replace(/(?:\s*\|\s*)?Credit:\s*[^|]+/gi, '')
        .replace(/(?:\s*\|\s*)?Expense:\s*[^|]+/gi, '')
        .replace(/\s*\|\s*\|\s*/g, ' | ')
        .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
        .trim();
      const baseSummary = cleanedSummary
        || (Array.isArray(entry.lines)
          ? entry.lines
            .filter((line) => Number(line.count || 0) > 0)
            .slice(0, 6)
            .map((line) => `${Number(line.count || 0)}x ${escapeHtml(line.label || '')}`)
            .join(', ')
          : '');
      const visaAmount = parseAccountingAmount(entry?.electronicPayments?.visaAmount);
      const creditAmount = parseAccountingAmount(entry?.electronicPayments?.creditAmount);
      const expenseAmount = parseAccountingAmount(entry?.expenseAmount);
      const countDate = String(entry.countDate || '').trim() || String(entry.createdAt || '').slice(0, 10);
      const countedBy = escapeHtml(entry.countedBy || '-');
      const verifiedBy = escapeHtml(entry.verifiedBy || '-');
      const entryId = escapeHtml(entry.id || '');
      const opened = index === 0 ? 'open' : '';
      const currentTotal = computeAccountingEntryCashTotal(entry);
      const previousEntry = historyEntries[index + 1] || null;
      const previousTotal = previousEntry ? computeAccountingEntryCashTotal(previousEntry) : 0;
      const cashBenefit = roundMoney(currentTotal - previousTotal);
      const cashBenefitText = `${cashBenefit >= 0 ? '+' : ''}${cashBenefit.toFixed(2)} ${currency}`;
      const cashBenefitClass = cashBenefit === 0
        ? 'is-neutral'
        : `${cashBenefit >= 0 ? 'is-positive' : 'is-negative'}`;

      return `
        <details class="accounting-archive-item" ${opened}>
          <summary class="accounting-archive-summary">
            <span class="accounting-archive-main">
              <strong>${formatDisplayDate(countDate)}</strong>
              <span class="muted">${formatDateTime(entry.createdAt)}</span>
            </span>
            <span class="accounting-archive-head-actions">
              <span class="accounting-archive-amounts">
                <strong class="accounting-archive-profit-value ${cashBenefitClass}">${cashBenefitText}</strong>
                <strong class="accounting-archive-total">${currentTotal.toFixed(2)} ${currency}</strong>
              </span>
              <button
                type="button"
                class="accounting-archive-action accounting-archive-edit"
                data-action="edit-accounting-entry"
                data-entry-id="${entryId}"
                aria-label="Edit count"
                title="Edit count"
              >
                &#9998;
              </button>
              <button
                type="button"
                class="accounting-archive-action accounting-archive-delete"
                data-action="delete-accounting-entry"
                data-entry-id="${entryId}"
                aria-label="Delete count"
                title="Delete count"
              >
                &#10005;
              </button>
              <button
                type="button"
                class="accounting-archive-action accounting-archive-download"
                data-action="download-accounting-entry"
                data-entry-id="${entryId}"
                aria-label="Download PDF"
                title="Download PDF"
              >
                &#8681;
              </button>
            </span>
          </summary>
          <div class="accounting-archive-body">
            <div class="accounting-archive-signers">
              <p><span class="muted">Signed by:</span> <strong>${countedBy}</strong></p>
              <p><span class="muted">Verified by:</span> <strong>${verifiedBy}</strong></p>
            </div>
            <p class="accounting-signature-check"><span class="muted">Signature</span> <span aria-hidden="true">&#10003;</span></p>
            <p class="accounting-archive-finance"><span class="muted">Visa:</span> <strong>${visaAmount.toFixed(2)} ${currency}</strong></p>
            <p class="accounting-archive-finance"><span class="muted">Credit:</span> <strong>${creditAmount.toFixed(2)} ${currency}</strong></p>
            <p class="accounting-archive-finance"><span class="muted">Expense:</span> <strong>${expenseAmount.toFixed(2)} ${currency}</strong></p>
            <p class="accounting-archive-detail"><span class="muted">Details:</span> ${escapeHtml(baseSummary || '-')}</p>
          </div>
        </details>
      `;
    })
    .join('');
}

function renderAccounting() {
  if (!els.accountingForm) return;

  renderAccountingFormRows();
  updateAccountingTotals();
  if (state.accountingEditingEntryId) {
    const stillExists = state.accountingCounts.some((entry) => String(entry.id || '') === state.accountingEditingEntryId);
    if (!stillExists) {
      state.accountingEditingEntryId = null;
    }
  }
  updateAccountingSubmitButton();

  if (state.me && !els.accountingForm.elements.countedBy.value) {
    els.accountingForm.elements.countedBy.value = state.me.name || '';
  }
  if (!els.accountingForm.elements.countDate.value) {
    els.accountingForm.elements.countDate.value = todayISODate();
  }

  renderAccountingHistory();
}

function renderMenuCards(items) {
  if (!items.length) {
    return '<p class="menu-empty">No item in this section.</p>';
  }

  return items
    .map((item) => {
      const title = escapeHtml(item.name);
      const theme = escapeHtml(item.theme || 'default');
      const section = item.section === 'drink' ? 'drink' : 'food';
      const imageUrl = String(item.imageUrl || '').trim();
      const quantity = Number(item.quantity || 0);
      const isOutOfStock = !Number.isFinite(quantity) || quantity <= 0;
      const isUnavailable = !state.menuEditMode && isOutOfStock;
      const imageBlock = imageUrl
        ? `<div class="menu-photo-image"><img src="${escapeHtml(imageUrl)}" alt="${title}"></div>`
        : `<div class="menu-photo menu-photo-${theme}" aria-hidden="true"></div>`;
      const cardClass = [
        'menu-product-card',
        state.menuEditMode ? 'menu-draggable' : 'menu-selectable',
        isOutOfStock ? 'menu-zero-stock' : '',
        isUnavailable ? 'menu-unavailable' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const dragAttributes = state.menuEditMode ? 'draggable="true"' : '';
      const dragHandle = state.menuEditMode ? '<span class="menu-drag-handle" aria-hidden="true">&#8942;&#8942;</span>' : '';
      const bestsellerBadge = item.bestseller
        ? '<span class="menu-badge menu-badge-bestseller">Bestseller</span>'
        : '';
      const unavailableBadge = isUnavailable
        ? '<span class="menu-badge menu-badge-unavailable">Out of stock</span>'
        : '';

      const editBlock = state.menuEditMode
        ? `
          <form class="menu-edit-form" data-menu-item-id="${item.id}">
            <div class="menu-photo-wrap">
              ${imageBlock}
              ${dragHandle}
              ${bestsellerBadge}
              <div class="menu-image-actions menu-image-actions-overlay">
                <label class="menu-image-upload-btn" title="Upload image" aria-label="Upload image">
                  <span aria-hidden="true">&#10515;</span>
                  <input type="file" name="imageFile" accept="image/*">
                </label>
                <button
                  type="button"
                  class="secondary menu-image-clear-btn"
                  data-action="toggle-clear-image"
                  title="Remove current image"
                  aria-label="Remove current image"
                >
                  &#10005;
                </button>
                <input type="hidden" name="clearImage" value="0">
              </div>
            </div>
            <div class="menu-meta menu-meta-edit">
              <div class="menu-meta-main">
                <input class="menu-inline-name" type="text" name="name" value="${title}" required>
                <div class="menu-inline-submeta">
                  <label class="menu-inline-section">
                    <span>Category</span>
                    <select name="section" required>
                      <option value="food" ${section === 'food' ? 'selected' : ''}>Food & Snack</option>
                      <option value="drink" ${section === 'drink' ? 'selected' : ''}>Pop & Drink</option>
                    </select>
                  </label>
                  <label class="menu-inline-bestseller">
                    <input type="checkbox" name="bestseller" ${item.bestseller ? 'checked' : ''}>
                    <span>Badge bestseller</span>
                  </label>
                </div>
              </div>
              <div class="menu-meta-values menu-meta-values-edit">
                <label class="menu-inline-field">
                  <span>Price</span>
                  <input type="number" step="0.5" min="0" name="price" value="${Number(item.price || 0)}" required>
                </label>
                <label class="menu-inline-field">
                  <span>Qty</span>
                  <input type="number" step="1" min="0" name="quantity" value="${Number(item.quantity || 0)}" required>
                </label>
              </div>
            </div>
          </form>
        `
        : `
          <div class="menu-photo-wrap">
            ${imageBlock}
            ${bestsellerBadge}
            ${unavailableBadge}
          </div>
          <div class="menu-meta">
            <div class="menu-meta-main">
              <strong>${title}</strong>
              <span class="menu-category">${menuSectionLabel(section)}</span>
            </div>
            <div class="menu-meta-values">
              <span class="menu-price">${formatMenuPrice(item)}</span>
              <span class="menu-qty">${formatMenuQuantity(item)}</span>
            </div>
          </div>
        `;

      return `
        <article
          class="${cardClass}"
          data-menu-item-id="${item.id}"
          data-menu-section="${section}"
          data-menu-unavailable="${isUnavailable ? '1' : '0'}"
          ${dragAttributes}
        >
          ${editBlock}
        </article>
      `;
    })
    .join('');
}

function renderMenu() {
  if (state.menuCustomerMode && state.menuEditMode) {
    state.menuEditMode = false;
  }

  if (els.menuView) {
    els.menuView.classList.toggle('menu-edit-mode', state.menuEditMode);
  }

  const foodItems = state.menuItems.filter((item) => item.section === 'food');
  const drinkItems = state.menuItems.filter((item) => item.section === 'drink');

  els.menuFoodGrid.innerHTML = renderMenuCards(foodItems);
  els.menuDrinkGrid.innerHTML = renderMenuCards(drinkItems);

  const customerModeActive = state.menuCustomerMode;
  const canShowEditControls = !customerModeActive;

  if (els.menuEditToggle) {
    els.menuEditToggle.classList.toggle('hidden', !canShowEditControls);
    els.menuEditToggle.classList.toggle('active', state.menuEditMode);
    els.menuEditToggle.innerHTML = '<span aria-hidden="true">&#9998;</span>';
    const editLabel = state.menuEditMode ? 'Close edit' : 'Edit';
    els.menuEditToggle.setAttribute('aria-label', editLabel);
    els.menuEditToggle.setAttribute('title', editLabel);
  }

  if (els.menuCustomerToggle) {
    els.menuCustomerToggle.classList.toggle('active', customerModeActive);
    els.menuCustomerToggle.setAttribute('aria-pressed', customerModeActive ? 'true' : 'false');
  }

  if (els.menuSaveAllBtn) {
    els.menuSaveAllBtn.classList.toggle('hidden', !state.menuEditMode || !canShowEditControls);
  }
  if (els.menuAddSection) {
    els.menuAddSection.classList.toggle('hidden', !state.menuEditMode || !canShowEditControls);
  }
  if (els.menuAddItemBtn) {
    els.menuAddItemBtn.classList.toggle('hidden', !state.menuEditMode || !canShowEditControls);
  }

  if (!state.menuEditMode) {
    menuDraggedItemId = null;
  }

  applyMenuCustomerModeState();
}

function renderSidebarOrder() {
  const orderUIs = [
    {
      card: els.sidebarOrderCard,
      items: els.sidebarOrderItems,
      total: els.sidebarOrderTotal,
      number: els.sidebarOrderNumber,
    },
    {
      card: els.mobileSidebarOrderCard,
      items: els.mobileSidebarOrderItems,
      total: els.mobileSidebarOrderTotal,
      number: els.mobileSidebarOrderNumber,
    },
  ].filter((ui) => ui.items && ui.total);

  if (!orderUIs.length) return;
  applySidebarOrderCollapsedState();

  const nextOrderLabel = `#${formatOrderNumber(getNextOrderNumber())}`;
  orderUIs.forEach((ui) => {
    if (ui.number) ui.number.textContent = nextOrderLabel;
  });

  const previousMenuCartSignature = JSON.stringify(state.menuCart || []);
  state.menuCart = state.menuCart
    .map((entry) => {
      const menuItemId = String(entry.menuItemId || '');
      const item = findMenuItemById(menuItemId);
      const qty = Number(entry.qty || 0);
      const roundedQty = Math.max(0, Math.round(qty));

      return { menuItemId, qty: roundedQty };
    })
    .filter((entry) => entry.menuItemId && Number.isFinite(entry.qty) && entry.qty > 0 && findMenuItemById(entry.menuItemId));
  const nextMenuCartSignature = JSON.stringify(state.menuCart || []);
  if (nextMenuCartSignature !== previousMenuCartSignature) {
    scheduleMenuDraftSync();
  }

  const sharedMenuCart = getCombinedMenuCart();
  const hasSelectedItems = sharedMenuCart.length > 0;
  orderUIs.forEach((ui) => {
    if (ui.card) ui.card.classList.toggle('sidebar-order-active', hasSelectedItems);
  });

  if (!sharedMenuCart.length) {
    orderUIs.forEach((ui) => {
      ui.items.innerHTML = '<p class="muted">No item selected.</p>';
      ui.total.textContent = `0.00 ${DEFAULT_CURRENCY}`;
    });
    return;
  }

  let total = 0;
  const itemsMarkup = sharedMenuCart
    .map((entry) => {
      const item = findMenuItemById(entry.menuItemId);
      if (!item) return '';
      const unitPrice = Number(item.price || 0);
      const lineTotal = unitPrice * entry.qty;
      total += lineTotal;
      const title = escapeHtml(item.name);

      return `
        <div class="sidebar-order-item">
          <div class="sidebar-order-item-top">
            <strong>${title}</strong>
            <span>${lineTotal.toFixed(2)} ${DEFAULT_CURRENCY}</span>
          </div>
          <div class="sidebar-order-item-controls">
            <button type="button" class="secondary" data-action="sidebar-order-dec" data-menu-item-id="${item.id}">-</button>
            <span>${entry.qty}</span>
            <button type="button" class="secondary" data-action="sidebar-order-inc" data-menu-item-id="${item.id}">+</button>
            <button type="button" class="secondary" data-action="sidebar-order-remove" data-menu-item-id="${item.id}">Remove</button>
          </div>
        </div>
      `;
    })
    .join('');

  orderUIs.forEach((ui) => {
    ui.items.innerHTML = itemsMarkup;
    ui.total.textContent = `${total.toFixed(2)} ${DEFAULT_CURRENCY}`;
  });
}

function getPlanningTeamUsers() {
  return [...state.users]
    .filter((user) => user && user.id)
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'fr'));
}

function getServiceAssignedUserIds(date) {
  if (!date) return [];
  const entry = state.serviceSchedule.find((item) => item.date === date);
  if (!entry || !Array.isArray(entry.assignedUserIds)) return [];
  return Array.from(new Set(entry.assignedUserIds.map((id) => String(id || '').trim()).filter(Boolean)));
}

function applyServiceScheduleEntry(entry) {
  const index = state.serviceSchedule.findIndex((item) => item.date === entry.date);
  if (index >= 0) {
    state.serviceSchedule[index] = entry;
  } else {
    state.serviceSchedule.push(entry);
  }
}

async function saveServiceAssignments(date, assignedUserIds, toastMessage) {
  const normalizedDate = String(date || '').trim();
  if (!normalizedDate) {
    showToast('Select a day');
    return false;
  }

  const normalizedAssigned = Array.from(new Set((assignedUserIds || []).map((id) => String(id || '').trim()).filter(Boolean)));

  try {
    const response = await api(`/api/service-schedule/${normalizedDate}`, {
      method: 'PUT',
      body: { assignedUserIds: normalizedAssigned },
    });

    if (response?.entry?.date) {
      applyServiceScheduleEntry(response.entry);
    }
    renderServiceSchedule();
    renderStats();
    if (toastMessage) {
      showToast(toastMessage);
    }
    return true;
  } catch (err) {
    showToast(err.message);
    return false;
  }
}

function renderServiceSchedule() {
  const weeks = getNextFourWeeks();
  const visibleDates = weeks.flat().map((date) => toISODate(date));
  const visibleDateSet = new Set(visibleDates);
  const scheduleByDate = new Map((state.serviceSchedule || []).map((entry) => [entry.date, entry]));
  const editMode = state.planningEditMode === true;
  const drawerOpen = editMode && state.serviceDrawerOpen === true;

  if (!state.selectedServiceDate || !visibleDateSet.has(state.selectedServiceDate)) {
    const today = todayISODate();
    state.selectedServiceDate = visibleDateSet.has(today) ? today : visibleDates[0];
  }

  if (els.planningEditToggle) {
    els.planningEditToggle.classList.toggle('active', editMode);
    els.planningEditToggle.textContent = editMode ? 'Close edit' : 'Edit planning';
  }

  els.serviceWeeks.innerHTML = weeks
    .map((days) => {
      const weekStart = toISODate(days[0]);
      const weekEnd = toISODate(days[6]);
      const weekLabel = `${parseISODate(weekStart).toLocaleDateString('en-CA', { day: 'numeric', month: 'short' })} - ${parseISODate(weekEnd).toLocaleDateString('en-CA', { day: 'numeric', month: 'short' })}`;

      const dayButtons = days
        .map((day) => {
          const date = toISODate(day);
          const entry = scheduleByDate.get(date);
          const assignedUserIds = Array.isArray(entry?.assignedUserIds) ? entry.assignedUserIds : [];
          const assignedNames = assignedUserIds
            .map((userId) => userNameById(userId))
            .filter((name) => name !== 'N/A')
            .map((name) => escapeHtml(name));
          const selectedClass = drawerOpen && state.selectedServiceDate === date ? 'selected' : '';
          const dayLabel = day.toLocaleDateString('en-CA', { weekday: 'short' });
          const dateLabel = day.toLocaleDateString('en-CA', { day: '2-digit', month: '2-digit' });
          const serviceSummary = assignedNames.length ? `<span class="service-day-assignees">${assignedNames.join(', ')}</span>` : '';

          return `
            <button type="button" class="service-day ${selectedClass}" data-action="select-service-day" data-date="${date}" ${editMode ? '' : 'disabled'}>
              <span class="service-day-top">${dayLabel}</span>
              <span class="service-day-date">${dateLabel}</span>
              ${serviceSummary}
            </button>
          `;
        })
        .join('');

      return `
        <article class="service-week">
          <h4>Week: ${weekLabel}</h4>
          <div class="service-day-grid">
            ${dayButtons}
          </div>
        </article>
      `;
    })
    .join('');

  if (
    !els.serviceDrawer
    || !els.serviceDrawerBackdrop
    || !els.serviceDrawerTitle
    || !els.serviceVolunteerSelect
    || !els.serviceVolunteerAssign
    || !els.serviceAssignedList
  ) {
    return;
  }

  const selectedDate = state.selectedServiceDate;
  if (!drawerOpen || !selectedDate) {
    els.serviceDrawer.classList.remove('open');
    els.serviceDrawerBackdrop.classList.remove('open');
    els.serviceDrawer.setAttribute('aria-hidden', 'true');
    return;
  }

  const teamUsers = getPlanningTeamUsers();
  const assignedUserIds = getServiceAssignedUserIds(selectedDate).filter((userId) => teamUsers.some((user) => user.id === userId));
  const assignedSet = new Set(assignedUserIds);
  const availableUsers = teamUsers.filter((user) => !assignedSet.has(user.id));

  els.serviceDrawer.dataset.date = selectedDate;
  els.serviceDrawerTitle.textContent = `Service assignment: ${formatDisplayDate(selectedDate)}`;
  els.serviceVolunteerSelect.innerHTML = availableUsers.length
    ? ['<option value="">Choose a person</option>']
      .concat(availableUsers.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`))
      .join('')
    : '<option value="">-</option>';
  els.serviceVolunteerSelect.disabled = availableUsers.length === 0;
  els.serviceVolunteerAssign.disabled = availableUsers.length === 0;

  els.serviceAssignedList.innerHTML = assignedUserIds
    .map((userId) => {
      const user = teamUsers.find((entry) => entry.id === userId);
      if (!user) return '';
      return `
        <div class="service-assigned-item">
          <span>${escapeHtml(user.name)}</span>
          <button type="button" class="secondary service-assigned-remove" data-action="remove-service-user" data-user-id="${user.id}">Remove</button>
        </div>
      `;
    })
    .join('');

  els.serviceDrawer.classList.add('open');
  els.serviceDrawerBackdrop.classList.add('open');
  els.serviceDrawer.setAttribute('aria-hidden', 'false');
}

function renderTasks() {
  const assigneeOptions = ['<option value="">Unassigned</option>']
    .concat(state.users.map((user) => `<option value="${user.id}">${user.name}</option>`))
    .join('');
  els.taskAssignee.innerHTML = assigneeOptions;

  if (!state.tasks.length) {
    els.tasksBody.innerHTML = '<tr><td colspan="5">No task.</td></tr>';
    return;
  }

  els.tasksBody.innerHTML = state.tasks
    .map((task) => {
      const statusOptions = ['todo', 'in_progress', 'done']
        .map((status) => `<option value="${status}" ${task.status === status ? 'selected' : ''}>${status}</option>`)
        .join('');

      return `
        <tr>
          <td>${task.date} ${task.start}-${task.end}</td>
          <td>
            <strong>${task.title}</strong>
            <div class="muted">${task.description || '-'}</div>
          </td>
          <td>${userNameById(task.assignedTo)}</td>
          <td>
            <select data-action="task-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
          </td>
          <td>
            <button type="button" class="secondary" data-action="delete-task" data-task-id="${task.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderNotificationPreference() {
  if (!els.profileNotifToggle || !els.profileNotifStatus) return;

  const setNotifVisualState = (stateLabel) => {
    const label = els.profileNotifToggle.closest('.notif-toggle');
    if (!label) return;
    label.classList.remove('is-on', 'is-off', 'is-waiting', 'is-disabled');
    label.classList.add(`is-${stateLabel}`);
  };

  if (!('Notification' in window)) {
    els.profileNotifToggle.checked = false;
    els.profileNotifToggle.disabled = true;
    els.profileNotifStatus.textContent = 'Notifications are not supported in this browser';
    setNotifVisualState('disabled');
    return;
  }

  els.profileNotifToggle.disabled = false;
  if (Notification.permission === 'denied') {
    state.pushNotificationsEnabled = false;
    savePushPreference(false);
    els.profileNotifToggle.checked = false;
    els.profileNotifStatus.textContent = 'Blocked by browser';
    setNotifVisualState('disabled');
    return;
  }

  els.profileNotifToggle.checked = state.pushNotificationsEnabled;

  if (Notification.permission === 'granted' && state.pushNotificationsEnabled) {
    els.profileNotifStatus.textContent = 'Active';
    setNotifVisualState('on');
    return;
  }

  if (state.pushNotificationsEnabled) {
    els.profileNotifStatus.textContent = 'Waiting for permission';
    setNotifVisualState('waiting');
    return;
  }

  els.profileNotifStatus.textContent = 'Disabled';
  setNotifVisualState('off');
}

function renderProfile() {
  if (!state.me) return;
  els.profileForm.elements.name.value = state.me.name || '';
  els.profileForm.elements.email.value = state.me.email || '';
  els.profileForm.elements.phone.value = state.me.phone || '';
  els.profileForm.elements.preferredCurrency.value = state.me.preferredCurrency || DEFAULT_CURRENCY;
  renderNotificationPreference();
}

function renderAll() {
  renderHeader();
  renderNotifications();
  renderStats();
  renderMenu();
  renderSidebarOrder();
  renderInventory();
  renderProducts();
  renderCart();
  renderSales();
  renderOrders();
  renderAccounting();
  renderServiceSchedule();
  renderTasks();
  renderProfile();
}

function getOrdersRealtimeSignature(orders) {
  try {
    return JSON.stringify(Array.isArray(orders) ? orders : []);
  } catch {
    return String(Date.now());
  }
}

function applyOrdersFromRealtime(nextOrders, { forceRender = false } = {}) {
  const normalizedOrders = Array.isArray(nextOrders) ? nextOrders : [];
  const nextSignature = getOrdersRealtimeSignature(normalizedOrders);
  const shouldRender = forceRender || nextSignature !== ordersRealtimeSignature;

  state.orders = normalizedOrders;
  ordersRealtimeSignature = nextSignature;

  if (!shouldRender) return false;
  renderOrders();
  renderStats();
  renderSidebarOrder();
  return true;
}

async function syncOrdersFromServer() {
  if (!state.me || ordersRealtimePollInFlight) return;
  ordersRealtimePollInFlight = true;
  try {
    const response = await api('/api/orders');
    applyOrdersFromRealtime(response.orders || []);
  } catch {
    // silent fallback: SSE might still be active
  } finally {
    ordersRealtimePollInFlight = false;
  }
}

function stopOrdersRealtimePolling() {
  if (ordersRealtimePollTimer) {
    clearInterval(ordersRealtimePollTimer);
    ordersRealtimePollTimer = null;
  }
  ordersRealtimePollInFlight = false;
}

function startOrdersRealtimePolling() {
  stopOrdersRealtimePolling();
  if (!state.me) return;

  void syncOrdersFromServer();
  ordersRealtimePollTimer = setInterval(() => {
    void syncOrdersFromServer();
  }, ORDERS_REALTIME_POLL_MS);
}

async function refreshAllData() {
  const [usersRes, menuItemsRes, inventoryRes, productsRes, salesRes, ordersRes, accountingRes, serviceScheduleRes, tasksRes, menuDraftsRes] = await Promise.all([
    api('/api/users'),
    api('/api/menu-items'),
    api('/api/inventory'),
    api('/api/products'),
    api('/api/sales'),
    api('/api/orders'),
    api('/api/accounting-counts'),
    api('/api/service-schedule'),
    api('/api/tasks'),
    api('/api/menu-drafts'),
  ]);

  state.users = usersRes.users || [];
  state.menuItems = menuItemsRes.menuItems || [];
  state.inventory = inventoryRes.inventory || [];
  state.products = productsRes.products || [];
  state.sales = salesRes.sales || [];
  state.orders = ordersRes.orders || [];
  ordersRealtimeSignature = getOrdersRealtimeSignature(state.orders);
  state.accountingCounts = accountingRes.accountingCounts || [];
  state.serviceSchedule = serviceScheduleRes.serviceSchedule || [];
  state.tasks = tasksRes.tasks || [];
  state.menuDrafts = menuDraftsRes.menuDrafts || [];
  applyLocalMenuDraftFromSharedState();
  menuDraftLastSyncedSignature = menuDraftSignature(getMenuDraftPayload());
  pendingMenuDraftSync = null;
}

function connectEvents() {
  if (eventSource) eventSource.close();

  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('users:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.users = payload.users || [];
    renderAll();
  });

  eventSource.addEventListener('menu-items:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.menuItems = payload.menuItems || [];
    renderAll();
  });

  eventSource.addEventListener('inventory:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.inventory = payload.inventory || [];
    renderAll();
  });

  eventSource.addEventListener('products:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.products = payload.products || [];
    renderAll();
  });

  eventSource.addEventListener('sales:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.sales = payload.sales || [];
    renderAll();
  });

  eventSource.addEventListener('orders:updated', (event) => {
    const payload = JSON.parse(event.data);
    applyOrdersFromRealtime(payload.orders || []);
  });

  eventSource.addEventListener('accounting:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.accountingCounts = payload.accountingCounts || [];
    renderAll();
  });

  eventSource.addEventListener('service-schedule:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.serviceSchedule = payload.serviceSchedule || [];
    renderAll();
  });

  eventSource.addEventListener('tasks:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.tasks = payload.tasks || [];
    renderAll();
  });

  eventSource.addEventListener('menu-drafts:updated', (event) => {
    const payload = JSON.parse(event.data);
    state.menuDrafts = payload.menuDrafts || [];
    renderSidebarOrder();
  });

  eventSource.addEventListener('notify', (event) => {
    const payload = JSON.parse(event.data);
    addNotification(payload.message, true);
  });

  eventSource.onerror = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    setTimeout(() => {
      if (state.me) connectEvents();
    }, 2500);
  };
}

async function bootstrapSession() {
  try {
    const meRes = await api('/api/me');
    state.me = meRes.user;
    await refreshAllData();
    showApp();
    state.currentView = 'menu';
    setView('menu');
    connectEvents();
    renderAll();
  } catch {
    showAuth();
  }
}

async function handleAuth(form, endpoint) {
  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());

  const res = await api(endpoint, {
    method: 'POST',
    body,
  });

  state.me = res.user;
  await refreshAllData();
  showApp();
  state.currentView = 'menu';
  setView('menu');
  connectEvents();
  renderAll();
}

function setAuthSubmitLoading(form, isLoading) {
  if (!form) return;
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = Boolean(isLoading);
  submitButton.classList.toggle('is-loading', Boolean(isLoading));
  submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function getCartPayload() {
  return state.cart.map((entry) => ({ productId: entry.productId, qty: entry.qty }));
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === '1') return;
  form.dataset.submitting = '1';
  setAuthSubmitLoading(form, true);

  try {
    await handleAuth(form, '/api/login');
    form.reset();
    addNotification('Signed in successfully');
  } catch (err) {
    showToast(err.message);
  } finally {
    form.dataset.submitting = '0';
    setAuthSubmitLoading(form, false);
  }
});

document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === '1') return;
  form.dataset.submitting = '1';
  setAuthSubmitLoading(form, true);

  try {
    await handleAuth(form, '/api/register');
    form.reset();
    addNotification('Account created and signed in');
  } catch (err) {
    showToast(err.message);
  } finally {
    form.dataset.submitting = '0';
    setAuthSubmitLoading(form, false);
  }
});

const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.submitting === '1') return;

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const newPassword = String(formData.get('newPassword') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (!email || !newPassword) {
      showToast('Email and new password are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Password confirmation does not match');
      return;
    }

    form.dataset.submitting = '1';
    setAuthSubmitLoading(form, true);

    try {
      await api('/api/forgot-password', {
        method: 'POST',
        body: { email, newPassword },
      });
      form.reset();
      showToast('Password reset done. You can sign in now.');
      const loginForm = document.getElementById('login-form');
      if (loginForm?.elements?.email && !String(loginForm.elements.email.value || '').trim()) {
        loginForm.elements.email.value = email;
      }
      setAuthSlide('login');
    } catch (err) {
      showToast(err.message);
    } finally {
      form.dataset.submitting = '0';
      setAuthSubmitLoading(form, false);
    }
  });
}

if (els.authSection) {
  els.authSection.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action="switch-auth-slide"]');
    if (!trigger) return;
    event.preventDefault();
    setAuthSlide(trigger.dataset.authSlide || 'login');
  });
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } catch {
    // no-op
  }
  showAuth();
  state.cart = [];
  state.menuCart = [];
  clearOrderNoteValue();
  renderCart();
  renderSidebarOrder();
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    if (!view) return;
    setView(view);
  });
});

if (els.adminNavToggle) {
  els.adminNavToggle.addEventListener('click', () => {
    if (!state.adminUnlocked) {
      const unlocked = requestAdminUnlock();
      if (!unlocked) return;
    }
    state.adminNavOpen = !state.adminNavOpen;
    updateAdminNavState();
  });
}

if (els.mobileNavToggle) {
  els.mobileNavToggle.addEventListener('click', () => {
    state.mobileNavOpen = !state.mobileNavOpen;
    applyMobileNavState();
  });
}

if (els.mobileNavBackdrop) {
  els.mobileNavBackdrop.addEventListener('click', () => {
    state.mobileNavOpen = false;
    applyMobileNavState();
  });
}

if (els.dashboardDateFrom) {
  els.dashboardDateFrom.addEventListener('change', () => {
    applyDashboardRangeFromInputs();
    renderStats();
  });
}

if (els.dashboardDateTo) {
  els.dashboardDateTo.addEventListener('change', () => {
    applyDashboardRangeFromInputs();
    renderStats();
  });
}

if (els.dashboardRangeReset) {
  els.dashboardRangeReset.addEventListener('click', () => {
    const defaults = getDefaultDashboardRange();
    state.dashboardDateFrom = defaults.from;
    state.dashboardDateTo = defaults.to;
    renderStats();
  });
}

if (els.planningEditToggle) {
  els.planningEditToggle.addEventListener('click', () => {
    state.planningEditMode = !state.planningEditMode;
    state.serviceDrawerOpen = false;
    renderServiceSchedule();
  });
}

if (els.paymentModalCancel) {
  els.paymentModalCancel.addEventListener('click', () => closePaymentModal(null));
}

if (els.paymentModalConfirm) {
  els.paymentModalConfirm.addEventListener('click', () => {
    const selectedMethod = els.paymentModalMethodCard?.checked ? 'card' : 'cash';
    closePaymentModal(selectedMethod);
  });
}

if (els.paymentModal) {
  els.paymentModal.addEventListener('click', (event) => {
    if (event.target === els.paymentModal) {
      closePaymentModal(null);
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (els.paymentModal && !els.paymentModal.classList.contains('hidden')) {
    closePaymentModal(null);
    return;
  }
  if (state.serviceDrawerOpen) {
    state.serviceDrawerOpen = false;
    renderServiceSchedule();
    return;
  }
  if (state.mobileNavOpen) {
    state.mobileNavOpen = false;
    applyMobileNavState();
  }
});

window.addEventListener('resize', () => {
  if (!isMobileViewport() && state.mobileNavOpen) {
    state.mobileNavOpen = false;
  }
  applyMobileNavState();
});

els.menuEditToggle.addEventListener('click', () => {
  if (state.menuCustomerMode) return;
  state.menuEditMode = !state.menuEditMode;
  renderMenu();
});

if (els.menuCustomerToggle) {
  els.menuCustomerToggle.addEventListener('click', () => {
    state.menuCustomerMode = !state.menuCustomerMode;
    if (state.menuCustomerMode) {
      state.menuEditMode = false;
      state.mobileNavOpen = false;
    }
    renderMenu();
  });
}

els.menuView.addEventListener('click', async (event) => {
  const clearBtn = event.target.closest('[data-action="toggle-clear-image"]');
  if (!clearBtn) return;

  const form = clearBtn.closest('.menu-edit-form');
  if (!form) return;

  const clearInput = form.querySelector('input[name="clearImage"]');
  if (!clearInput) return;

  const shouldClear = clearInput.value !== '1';
  clearInput.value = shouldClear ? '1' : '0';
  clearBtn.classList.toggle('active', shouldClear);

  if (shouldClear) {
    const fileInput = form.querySelector('input[name="imageFile"]');
    if (fileInput) fileInput.value = '';
  }
});

els.menuView.addEventListener('change', (event) => {
  const fileInput = event.target.closest('input[name="imageFile"]');
  if (!fileInput) return;

  const form = fileInput.closest('.menu-edit-form');
  if (!form) return;

  const clearInput = form.querySelector('input[name="clearImage"]');
  if (clearInput) clearInput.value = '0';

  const clearBtn = form.querySelector('[data-action="toggle-clear-image"]');
  if (clearBtn) clearBtn.classList.remove('active');
});

async function saveMenuEditForm(form, shouldRender = true) {
  const itemId = form?.dataset?.menuItemId;
  if (!itemId) {
    throw new Error('Menu item not found');
  }
  const formData = new FormData(form);
  const imageFile = form.querySelector('input[name="imageFile"]')?.files?.[0] || null;
  const clearImage = String(formData.get('clearImage') || '0') === '1';
  const body = {
    name: String(formData.get('name') || '').trim(),
    price: Number(formData.get('price')),
    quantity: Number(formData.get('quantity')),
    section: String(formData.get('section') || '').trim(),
    bestseller: formData.get('bestseller') === 'on',
  };

  if (
    !body.name ||
    !Number.isFinite(body.price) ||
    body.price < 0 ||
    !Number.isFinite(body.quantity) ||
    body.quantity < 0 ||
    !MENU_SECTIONS.includes(body.section)
  ) {
    throw new Error('Invalid name, price, quantity, or category');
  }

  if (!isHalfStepPrice(body.price)) {
    throw new Error('Menu price must be a multiple of 0.5');
  }

  if (clearImage) {
    body.clearImage = true;
  }

  if (imageFile) {
    if (imageFile.size > 2 * 1024 * 1024) {
      throw new Error('Image too large (max 2MB)');
    }

    body.imageDataUrl = await readFileAsDataUrl(imageFile);
  }

  const response = await api(`/api/menu-items/${itemId}`, {
    method: 'PUT',
    body,
  });
  const updated = response.menuItem;
  const index = state.menuItems.findIndex((item) => item.id === updated.id);
  if (index >= 0) {
    state.menuItems[index] = updated;
  }
  if (shouldRender) {
    renderMenu();
  }
  return updated;
}

els.menuView.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!form.matches('.menu-edit-form')) return;

  event.preventDefault();

  try {
    const updated = await saveMenuEditForm(form, true);
    showToast(`Menu updated: ${updated.name}`);
  } catch (err) {
    showToast(err.message);
  }
});

if (els.menuSaveAllBtn) {
  els.menuSaveAllBtn.addEventListener('click', async () => {
    if (!state.menuEditMode) return;

    const forms = Array.from(els.menuView.querySelectorAll('.menu-edit-form'));
    if (!forms.length) {
      state.menuEditMode = false;
      renderMenu();
      showToast('No item to save');
      return;
    }

    let successCount = 0;
    const errors = [];

    for (const form of forms) {
      const name = String(form.querySelector('input[name="name"]')?.value || '').trim() || form.dataset.menuItemId || 'item';
      try {
        await saveMenuEditForm(form, false);
        successCount += 1;
      } catch (err) {
        errors.push(`${name}: ${err.message}`);
      }
    }

    state.menuEditMode = false;
    renderMenu();

    if (!errors.length) {
      showToast(`All saved (${successCount})`);
      return;
    }

    showToast(`${successCount}/${forms.length} saved. ${errors.length} error(s).`);
    console.warn('Menu save all errors:', errors);
  });
}

if (els.menuAddItemBtn) {
  els.menuAddItemBtn.addEventListener('click', async () => {
    if (!state.menuEditMode) return;

    const sectionValue = String(els.menuAddSection?.value || 'food').trim();
    const section = MENU_SECTIONS.includes(sectionValue) ? sectionValue : 'food';
    const body = {
      name: buildNewMenuItemName(section),
      price: 0,
      quantity: 0,
      section,
      theme: 'default',
    };

    try {
      const response = await api('/api/menu-items', {
        method: 'POST',
        body,
      });

      const menuItem = response.menuItem;
      if (!menuItem?.id) {
        throw new Error('Unable to create menu item');
      }

      state.menuItems = state.menuItems.filter((item) => item.id !== menuItem.id);
      if (menuItem.section === 'food') {
        const firstDrinkIndex = state.menuItems.findIndex((item) => item.section === 'drink');
        if (firstDrinkIndex === -1) {
          state.menuItems.push(menuItem);
        } else {
          state.menuItems.splice(firstDrinkIndex, 0, menuItem);
        }
      } else {
        state.menuItems.push(menuItem);
      }

      renderMenu();

      const newForm = els.menuView.querySelector(`.menu-edit-form[data-menu-item-id="${menuItem.id}"]`);
      if (newForm) {
        newForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const nameInput = newForm.querySelector('input[name="name"]');
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }

      showToast(`Item added to ${menuSectionLabel(menuItem.section)}`);
    } catch (err) {
      showToast(err.message);
    }
  });
}

function handleMenuCardClick(event) {
  const card = event.target.closest('.menu-product-card');
  if (!card) return;
  if (state.menuEditMode) return;
  if (event.target.closest('.menu-edit-form')) return;
  if (card.dataset.menuUnavailable === '1' || card.classList.contains('menu-unavailable')) return;

  const menuItemId = card.dataset.menuItemId;
  if (!menuItemId) return;

  addMenuItemToCart(menuItemId, 1);
  renderSidebarOrder();
  scheduleMenuDraftSync();
}

function clearMenuDragVisualState() {
  document.querySelectorAll('.menu-product-card.dragging').forEach((card) => card.classList.remove('dragging'));
  document.querySelectorAll('.menu-product-card.menu-drag-over').forEach((card) => card.classList.remove('menu-drag-over'));
}

function handleMenuDragStart(event) {
  if (!state.menuEditMode) return;

  const card = event.target.closest('.menu-product-card.menu-draggable');
  if (!card) return;

  const itemId = String(card.dataset.menuItemId || '').trim();
  if (!itemId) return;

  menuDraggedItemId = itemId;
  card.classList.add('dragging');

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
  }
}

function handleMenuDragOver(event) {
  if (!state.menuEditMode || !menuDraggedItemId) return;
  event.preventDefault();

  const targetCard = event.target.closest('.menu-product-card.menu-draggable');
  document.querySelectorAll('.menu-product-card.menu-drag-over').forEach((card) => card.classList.remove('menu-drag-over'));
  if (targetCard && targetCard.dataset.menuItemId !== menuDraggedItemId) {
    targetCard.classList.add('menu-drag-over');
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleMenuDragLeave(event) {
  const related = event.relatedTarget;
  if (related && event.currentTarget.contains(related)) return;
  event.currentTarget.querySelectorAll('.menu-product-card.menu-drag-over').forEach((card) => card.classList.remove('menu-drag-over'));
}

async function handleMenuDrop(event) {
  if (!state.menuEditMode) return;
  event.preventDefault();

  const previousItems = state.menuItems.map((item) => ({ ...item }));
  const fallbackItemId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
  const draggedItemId = String(menuDraggedItemId || fallbackItemId || '').trim();
  const targetCard = event.target.closest('.menu-product-card.menu-draggable');
  const targetItemId = String(targetCard?.dataset?.menuItemId || '').trim();
  const targetSection = normalizeMenuSection(String(event.currentTarget?.dataset?.menuSection || 'food'));

  clearMenuDragVisualState();
  menuDraggedItemId = null;

  const changed = reorderMenuItems(draggedItemId, targetItemId, targetSection);
  if (!changed) return;

  renderMenu();

  try {
    await persistMenuOrder();
    showToast('Item positions swapped');
  } catch (err) {
    state.menuItems = previousItems;
    renderMenu();
    showToast(err.message);
  }
}

function handleMenuDragEnd() {
  menuDraggedItemId = null;
  clearMenuDragVisualState();
}

els.menuFoodGrid.addEventListener('click', handleMenuCardClick);
els.menuDrinkGrid.addEventListener('click', handleMenuCardClick);

[els.menuFoodGrid, els.menuDrinkGrid].forEach((grid) => {
  if (!grid) return;
  grid.dataset.menuSection = grid === els.menuDrinkGrid ? 'drink' : 'food';
  grid.addEventListener('dragstart', handleMenuDragStart);
  grid.addEventListener('dragover', handleMenuDragOver);
  grid.addEventListener('dragleave', handleMenuDragLeave);
  grid.addEventListener('drop', handleMenuDrop);
  grid.addEventListener('dragend', handleMenuDragEnd);
});

[els.sidebarOrderItems, els.mobileSidebarOrderItems].forEach((container) => {
  if (!container) return;
  container.addEventListener('click', handleSidebarOrderItemsClick);
});

[els.sidebarOrderClear, els.mobileSidebarOrderClear].forEach((button) => {
  if (!button) return;
  button.addEventListener('click', clearSidebarOrderSelection);
});

[els.sidebarOrderToggle, els.mobileSidebarOrderToggle].forEach((button) => {
  if (!button) return;
  button.addEventListener('click', () => {
    state.orderSummaryCollapsed = !state.orderSummaryCollapsed;
    applySidebarOrderCollapsedState();
  });
});

[els.sidebarOrderSend, els.mobileSidebarOrderSend].forEach((button) => {
  if (!button) return;
  button.addEventListener('click', sendSidebarOrder);
});

[els.sidebarOrderNote, els.mobileSidebarOrderNote].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    setOrderNoteValue(input.value, input);
    scheduleMenuDraftSync();
  });
});

if (els.sidebarOrderNote || els.mobileSidebarOrderNote) {
  setOrderNoteValue(getOrderNoteValue());
}

els.serviceWeeks.addEventListener('click', (event) => {
  if (!state.planningEditMode) return;
  const target = event.target.closest('[data-action="select-service-day"]');
  if (!target) return;
  const date = target.dataset.date;
  if (!date) return;
  state.selectedServiceDate = date;
  state.serviceDrawerOpen = true;
  renderServiceSchedule();
});

if (els.serviceVolunteerAssign) {
  els.serviceVolunteerAssign.addEventListener('click', async () => {
    if (!state.planningEditMode) return;
    const date = String(els.serviceDrawer?.dataset?.date || state.selectedServiceDate || '').trim();
    const selectedUserId = String(els.serviceVolunteerSelect?.value || '').trim();
    if (!date || !selectedUserId) return;

    const currentAssigned = getServiceAssignedUserIds(date);
    if (currentAssigned.includes(selectedUserId)) return;

    await saveServiceAssignments(
      date,
      currentAssigned.concat(selectedUserId),
      `Service updated for ${formatDisplayDate(date)}`,
    );
  });
}

if (els.serviceAssignedList) {
  els.serviceAssignedList.addEventListener('click', async (event) => {
    const removeBtn = event.target.closest('[data-action="remove-service-user"]');
    if (!removeBtn || !state.planningEditMode) return;

    const date = String(els.serviceDrawer?.dataset?.date || state.selectedServiceDate || '').trim();
    const userId = String(removeBtn.dataset.userId || '').trim();
    if (!date || !userId) return;

    const nextAssigned = getServiceAssignedUserIds(date).filter((id) => id !== userId);
    await saveServiceAssignments(
      date,
      nextAssigned,
      `Service updated for ${formatDisplayDate(date)}`,
    );
  });
}

if (els.serviceDrawerClose) {
  els.serviceDrawerClose.addEventListener('click', () => {
    state.serviceDrawerOpen = false;
    renderServiceSchedule();
  });
}

if (els.serviceDrawerBackdrop) {
  els.serviceDrawerBackdrop.addEventListener('click', () => {
    state.serviceDrawerOpen = false;
    renderServiceSchedule();
  });
}

els.profileNotifToggle.addEventListener('change', async (event) => {
  if (!('Notification' in window)) {
    state.pushNotificationsEnabled = false;
    savePushPreference(false);
    renderNotificationPreference();
    showToast('Browser notifications are not supported.');
    return;
  }

  const shouldEnable = event.currentTarget.checked;

  if (!shouldEnable) {
    state.pushNotificationsEnabled = false;
    savePushPreference(false);
    renderNotificationPreference();
    showToast('Push notifications disabled');
    return;
  }

  if (Notification.permission === 'granted') {
    state.pushNotificationsEnabled = true;
    savePushPreference(true);
    renderNotificationPreference();
    showToast('Push notifications enabled');
    return;
  }

  const permission = await Notification.requestPermission();
  const enabled = permission === 'granted';
  state.pushNotificationsEnabled = enabled;
  savePushPreference(enabled);
  renderNotificationPreference();

  if (enabled) {
    showToast('Push notifications enabled');
  } else {
    showToast(`Notifications not enabled (${permission})`);
  }
});

if (els.stockForm) {
  els.stockForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    body.quantity = Number(body.quantity);
    body.threshold = Number(body.threshold);

    try {
      await api('/api/inventory', { method: 'POST', body });
      event.currentTarget.reset();
      showToast('Stock item added');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (els.inventoryBody) {
  els.inventoryBody.addEventListener('click', async (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (!action || !id) return;

    const item = state.inventory.find((entry) => entry.id === id);
    if (!item) return;

    if (action === 'edit-stock') {
      const quantity = prompt(`New quantity for ${item.name} (${item.unit}):`, String(item.quantity));
      if (quantity === null) return;

      const threshold = prompt(`New threshold for ${item.name} (${item.unit}):`, String(item.threshold));
      if (threshold === null) return;

      try {
        await api(`/api/inventory/${id}`, {
          method: 'PUT',
          body: {
            quantity: Number(quantity),
            threshold: Number(threshold),
          },
        });
        showToast('Stock updated');
      } catch (err) {
        showToast(err.message);
      }
      return;
    }

    if (action === 'delete-stock') {
      if (!confirm('Delete this stock item?')) return;

      try {
        await api(`/api/inventory/${id}`, { method: 'DELETE' });
        showToast('Item deleted');
      } catch (err) {
        showToast(err.message);
      }
    }
  });
}

if (els.productForm) {
  els.productForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    body.price = Number(body.price);
    body.stockUsage = Number(body.stockUsage || 0);
    if (!body.stockItemId) body.stockItemId = null;

    try {
      await api('/api/products', { method: 'POST', body });
      event.currentTarget.reset();
      event.currentTarget.elements.currency.value = DEFAULT_CURRENCY;
      showToast('Product added');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (els.productsBody) {
  els.productsBody.addEventListener('click', async (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (action !== 'delete-product' || !id) return;

    if (!confirm('Delete this product?')) return;

    try {
      await api(`/api/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted');
    } catch (err) {
      showToast(err.message);
    }
  });
}

document.getElementById('cart-add-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const productId = formData.get('productId');
  const qty = Number(formData.get('qty') || 0);

  if (!productId || !Number.isFinite(qty) || qty <= 0) {
    showToast('Invalid product / quantity');
    return;
  }

  const existing = state.cart.find((entry) => entry.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ productId, qty });
  }

  renderCart();
  event.currentTarget.elements.qty.value = 1;
});

els.cartBody.addEventListener('click', (event) => {
  if (event.target.dataset.action !== 'remove-cart') return;
  const id = event.target.dataset.id;
  state.cart = state.cart.filter((entry) => entry.productId !== id);
  renderCart();
});

document.getElementById('clear-cart-btn').addEventListener('click', () => {
  state.cart = [];
  renderCart();
});

document.getElementById('sale-btn').addEventListener('click', async () => {
  if (!state.cart.length) {
    showToast('Cart is empty');
    return;
  }

  try {
    await api('/api/sales', {
      method: 'POST',
      body: {
        items: getCartPayload(),
      },
    });
    state.cart = [];
    renderCart();
    showToast('Sale recorded');
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('order-btn').addEventListener('click', async () => {
  if (!state.cart.length) {
    showToast('Cart is empty');
    return;
  }

  try {
    await api('/api/orders', {
      method: 'POST',
      body: {
        items: getCartPayload(),
        notes: els.orderNotes.value,
      },
    });
    state.cart = [];
    els.orderNotes.value = '';
    renderCart();
    showToast('Order sent to the team');
  } catch (err) {
    showToast(err.message);
  }
});

if (els.ordersView) {
  els.ordersView.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('[data-orders-tab]');
    if (!tabBtn) return;
    const tab = tabBtn.dataset.ordersTab === 'archive' ? 'archive' : 'active';
    if (state.ordersTab === tab) return;
    state.ordersTab = tab;
    renderOrders();
  });

  els.ordersView.addEventListener('change', async (event) => {
    const action = event.target.dataset.action;

    if (action === 'order-item-delivered') {
      const orderId = event.target.dataset.orderId;
      const lineId = event.target.dataset.lineId;
      const delivered = event.target.checked;

      try {
        const response = await api(`/api/orders/${orderId}/items/${lineId}`, {
          method: 'PATCH',
          body: { delivered },
        });
        const order = response.order;
        const index = state.orders.findIndex((entry) => entry.id === order.id);
        if (index >= 0) {
          state.orders[index] = order;
        }
        if (isOrderArchived(order)) {
          state.ordersTab = 'archive';
        }
        renderOrders();
        renderStats();
        if (isOrderArchived(order)) {
          showToast('Order archived (all items delivered)');
        } else {
          showToast('Item delivery updated');
        }
      } catch (err) {
        showToast(err.message);
        event.target.checked = !delivered;
      }
    }
  });
}

document.getElementById('task-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  if (!body.assignedTo) body.assignedTo = null;

  try {
    await api('/api/tasks', {
      method: 'POST',
      body,
    });
    event.currentTarget.reset();
    showToast('Task added');
  } catch (err) {
    showToast(err.message);
  }
});

els.tasksBody.addEventListener('change', async (event) => {
  if (event.target.dataset.action !== 'task-status') return;
  const taskId = event.target.dataset.taskId;
  const status = event.target.value;

  try {
    await api(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { status },
    });
    showToast('Task status updated');
  } catch (err) {
    showToast(err.message);
  }
});

els.tasksBody.addEventListener('click', async (event) => {
  if (event.target.dataset.action !== 'delete-task') return;

  const taskId = event.target.dataset.taskId;
  if (!confirm('Delete this task?')) return;

  try {
    await api(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    showToast('Task deleted');
  } catch (err) {
    showToast(err.message);
  }
});

if (els.accountingForm) {
  els.accountingForm.addEventListener('input', (event) => {
    if (event.target?.dataset?.action !== 'accounting-count-change') return;
    updateAccountingTotals();
  });

  els.accountingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const lines = getAccountingLinesFromForm();
    const electronicPayments = getElectronicPaymentsFromForm();
    const countDate = String(formData.get('countDate') || '').trim() || getAccountingSelectedDateFromForm();
    const expenseAmount = getAccountingExpenseFromForm();
    const body = {
      countedBy: String(formData.get('countedBy') || '').trim(),
      countedSignature: String(formData.get('countedSignature') || '').trim(),
      verifiedBy: String(formData.get('verifiedBy') || '').trim(),
      verifiedSignature: String(formData.get('verifiedSignature') || '').trim(),
      notes: String(formData.get('notes') || '').trim(),
      countDate,
      expenseAmount,
      electronicPayments,
      lines: lines.map((line) => ({
        id: line.id,
        label: line.label,
        type: line.type,
        value: line.value,
        count: line.count,
      })),
    };
    const editingEntryId = String(state.accountingEditingEntryId || '').trim();
    const editing = Boolean(editingEntryId);
    const endpoint = editing
      ? `/api/accounting-counts/${encodeURIComponent(editingEntryId)}`
      : '/api/accounting-counts';
    const method = editing ? 'PUT' : 'POST';

    try {
      const response = await api(endpoint, {
        method,
        body,
      });

      if (response.entry) {
        state.accountingCounts = [response.entry]
          .concat(state.accountingCounts.filter((entry) => entry.id !== response.entry.id))
          .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
          .slice(0, 250);
      }

      clearAccountingEditMode();
      renderAccounting();
      renderStats();

      const total = Number(response.entry?.totalAmount || 0).toFixed(2);
      showToast(`${editing ? 'Count updated' : 'Count submitted'}: ${total} ${DEFAULT_CURRENCY}`);
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (els.accountingHistoryBody) {
  els.accountingHistoryBody.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = String(actionButton.dataset.action || '').trim();
    if (!['download-accounting-entry', 'edit-accounting-entry', 'delete-accounting-entry'].includes(action)) return;

    event.preventDefault();
    event.stopPropagation();

    const entryId = String(actionButton.dataset.entryId || '').trim();
    const entry = state.accountingCounts.find((item) => String(item.id) === entryId);
    if (!entry) {
      showToast('Count not found');
      return;
    }

    if (action === 'download-accounting-entry') {
      try {
        downloadAccountingPdf(entry);
        showToast('Archive PDF downloaded');
      } catch (err) {
        showToast(err.message || 'Unable to download PDF');
      }
      return;
    }

    if (action === 'edit-accounting-entry') {
      startAccountingEdit(entry);
      showToast('Edit mode enabled');
      return;
    }

    if (!confirm('Delete this count archive?')) {
      return;
    }

    try {
      await api(`/api/accounting-counts/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
      });

      state.accountingCounts = state.accountingCounts.filter((item) => String(item.id) !== entryId);
      if (state.accountingEditingEntryId === entryId) {
        clearAccountingEditMode();
      }
      renderAccounting();
      renderStats();
      showToast('Archive deleted');
    } catch (err) {
      showToast(err.message || 'Unable to delete archive');
    }
  });
}

els.profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const body = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    const res = await api('/api/profile', {
      method: 'PUT',
      body,
    });
    state.me = res.user;
    renderAll();
    showToast('Profile updated');
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('password-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const body = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    await api('/api/profile/password', {
      method: 'POST',
      body,
    });
    event.currentTarget.reset();
    showToast('Password updated');
  } catch (err) {
    showToast(err.message);
  }
});

setInterval(() => {
  if (!state.me || !els.ordersView || els.ordersView.classList.contains('hidden')) return;
  updateOrderTimers();
}, 1000);

bootstrapSession();
