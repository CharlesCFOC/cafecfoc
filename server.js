const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadDotEnv() {
  const dotenvPath = path.join(__dirname, '.env');
  if (!fs.existsSync(dotenvPath)) return;

  const content = fs.readFileSync(dotenvPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 3010);
const PUBLIC_DIR = path.join(__dirname, 'public');
const IS_VERCEL_RUNTIME = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL_RUNTIME
  ? path.join('/tmp', 'cafecfoc-data')
  : path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_PEPPER = 'cafecfoc_local_pepper_v1';
const SESSION_SIGNING_KEY = String(process.env.SESSION_SIGNING_KEY || `${PASSWORD_PEPPER}:session:v1`);
const CATEGORIES = ['food', 'drink', 'snack'];
const MENU_SECTIONS = ['food', 'drink'];
const ACCOUNTING_LINE_TYPES = ['coin', 'bill'];
const MAX_JSON_BODY_BYTES = 4_500_000;
const DEFAULT_CURRENCY = 'CAD';
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_USERS_TABLE = 'cafecfoc_users';
const SUPABASE_INVENTORY_TABLE = 'cafecfoc_inventory';
const SUPABASE_ACCOUNTING_TABLE = 'cafecfoc_accounting_counts';
const SUPABASE_MENU_ITEMS_TABLE = 'cafecfoc_menu_items';
const SUPABASE_PRODUCTS_TABLE = 'cafecfoc_products';
const SUPABASE_SALES_TABLE = 'cafecfoc_sales';
const SUPABASE_SALE_ITEMS_TABLE = 'cafecfoc_sale_items';
const SUPABASE_ORDERS_TABLE = 'cafecfoc_orders';
const SUPABASE_SERVICE_SCHEDULE_TABLE = 'cafecfoc_service_schedule';
const SUPABASE_SERVICE_ASSIGNMENTS_TABLE = 'cafecfoc_service_assignments';
const SUPABASE_TASKS_TABLE = 'cafecfoc_tasks';
let supabaseReady = false;
let supabaseFlushTimer = null;
let supabaseFlushInFlight = false;
let supabaseFlushPending = false;
const supabaseSyncedRowHashes = new Map();
let usersRefreshPromise = null;
let usersLastRefreshAt = 0;
const USERS_REFRESH_THROTTLE_MS = 1_500;
let ordersRefreshPromise = null;
let ordersLastRefreshAt = 0;
const ORDERS_REFRESH_THROTTLE_MS = 700;
const MENU_DRAFT_NOTE_MAX_LENGTH = 240;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function defaultMenuItems() {
  const createdAt = new Date().toISOString();
  return [
    { id: crypto.randomUUID(), name: 'Chicken Finger', price: 1, quantity: 24, priceNote: 'ea', section: 'food', imageUrl: '', theme: 'chicken', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Spicy Beef Patty', price: 2.5, quantity: 28, priceNote: '', section: 'food', imageUrl: '', theme: 'patty', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Yogurt Parfait', price: 6, quantity: 18, priceNote: '', section: 'food', imageUrl: '', theme: 'yogurt', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Chapatti', price: 2, quantity: 22, priceNote: 'ea', section: 'food', imageUrl: '', theme: 'chapatti', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Hotdog', price: 6, quantity: 20, priceNote: '', section: 'food', imageUrl: '', theme: 'hotdog', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Porridge 16 oz', price: 5, quantity: 16, priceNote: '', section: 'food', imageUrl: '', theme: 'porridge', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Ramen Noodle Beef Spicy', price: 7, quantity: 14, priceNote: '', section: 'food', imageUrl: '', theme: 'ramen', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Ginger Pop', price: 2, quantity: 24, priceNote: '', section: 'drink', imageUrl: '', theme: 'ginger', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Orange', price: 2, quantity: 24, priceNote: '', section: 'drink', imageUrl: '', theme: 'orange', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Pineapple', price: 2, quantity: 24, priceNote: '', section: 'drink', imageUrl: '', theme: 'pineapple', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Sprite', price: 2, quantity: 24, priceNote: '', section: 'drink', imageUrl: '', theme: 'sprite', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Ginger Beer', price: 2, quantity: 24, priceNote: '', section: 'drink', imageUrl: '', theme: 'ginger', bestseller: false, createdAt },
    { id: crypto.randomUUID(), name: 'Cranberry', price: 2, quantity: 24, priceNote: '', section: 'drink', imageUrl: '', theme: 'cranberry', bestseller: false, createdAt },
  ];
}

function defaultStore() {
  return {
    users: [],
    inventory: [
      {
        id: crypto.randomUUID(),
        name: 'Cafe en grain',
        category: 'drink',
        quantity: 2000,
        unit: 'g',
        threshold: 500,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: 'Lait',
        category: 'drink',
        quantity: 20,
        unit: 'L',
        threshold: 5,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: 'Cookies',
        category: 'snack',
        quantity: 50,
        unit: 'pcs',
        threshold: 10,
        createdAt: new Date().toISOString(),
      },
    ],
    products: [],
    sales: [],
    orders: [],
    menuItems: defaultMenuItems(),
    serviceSchedule: [],
    tasks: [],
    accountingCounts: [],
  };
}

function normalizeCurrencyCode(value) {
  const normalized = String(value || '').trim().toUpperCase().slice(0, 3);
  if (!normalized || normalized === 'USD') {
    return DEFAULT_CURRENCY;
  }
  return normalized;
}

function normalizeTotalsByCurrency(totalsByCurrency) {
  if (!totalsByCurrency || typeof totalsByCurrency !== 'object') {
    return {};
  }

  const normalized = {};
  for (const [currencyCode, amountValue] of Object.entries(totalsByCurrency)) {
    const currency = normalizeCurrencyCode(currencyCode);
    const amount = Number(amountValue || 0);
    if (!Number.isFinite(amount)) continue;
    normalized[currency] = (normalized[currency] || 0) + amount;
  }
  return normalized;
}

function roundMoney(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function normalizeOrderSource(value, fallback = 'menu') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'menu' || normalized === 'caisse') {
    return normalized;
  }
  const fallbackNormalized = String(fallback || '').trim().toLowerCase();
  return fallbackNormalized === 'caisse' ? 'caisse' : 'menu';
}

function normalizeOrderPaymentMethod(value, fallback = 'unknown') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cash') return 'cash';
  if (normalized === 'card' || normalized === 'credit' || normalized === 'visa' || normalized === 'debit') {
    return 'card';
  }
  const fallbackNormalized = String(fallback || '').trim().toLowerCase();
  if (fallbackNormalized === 'cash' || fallbackNormalized === 'card') {
    return fallbackNormalized;
  }
  return 'unknown';
}

function decodeOrderSourceAndPayment(sourceValue) {
  const raw = String(sourceValue || '').trim().toLowerCase();
  if (!raw) {
    return { source: 'menu', paymentMethod: 'unknown' };
  }

  const sourcePart = raw.split(':')[0];
  const source = normalizeOrderSource(sourcePart, 'menu');
  if (source !== 'menu') {
    return { source, paymentMethod: 'unknown' };
  }

  const paymentPart = raw.includes(':') ? raw.split(':').slice(1).join(':') : '';
  return {
    source,
    paymentMethod: normalizeOrderPaymentMethod(paymentPart, 'unknown'),
  };
}

function getOrderPaymentMethod(order, fallback = 'unknown') {
  const fromField = normalizeOrderPaymentMethod(order?.paymentMethod, '');
  if (fromField !== 'unknown') return fromField;
  const decoded = decodeOrderSourceAndPayment(order?.source);
  return normalizeOrderPaymentMethod(decoded.paymentMethod, fallback);
}

function encodeOrderSourceWithPayment(sourceValue, paymentMethodValue) {
  const source = normalizeOrderSource(sourceValue, 'menu');
  const paymentMethod = normalizeOrderPaymentMethod(paymentMethodValue, 'unknown');
  if (source === 'menu' && (paymentMethod === 'cash' || paymentMethod === 'card')) {
    return `${source}:${paymentMethod}`;
  }
  return source;
}

function isHalfStepPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return false;
  return Math.abs((numeric * 2) - Math.round(numeric * 2)) < 1e-9;
}

function migrateRecordCurrencies(record) {
  let changed = false;
  const items = Array.isArray(record.items) ? record.items : [];

  for (const item of items) {
    const nextCurrency = normalizeCurrencyCode(item.currency);
    if (item.currency !== nextCurrency) {
      item.currency = nextCurrency;
      changed = true;
    }

    const numericLineTotal = Number(item.lineTotal || 0);
    if (!Number.isFinite(numericLineTotal)) {
      item.lineTotal = 0;
      changed = true;
    }
  }

  const normalizedCurrentTotals = normalizeTotalsByCurrency(record.totalsByCurrency);
  const nextTotals = items.length > 0 ? formatCurrencyTotals(items) : normalizedCurrentTotals;
  const currentTotalsJson = JSON.stringify(record.totalsByCurrency || {});
  const nextTotalsJson = JSON.stringify(nextTotals);
  if (currentTotalsJson !== nextTotalsJson) {
    record.totalsByCurrency = nextTotals;
    changed = true;
  }

  return changed;
}

function defaultOrderItemTheme(item, menuItem) {
  const menuTheme = String(menuItem?.theme || '').trim();
  if (menuTheme) return menuTheme;

  const itemTheme = String(item?.theme || '').trim();
  if (itemTheme) return itemTheme;

  const category = String(item?.category || '').toLowerCase();
  if (category === 'drink') return 'sprite';
  if (category === 'snack') return 'chapatti';
  if (category === 'food') return 'chicken';
  return 'default';
}

function areAllOrderItemsDelivered(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.length > 0 && items.every((item) => item.delivered === true);
}

function buildTrackedOrderItems(items) {
  const menuById = new Map((store.menuItems || []).map((menuItem) => [menuItem.id, menuItem]));

  return items.map((item) => {
    const menuItem = item.menuItemId ? menuById.get(String(item.menuItemId || '')) : null;
    return {
      ...item,
      lineId: crypto.randomUUID(),
      delivered: false,
      deliveredAt: null,
      deliveredBy: null,
      imageUrl: String(menuItem?.imageUrl || '').trim(),
      theme: defaultOrderItemTheme(item, menuItem),
    };
  });
}

function migrateOrderTracking(order) {
  let changed = false;
  if (!Array.isArray(order.items)) {
    order.items = [];
    changed = true;
  }

  const menuById = new Map((store.menuItems || []).map((menuItem) => [menuItem.id, menuItem]));

  for (const item of order.items) {
    if (!item.lineId) {
      item.lineId = crypto.randomUUID();
      changed = true;
    }

    if (typeof item.delivered !== 'boolean') {
      item.delivered = false;
      changed = true;
    }

    if (item.delivered) {
      if (!item.deliveredAt) {
        item.deliveredAt = order.createdAt || new Date().toISOString();
        changed = true;
      }
      if (item.deliveredBy === undefined) {
        item.deliveredBy = null;
        changed = true;
      }
    } else {
      if (item.deliveredAt !== null || item.deliveredAt === undefined) {
        item.deliveredAt = null;
        changed = true;
      }
      if (item.deliveredBy !== null || item.deliveredBy === undefined) {
        item.deliveredBy = null;
        changed = true;
      }
    }

    const menuItem = item.menuItemId ? menuById.get(String(item.menuItemId || '')) : null;
    const currentImageUrl = String(item.imageUrl || '').trim();
    const nextImageUrl = currentImageUrl || String(menuItem?.imageUrl || '').trim();
    if (currentImageUrl !== nextImageUrl || item.imageUrl !== nextImageUrl) {
      item.imageUrl = nextImageUrl;
      changed = true;
    }

    const nextTheme = defaultOrderItemTheme(item, menuItem);
    if (item.theme !== nextTheme) {
      item.theme = nextTheme;
      changed = true;
    }
  }

  const shouldArchive = areAllOrderItemsDelivered(order);
  if (typeof order.archived !== 'boolean' || order.archived !== shouldArchive) {
    order.archived = shouldArchive;
    changed = true;
  }
  if (shouldArchive) {
    if (!order.archivedAt) {
      order.archivedAt = new Date().toISOString();
      changed = true;
    }
  } else if (order.archivedAt !== null || order.archivedAt === undefined) {
    order.archivedAt = null;
    changed = true;
  }

  const nextStatus = recalcOrderStatus(order);
  if (order.status !== nextStatus) {
    order.status = nextStatus;
    changed = true;
  }

  return changed;
}

function migrateOrderPayment(order) {
  let changed = false;
  const decoded = decodeOrderSourceAndPayment(order?.source);
  const nextSource = decoded.source;
  const nextPaymentMethod = getOrderPaymentMethod(order, decoded.paymentMethod);

  if (order.source !== nextSource) {
    order.source = nextSource;
    changed = true;
  }
  if (order.paymentMethod !== nextPaymentMethod) {
    order.paymentMethod = nextPaymentMethod;
    changed = true;
  }

  return changed;
}

function normalizeAccountingLines(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new Error('Invalid count lines');
  }

  const lines = [];
  for (const rawLine of rawLines) {
    const label = String(rawLine?.label || '').trim();
    const type = String(rawLine?.type || '').trim().toLowerCase();
    const value = Number(rawLine?.value || 0);
    const count = Number(rawLine?.count || 0);

    if (!label || label.length > 60) {
      throw new Error('Invalid denomination label');
    }
    if (!ACCOUNTING_LINE_TYPES.includes(type)) {
      throw new Error('Invalid denomination type');
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Invalid denomination value');
    }
    if (!Number.isFinite(count) || count < 0) {
      throw new Error('Invalid denomination quantity');
    }

    const normalizedCount = Number.isInteger(count) ? count : Math.round(count);
    const normalizedValue = roundMoney(value);
    const subtotal = roundMoney(normalizedValue * normalizedCount);

    lines.push({
      id: String(rawLine?.id || '').trim() || crypto.randomUUID(),
      label,
      type,
      value: normalizedValue,
      count: normalizedCount,
      subtotal,
    });
  }

  return lines;
}

function normalizeElectronicPayments(rawElectronicPayments) {
  const visaAmount = Number(rawElectronicPayments?.visaAmount || 0);
  const creditAmount = Number(rawElectronicPayments?.creditAmount || 0);

  if (!Number.isFinite(visaAmount) || visaAmount < 0) {
    throw new Error('Invalid Visa amount');
  }
  if (!Number.isFinite(creditAmount) || creditAmount < 0) {
    throw new Error('Invalid credit amount');
  }

  return {
    visaAmount: roundMoney(visaAmount),
    creditAmount: roundMoney(creditAmount),
  };
}

function normalizeAccountingDate(value, fallbackDate = null) {
  const raw = String(value || '').trim();
  if (!raw) {
    const fallbackRaw = String(fallbackDate || '').trim();
    if (fallbackRaw) return normalizeAccountingDate(fallbackRaw, null);
    throw new Error('Invalid count date');
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Invalid count date');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year
    || (utcDate.getUTCMonth() + 1) !== month
    || utcDate.getUTCDate() !== day
  ) {
    throw new Error('Invalid count date');
  }

  return raw;
}

function normalizeExpenseAmount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error('Invalid expense amount');
  }
  return roundMoney(numeric);
}

function buildAccountingSummary(lines) {
  return lines
    .filter((line) => Number(line.count || 0) > 0)
    .slice(0, 6)
    .map((line) => `${line.count}x ${line.label}`)
    .join(', ');
}

function migrateAccountingCount(entry) {
  let changed = false;

  if (typeof entry.countedBy !== 'string') {
    entry.countedBy = '';
    changed = true;
  }
  if (typeof entry.countedSignature !== 'string') {
    entry.countedSignature = '';
    changed = true;
  }
  if (typeof entry.verifiedBy !== 'string') {
    entry.verifiedBy = '';
    changed = true;
  }
  if (typeof entry.verifiedSignature !== 'string') {
    entry.verifiedSignature = '';
    changed = true;
  }
  if (typeof entry.notes !== 'string') {
    entry.notes = '';
    changed = true;
  }
  if (typeof entry.currency !== 'string' || !entry.currency.trim()) {
    entry.currency = DEFAULT_CURRENCY;
    changed = true;
  } else {
    const nextCurrency = normalizeCurrencyCode(entry.currency);
    if (entry.currency !== nextCurrency) {
      entry.currency = nextCurrency;
      changed = true;
    }
  }
  const fallbackDate = String(entry.createdAt || new Date().toISOString()).slice(0, 10);
  const dateCandidate = entry.countDate !== undefined ? entry.countDate : entry?.electronicPayments?.countDate;
  let normalizedCountDate = fallbackDate;
  try {
    normalizedCountDate = normalizeAccountingDate(dateCandidate, fallbackDate);
  } catch {
    normalizedCountDate = fallbackDate;
  }
  if (entry.countDate !== normalizedCountDate) {
    entry.countDate = normalizedCountDate;
    changed = true;
  }

  const expenseCandidate = entry.expenseAmount !== undefined ? entry.expenseAmount : entry?.electronicPayments?.expenseAmount;
  let normalizedExpenseAmount = 0;
  try {
    normalizedExpenseAmount = normalizeExpenseAmount(expenseCandidate);
  } catch {
    normalizedExpenseAmount = 0;
  }
  if (Number(entry.expenseAmount || 0) !== normalizedExpenseAmount) {
    entry.expenseAmount = normalizedExpenseAmount;
    changed = true;
  }

  try {
    const lines = normalizeAccountingLines(entry.lines || []);
    if (JSON.stringify(entry.lines || []) !== JSON.stringify(lines)) {
      entry.lines = lines;
      changed = true;
    }

    const nextTotal = roundMoney(lines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0));
    if (Number(entry.totalAmount || 0) !== nextTotal) {
      entry.totalAmount = nextTotal;
      changed = true;
    }

    const nextSummary = buildAccountingSummary(lines);
    if (String(entry.summary || '') !== nextSummary) {
      entry.summary = nextSummary;
      changed = true;
    }
  } catch {
    entry.lines = [];
    entry.totalAmount = 0;
    entry.summary = '';
    changed = true;
  }

  try {
    const electronicPayments = normalizeElectronicPayments(entry.electronicPayments || {});
    if (JSON.stringify(entry.electronicPayments || {}) !== JSON.stringify(electronicPayments)) {
      entry.electronicPayments = electronicPayments;
      changed = true;
    }
  } catch {
    entry.electronicPayments = {
      visaAmount: 0,
      creditAmount: 0,
    };
    changed = true;
  }

  if (!entry.id) {
    entry.id = crypto.randomUUID();
    changed = true;
  }
  if (!entry.createdAt) {
    entry.createdAt = new Date().toISOString();
    changed = true;
  }
  if (!entry.createdBy) {
    entry.createdBy = null;
    changed = true;
  }

  return changed;
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_FILE)) {
    const store = defaultStore();
    const [coffee, milk, cookies] = store.inventory;
    store.products = [
      {
        id: crypto.randomUUID(),
        name: 'Espresso',
        category: 'drink',
        price: 3,
        currency: DEFAULT_CURRENCY,
        stockItemId: coffee.id,
        stockUsage: 18,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: 'Latte',
        category: 'drink',
        price: 4.5,
        currency: DEFAULT_CURRENCY,
        stockItemId: milk.id,
        stockUsage: 0.2,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: 'Cookie',
        category: 'snack',
        price: 2,
        currency: DEFAULT_CURRENCY,
        stockItemId: cookies.id,
        stockUsage: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  }
}

function loadStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
}

function saveStore() {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  scheduleSupabaseFlush();
}

let store = loadStore();

let shouldSaveMigratedStore = false;

if (!Array.isArray(store.serviceSchedule)) {
  store.serviceSchedule = [];
  shouldSaveMigratedStore = true;
}

if (!Array.isArray(store.menuItems) || store.menuItems.length === 0) {
  store.menuItems = defaultMenuItems();
  shouldSaveMigratedStore = true;
} else {
  let menuItemsNeedMigrationSave = false;
  const normalizedMenuItems = store.menuItems
    .map((item, index) => {
      const section = MENU_SECTIONS.includes(item.section) ? item.section : index < 7 ? 'food' : 'drink';
      const name = String(item.name || '').trim();
      if (!name) return null;
      const price = Number(item.price);
      const rawQuantity = Number(item.quantity);
      const hasQuantity = Object.prototype.hasOwnProperty.call(item, 'quantity');
      const quantity = Number.isFinite(rawQuantity) && rawQuantity >= 0 ? Number(rawQuantity.toFixed(2)) : 0;
      if (!hasQuantity || !Number.isFinite(rawQuantity) || rawQuantity < 0 || quantity !== rawQuantity) {
        menuItemsNeedMigrationSave = true;
      }

      return {
        id: item.id || crypto.randomUUID(),
        name,
        price: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
        quantity,
        priceNote: String(item.priceNote || '').trim(),
        section,
        imageUrl: String(item.imageUrl || '').trim(),
        theme: String(item.theme || '').trim() || 'default',
        bestseller: item.bestseller === true,
        createdAt: item.createdAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (normalizedMenuItems.length !== store.menuItems.length) {
    shouldSaveMigratedStore = true;
  }
  if (menuItemsNeedMigrationSave) {
    shouldSaveMigratedStore = true;
  }

  store.menuItems = normalizedMenuItems.length ? normalizedMenuItems : defaultMenuItems();
}

if (!Array.isArray(store.orders)) {
  store.orders = [];
  shouldSaveMigratedStore = true;
}

if (store.orders.length) {
  const usedOrderNumbers = new Set();
  let maxOrderNumber = 0;
  const ordersMissingNumber = [];

  for (const order of store.orders) {
    const parsedNumber = Number(order.orderNumber);
    if (Number.isInteger(parsedNumber) && parsedNumber > 0 && !usedOrderNumbers.has(parsedNumber)) {
      usedOrderNumbers.add(parsedNumber);
      if (parsedNumber > maxOrderNumber) maxOrderNumber = parsedNumber;
      continue;
    }
    ordersMissingNumber.push(order);
  }

  ordersMissingNumber.sort((left, right) => {
    const leftAt = String(left.createdAt || '');
    const rightAt = String(right.createdAt || '');
    if (leftAt === rightAt) {
      return String(left.id || '').localeCompare(String(right.id || ''));
    }
    return leftAt.localeCompare(rightAt);
  });

  for (const order of ordersMissingNumber) {
    do {
      maxOrderNumber += 1;
    } while (usedOrderNumbers.has(maxOrderNumber));

    order.orderNumber = maxOrderNumber;
    usedOrderNumbers.add(maxOrderNumber);
    shouldSaveMigratedStore = true;
  }
}

if (Array.isArray(store.users)) {
  for (const user of store.users) {
    const nextCurrency = normalizeCurrencyCode(user.preferredCurrency);
    if (user.preferredCurrency !== nextCurrency) {
      user.preferredCurrency = nextCurrency;
      shouldSaveMigratedStore = true;
    }
  }
}

if (Array.isArray(store.products)) {
  for (const product of store.products) {
    const nextCurrency = normalizeCurrencyCode(product.currency);
    if (product.currency !== nextCurrency) {
      product.currency = nextCurrency;
      shouldSaveMigratedStore = true;
    }
  }
}

if (Array.isArray(store.sales)) {
  for (const sale of store.sales) {
    if (migrateRecordCurrencies(sale)) {
      shouldSaveMigratedStore = true;
    }
  }
}

if (Array.isArray(store.orders)) {
  for (const order of store.orders) {
    if (migrateRecordCurrencies(order)) {
      shouldSaveMigratedStore = true;
    }
    if (migrateOrderPayment(order)) {
      shouldSaveMigratedStore = true;
    }
    if (migrateOrderTracking(order)) {
      shouldSaveMigratedStore = true;
    }
  }
}

if (!Array.isArray(store.accountingCounts)) {
  store.accountingCounts = [];
  shouldSaveMigratedStore = true;
} else {
  for (const countEntry of store.accountingCounts) {
    if (migrateAccountingCount(countEntry)) {
      shouldSaveMigratedStore = true;
    }
  }

  store.accountingCounts.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

if (shouldSaveMigratedStore) {
  saveStore();
}

function localUserToDb(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    phone: user.phone || '',
    preferred_currency: normalizeCurrencyCode(user.preferredCurrency),
    created_at: user.createdAt,
  };
}

function dbUserToLocal(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    phone: row.phone || '',
    preferredCurrency: normalizeCurrencyCode(row.preferred_currency),
    createdAt: row.created_at,
  };
}

function localInventoryToDb(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    threshold: item.threshold,
    created_at: item.createdAt,
  };
}

function dbInventoryToLocal(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    threshold: Number(row.threshold),
    createdAt: row.created_at,
  };
}

function normalizeDateTimeForDb(value, fallback = new Date().toISOString()) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function localMenuItemToDb(item, index = 0) {
  const nowMs = Date.now() + Math.max(0, Number(index) || 0);
  const nowIso = new Date(nowMs).toISOString();
  const createdAt = normalizeDateTimeForDb(item.createdAt, nowIso);
  const updatedAt = normalizeDateTimeForDb(item.updatedAt, nowIso);
  return {
    id: item.id,
    name: String(item.name || ''),
    price: roundMoney(item.price),
    quantity: roundMoney(item.quantity),
    price_note: String(item.priceNote || ''),
    section: MENU_SECTIONS.includes(item.section) ? item.section : 'food',
    theme: String(item.theme || 'default'),
    image_url: String(item.imageUrl || ''),
    image_path: String(item.imagePath || ''),
    created_at: createdAt,
    updated_at: updatedAt > createdAt ? updatedAt : createdAt,
    updated_by: item.updatedBy || null,
  };
}

function dbMenuItemToLocal(row) {
  return {
    id: row.id,
    name: String(row.name || ''),
    price: roundMoney(row.price),
    quantity: roundMoney(row.quantity),
    priceNote: String(row.price_note || ''),
    section: MENU_SECTIONS.includes(row.section) ? row.section : 'food',
    imageUrl: String(row.image_url || ''),
    imagePath: String(row.image_path || ''),
    theme: String(row.theme || 'default'),
    bestseller: false,
    createdAt: normalizeDateTimeForDb(row.created_at),
    updatedAt: normalizeDateTimeForDb(row.updated_at, normalizeDateTimeForDb(row.created_at)),
    updatedBy: row.updated_by || null,
  };
}

function localProductToDb(product) {
  const createdAt = normalizeDateTimeForDb(product.createdAt);
  return {
    id: product.id,
    name: String(product.name || ''),
    category: String(product.category || ''),
    price: roundMoney(product.price),
    currency: normalizeCurrencyCode(product.currency),
    stock_item_id: product.stockItemId || null,
    stock_usage: Number.isFinite(Number(product.stockUsage)) ? Number(product.stockUsage) : 0,
    created_at: createdAt,
    updated_at: normalizeDateTimeForDb(product.updatedAt, createdAt),
  };
}

function dbProductToLocal(row) {
  return {
    id: row.id,
    name: String(row.name || ''),
    category: String(row.category || ''),
    price: roundMoney(row.price),
    currency: normalizeCurrencyCode(row.currency),
    stockItemId: row.stock_item_id || null,
    stockUsage: Number(row.stock_usage || 0),
    createdAt: normalizeDateTimeForDb(row.created_at),
    updatedAt: normalizeDateTimeForDb(row.updated_at, normalizeDateTimeForDb(row.created_at)),
  };
}

function saleItemDbId(saleId, index) {
  return `${String(saleId || '')}:${String(index + 1).padStart(3, '0')}`;
}

function localSaleToDb(sale) {
  return {
    id: sale.id,
    totals_by_currency: normalizeTotalsByCurrency(sale.totalsByCurrency || {}),
    created_by: sale.createdBy || null,
    created_at: normalizeDateTimeForDb(sale.createdAt),
  };
}

function localSaleItemsToDb(sale) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  return items.map((item, index) => ({
    id: saleItemDbId(sale.id, index),
    sale_id: sale.id,
    product_id: item.productId || null,
    name: String(item.name || ''),
    qty: Number(item.qty || 0),
    unit_price: roundMoney(item.unitPrice),
    currency: normalizeCurrencyCode(item.currency),
    line_total: roundMoney(item.lineTotal),
    stock_item_id: item.stockItemId || null,
    stock_usage: Number(item.stockUsage || 0),
  }));
}

function dbSaleToLocal(row, saleItems) {
  return {
    id: row.id,
    items: Array.isArray(saleItems) ? saleItems : [],
    totalsByCurrency: normalizeTotalsByCurrency(row.totals_by_currency || {}),
    createdBy: row.created_by || null,
    createdAt: normalizeDateTimeForDb(row.created_at),
  };
}

function dbSaleItemToLocal(row) {
  return {
    productId: row.product_id || null,
    name: String(row.name || ''),
    category: '',
    qty: Number(row.qty || 0),
    unitPrice: roundMoney(row.unit_price),
    currency: normalizeCurrencyCode(row.currency),
    lineTotal: roundMoney(row.line_total),
    stockItemId: row.stock_item_id || null,
    stockUsage: Number(row.stock_usage || 0),
  };
}

function localOrderToDb(order) {
  const createdAt = normalizeDateTimeForDb(order.createdAt);
  const updatedAt = normalizeDateTimeForDb(order.updatedAt, createdAt);
  const source = normalizeOrderSource(order.source, 'menu');
  const paymentMethod = getOrderPaymentMethod(order, 'unknown');
  return {
    id: order.id,
    status: String(order.status || 'new'),
    assigned_to: order.assignedTo || null,
    notes: String(order.notes || ''),
    totals_by_currency: normalizeTotalsByCurrency(order.totalsByCurrency || {}),
    created_by: order.createdBy || null,
    created_at: createdAt,
    updated_at: updatedAt,
    order_number: Number.isInteger(Number(order.orderNumber)) ? Number(order.orderNumber) : null,
    items: Array.isArray(order.items) ? order.items : [],
    archived: Boolean(order.archived),
    archived_at: order.archivedAt || null,
    source: encodeOrderSourceWithPayment(source, paymentMethod),
    steps: Array.isArray(order.steps) ? order.steps : [],
  };
}

function dbOrderToLocal(row) {
  const decoded = decodeOrderSourceAndPayment(row.source);
  const paymentMethod = normalizeOrderPaymentMethod(
    row.payment_method !== undefined ? row.payment_method : row.paymentMethod,
    decoded.paymentMethod,
  );

  return {
    id: row.id,
    status: String(row.status || 'new'),
    assignedTo: row.assigned_to || null,
    notes: String(row.notes || ''),
    totalsByCurrency: normalizeTotalsByCurrency(row.totals_by_currency || {}),
    createdBy: row.created_by || null,
    createdAt: normalizeDateTimeForDb(row.created_at),
    updatedAt: normalizeDateTimeForDb(row.updated_at, normalizeDateTimeForDb(row.created_at)),
    orderNumber: Number(row.order_number || 0) || 0,
    items: Array.isArray(row.items) ? row.items : [],
    archived: Boolean(row.archived),
    archivedAt: row.archived_at || null,
    source: decoded.source,
    paymentMethod,
    steps: Array.isArray(row.steps) ? row.steps : [],
  };
}

function localServiceScheduleEntryToDb(entry) {
  const createdAt = normalizeDateTimeForDb(entry.createdAt);
  return {
    id: entry.id || crypto.randomUUID(),
    service_date: String(entry.date || '').slice(0, 10),
    created_at: createdAt,
    created_by: entry.createdBy || null,
    updated_at: entry.updatedAt ? normalizeDateTimeForDb(entry.updatedAt, createdAt) : null,
    updated_by: entry.updatedBy || null,
  };
}

function localServiceAssignmentsToDb(entry) {
  const serviceScheduleId = entry.id;
  const assignedIds = Array.from(new Set((entry.assignedUserIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  return assignedIds.map((userId) => ({
    service_schedule_id: serviceScheduleId,
    user_id: userId,
  }));
}

function dbServiceScheduleToLocal(row, assignedUserIds = []) {
  return {
    id: row.id,
    date: String(row.service_date || '').slice(0, 10),
    assignedUserIds: Array.from(new Set((assignedUserIds || []).map((id) => String(id || '').trim()).filter(Boolean))),
    createdAt: normalizeDateTimeForDb(row.created_at),
    createdBy: row.created_by || null,
    updatedAt: row.updated_at ? normalizeDateTimeForDb(row.updated_at, normalizeDateTimeForDb(row.created_at)) : null,
    updatedBy: row.updated_by || null,
  };
}

function localTaskToDb(task) {
  const createdAt = normalizeDateTimeForDb(task.createdAt);
  return {
    id: task.id,
    title: String(task.title || ''),
    task_date: String(task.date || '').slice(0, 10),
    start_time: String(task.start || ''),
    end_time: String(task.end || ''),
    assigned_to: task.assignedTo || null,
    description: String(task.description || ''),
    status: String(task.status || 'todo'),
    created_by: task.createdBy || null,
    created_at: createdAt,
    updated_at: normalizeDateTimeForDb(task.updatedAt, createdAt),
  };
}

function dbTaskToLocal(row) {
  return {
    id: row.id,
    title: String(row.title || ''),
    date: String(row.task_date || '').slice(0, 10),
    start: String(row.start_time || ''),
    end: String(row.end_time || ''),
    assignedTo: row.assigned_to || null,
    description: String(row.description || ''),
    status: String(row.status || 'todo'),
    createdBy: row.created_by || null,
    createdAt: normalizeDateTimeForDb(row.created_at),
    updatedAt: normalizeDateTimeForDb(row.updated_at, normalizeDateTimeForDb(row.created_at)),
  };
}

function localAccountingToDb(entry) {
  const fallbackDate = String(entry.countDate || '').trim()
    || String(entry.createdAt || '').slice(0, 10)
    || new Date().toISOString().slice(0, 10);

  let countDate = fallbackDate;
  try {
    countDate = normalizeAccountingDate(fallbackDate, new Date().toISOString().slice(0, 10));
  } catch {
    countDate = new Date().toISOString().slice(0, 10);
  }

  let expenseAmount = 0;
  try {
    expenseAmount = normalizeExpenseAmount(entry.expenseAmount);
  } catch {
    expenseAmount = 0;
  }

  const electronicPayments = normalizeElectronicPayments(entry.electronicPayments || {});

  return {
    id: entry.id,
    currency: normalizeCurrencyCode(entry.currency),
    counted_by: String(entry.countedBy || ''),
    counted_signature: String(entry.countedSignature || ''),
    verified_by: String(entry.verifiedBy || ''),
    verified_signature: String(entry.verifiedSignature || ''),
    notes: String(entry.notes || ''),
    lines: Array.isArray(entry.lines) ? entry.lines : [],
    electronic_payments: {
      ...electronicPayments,
      expenseAmount,
      countDate,
    },
    total_amount: roundMoney(entry.totalAmount),
    summary: String(entry.summary || ''),
    created_by: entry.createdBy || null,
    created_at: entry.createdAt,
  };
}

function dbAccountingToLocal(row) {
  const rawElectronicPayments = (row.electronic_payments && typeof row.electronic_payments === 'object')
    ? row.electronic_payments
    : {};
  const fallbackDate = String(row.created_at || new Date().toISOString()).slice(0, 10);
  let countDate = fallbackDate;
  try {
    countDate = normalizeAccountingDate(row.count_date ?? rawElectronicPayments.countDate, fallbackDate);
  } catch {
    countDate = fallbackDate;
  }
  let expenseAmount = 0;
  try {
    expenseAmount = normalizeExpenseAmount(row.expense_amount ?? rawElectronicPayments.expenseAmount);
  } catch {
    expenseAmount = 0;
  }

  return {
    id: row.id,
    currency: normalizeCurrencyCode(row.currency),
    countedBy: String(row.counted_by || ''),
    countedSignature: String(row.counted_signature || ''),
    verifiedBy: String(row.verified_by || ''),
    verifiedSignature: String(row.verified_signature || ''),
    notes: String(row.notes || ''),
    lines: Array.isArray(row.lines) ? row.lines : [],
    electronicPayments: normalizeElectronicPayments(rawElectronicPayments),
    countDate,
    expenseAmount,
    totalAmount: roundMoney(row.total_amount),
    summary: String(row.summary || ''),
    createdBy: row.created_by || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

async function supabaseRequest(method, table, options = {}) {
  if (!SUPABASE_ENABLED) {
    throw new Error('Supabase not configured');
  }

  const query = options.query ? (options.query.startsWith('?') ? options.query : `?${options.query}`) : '';
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    const detail = err?.cause?.message || err.message || 'fetch failed';
    throw new Error(`Supabase network error: ${detail}`);
  }

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.hint || payload?.error_description || payload?.error || raw || `Supabase error (${response.status})`;
    throw new Error(`Supabase ${table}: ${message}`);
  }

  return payload;
}

async function loadUsersFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_USERS_TABLE, {
    query: 'select=id,name,email,password_hash,role,phone,preferred_currency,created_at&order=created_at.asc',
  });

  return Array.isArray(rows) ? rows.map(dbUserToLocal) : [];
}

async function loadInventoryFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_INVENTORY_TABLE, {
    query: 'select=id,name,category,quantity,unit,threshold,created_at&order=created_at.asc',
  });

  return Array.isArray(rows) ? rows.map(dbInventoryToLocal) : [];
}

async function loadAccountingCountsFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_ACCOUNTING_TABLE, {
    query: 'select=id,currency,counted_by,counted_signature,verified_by,verified_signature,notes,lines,electronic_payments,total_amount,summary,created_by,created_at&order=created_at.desc',
  });

  return Array.isArray(rows) ? rows.map(dbAccountingToLocal) : [];
}

async function loadMenuItemsFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_MENU_ITEMS_TABLE, {
    query: 'select=id,name,price,quantity,price_note,section,theme,image_url,image_path,created_at,updated_at,updated_by&order=updated_at.asc',
  });

  return Array.isArray(rows) ? rows.map(dbMenuItemToLocal) : [];
}

async function loadProductsFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_PRODUCTS_TABLE, {
    query: 'select=id,name,category,price,currency,stock_item_id,stock_usage,created_at,updated_at&order=created_at.asc',
  });

  return Array.isArray(rows) ? rows.map(dbProductToLocal) : [];
}

async function loadSalesFromSupabase() {
  const [salesRowsRaw, saleItemsRowsRaw] = await Promise.all([
    supabaseRequest('GET', SUPABASE_SALES_TABLE, {
      query: 'select=id,totals_by_currency,created_by,created_at&order=created_at.desc',
    }),
    supabaseRequest('GET', SUPABASE_SALE_ITEMS_TABLE, {
      query: 'select=id,sale_id,product_id,name,qty,unit_price,currency,line_total,stock_item_id,stock_usage&order=sale_id.asc,id.asc',
    }),
  ]);

  const salesRows = Array.isArray(salesRowsRaw) ? salesRowsRaw : [];
  const saleItemsRows = Array.isArray(saleItemsRowsRaw) ? saleItemsRowsRaw : [];
  const saleItemsBySaleId = new Map();
  for (const row of saleItemsRows) {
    const saleId = String(row.sale_id || '').trim();
    if (!saleId) continue;
    if (!saleItemsBySaleId.has(saleId)) saleItemsBySaleId.set(saleId, []);
    saleItemsBySaleId.get(saleId).push(dbSaleItemToLocal(row));
  }

  return salesRows.map((row) => dbSaleToLocal(row, saleItemsBySaleId.get(String(row.id || '').trim()) || []));
}

async function loadOrdersFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_ORDERS_TABLE, {
    query: 'select=id,status,assigned_to,notes,totals_by_currency,created_by,created_at,updated_at,order_number,items,archived,archived_at,source,steps&order=created_at.desc',
  });

  return Array.isArray(rows) ? rows.map(dbOrderToLocal) : [];
}

async function loadServiceScheduleFromSupabase() {
  const [scheduleRowsRaw, assignmentRowsRaw] = await Promise.all([
    supabaseRequest('GET', SUPABASE_SERVICE_SCHEDULE_TABLE, {
      query: 'select=id,service_date,created_at,created_by,updated_at,updated_by&order=service_date.asc',
    }),
    supabaseRequest('GET', SUPABASE_SERVICE_ASSIGNMENTS_TABLE, {
      query: 'select=service_schedule_id,user_id',
    }),
  ]);

  const scheduleRows = Array.isArray(scheduleRowsRaw) ? scheduleRowsRaw : [];
  const assignmentRows = Array.isArray(assignmentRowsRaw) ? assignmentRowsRaw : [];
  const assignedByScheduleId = new Map();
  for (const row of assignmentRows) {
    const scheduleId = String(row.service_schedule_id || '').trim();
    const userId = String(row.user_id || '').trim();
    if (!scheduleId || !userId) continue;
    if (!assignedByScheduleId.has(scheduleId)) assignedByScheduleId.set(scheduleId, []);
    assignedByScheduleId.get(scheduleId).push(userId);
  }

  return scheduleRows.map((row) => dbServiceScheduleToLocal(row, assignedByScheduleId.get(String(row.id || '').trim()) || []));
}

async function loadTasksFromSupabase() {
  const rows = await supabaseRequest('GET', SUPABASE_TASKS_TABLE, {
    query: 'select=id,title,task_date,start_time,end_time,assigned_to,description,status,created_by,created_at,updated_at&order=created_at.desc',
  });

  return Array.isArray(rows) ? rows.map(dbTaskToLocal) : [];
}

async function upsertUserToSupabase(user) {
  await supabaseRequest('POST', SUPABASE_USERS_TABLE, {
    query: 'on_conflict=id',
    body: localUserToDb(user),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function upsertInventoryToSupabase(item) {
  await supabaseRequest('POST', SUPABASE_INVENTORY_TABLE, {
    query: 'on_conflict=id',
    body: localInventoryToDb(item),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function upsertAccountingCountToSupabase(entry) {
  await supabaseRequest('POST', SUPABASE_ACCOUNTING_TABLE, {
    query: 'on_conflict=id',
    body: localAccountingToDb(entry),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function deleteAccountingCountFromSupabase(entryId) {
  await deleteRowByIdInSupabase(SUPABASE_ACCOUNTING_TABLE, entryId);
}

async function deleteInventoryFromSupabase(itemId) {
  await supabaseRequest('DELETE', SUPABASE_INVENTORY_TABLE, {
    query: `id=eq.${encodeURIComponent(itemId)}`,
    prefer: 'return=minimal',
  });
}

function hashSupabaseRow(row) {
  return crypto.createHash('sha1').update(JSON.stringify(row)).digest('hex');
}

function getSupabaseHashState(table) {
  if (!supabaseSyncedRowHashes.has(table)) {
    supabaseSyncedRowHashes.set(table, new Map());
  }
  return supabaseSyncedRowHashes.get(table);
}

function setSupabaseHashState(table, rows, keySelector) {
  const next = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;
    next.set(key, hashSupabaseRow(row));
  }
  supabaseSyncedRowHashes.set(table, next);
}

async function upsertRowByIdInSupabase(table, row) {
  await supabaseRequest('POST', table, {
    query: 'on_conflict=id',
    body: row,
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function deleteRowByIdInSupabase(table, rowId) {
  await supabaseRequest('DELETE', table, {
    query: `id=eq.${encodeURIComponent(rowId)}`,
    prefer: 'return=minimal',
  });
}

async function syncRowsByIdInSupabase(table, rows) {
  const previous = getSupabaseHashState(table);
  const next = new Map();

  for (const row of rows) {
    const rowId = String(row?.id || '').trim();
    if (!rowId) continue;
    const rowHash = hashSupabaseRow(row);
    next.set(rowId, rowHash);
    if (previous.get(rowId) !== rowHash) {
      await upsertRowByIdInSupabase(table, row);
    }
  }

  for (const rowId of previous.keys()) {
    if (!next.has(rowId)) {
      await deleteRowByIdInSupabase(table, rowId);
    }
  }

  supabaseSyncedRowHashes.set(table, next);
}

function serviceAssignmentRowKey(row) {
  const scheduleId = String(row?.service_schedule_id || '').trim();
  const userId = String(row?.user_id || '').trim();
  if (!scheduleId || !userId) return '';
  return `${scheduleId}::${userId}`;
}

async function upsertServiceAssignmentRow(row) {
  await supabaseRequest('POST', SUPABASE_SERVICE_ASSIGNMENTS_TABLE, {
    query: 'on_conflict=service_schedule_id,user_id',
    body: row,
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function deleteServiceAssignmentRow(row) {
  await supabaseRequest('DELETE', SUPABASE_SERVICE_ASSIGNMENTS_TABLE, {
    query: `service_schedule_id=eq.${encodeURIComponent(String(row.service_schedule_id || ''))}&user_id=eq.${encodeURIComponent(String(row.user_id || ''))}`,
    prefer: 'return=minimal',
  });
}

async function syncServiceAssignmentsInSupabase(rows) {
  const previous = getSupabaseHashState(SUPABASE_SERVICE_ASSIGNMENTS_TABLE);
  const next = new Map();

  for (const row of rows) {
    const key = serviceAssignmentRowKey(row);
    if (!key) continue;
    const rowHash = hashSupabaseRow(row);
    next.set(key, rowHash);
    if (previous.get(key) !== rowHash) {
      await upsertServiceAssignmentRow(row);
    }
  }

  for (const key of previous.keys()) {
    if (!next.has(key)) {
      const [serviceScheduleId, userId] = key.split('::');
      await deleteServiceAssignmentRow({ service_schedule_id: serviceScheduleId, user_id: userId });
    }
  }

  supabaseSyncedRowHashes.set(SUPABASE_SERVICE_ASSIGNMENTS_TABLE, next);
}

function ensureSupabaseReadyForPersistence() {
  if (!SUPABASE_ENABLED) return false;
  if (!supabaseReady) {
    throw new Error('Supabase not ready. Run the SQL script and restart the server.');
  }
  return true;
}

async function persistUser(user) {
  if (!ensureSupabaseReadyForPersistence()) return;
  await upsertUserToSupabase(user);
}

async function persistInventoryItem(item) {
  if (!ensureSupabaseReadyForPersistence()) return;
  await upsertInventoryToSupabase(item);
}

async function removeInventoryItem(itemId) {
  if (!ensureSupabaseReadyForPersistence()) return;
  await deleteInventoryFromSupabase(itemId);
}

async function persistAccountingCount(entry) {
  if (!ensureSupabaseReadyForPersistence()) return;
  await upsertAccountingCountToSupabase(entry);
}

async function removeAccountingCount(entryId) {
  if (!ensureSupabaseReadyForPersistence()) return;
  await deleteAccountingCountFromSupabase(entryId);
}

async function pushOperationalCollectionsToSupabase() {
  const menuRows = (Array.isArray(store.menuItems) ? store.menuItems : [])
    .map((item, index) => localMenuItemToDb(item, index));
  const productRows = (Array.isArray(store.products) ? store.products : [])
    .map((product) => localProductToDb(product));
  const salesRows = [];
  const saleItemsRows = [];
  for (const sale of (Array.isArray(store.sales) ? store.sales : [])) {
    salesRows.push(localSaleToDb(sale));
    saleItemsRows.push(...localSaleItemsToDb(sale));
  }
  const orderRows = (Array.isArray(store.orders) ? store.orders : [])
    .map((order) => localOrderToDb(order));

  const serviceScheduleEntries = (Array.isArray(store.serviceSchedule) ? store.serviceSchedule : [])
    .map((entry) => {
      if (!entry.id) {
        entry.id = crypto.randomUUID();
      }
      return entry;
    });
  const serviceScheduleRows = serviceScheduleEntries.map((entry) => localServiceScheduleEntryToDb(entry));
  const serviceAssignmentRows = serviceScheduleEntries.flatMap((entry) => localServiceAssignmentsToDb(entry));

  const taskRows = (Array.isArray(store.tasks) ? store.tasks : [])
    .map((task) => localTaskToDb(task));

  await syncRowsByIdInSupabase(SUPABASE_MENU_ITEMS_TABLE, menuRows);
  await syncRowsByIdInSupabase(SUPABASE_PRODUCTS_TABLE, productRows);
  await syncRowsByIdInSupabase(SUPABASE_SALES_TABLE, salesRows);
  await syncRowsByIdInSupabase(SUPABASE_SALE_ITEMS_TABLE, saleItemsRows);
  await syncRowsByIdInSupabase(SUPABASE_ORDERS_TABLE, orderRows);
  await syncRowsByIdInSupabase(SUPABASE_SERVICE_SCHEDULE_TABLE, serviceScheduleRows);
  await syncServiceAssignmentsInSupabase(serviceAssignmentRows);
  await syncRowsByIdInSupabase(SUPABASE_TASKS_TABLE, taskRows);
}

async function runSupabaseFlushLoop() {
  if (!SUPABASE_ENABLED || !supabaseReady || supabaseFlushInFlight) return;

  supabaseFlushInFlight = true;
  try {
    while (supabaseFlushPending) {
      supabaseFlushPending = false;
      await pushOperationalCollectionsToSupabase();
    }
  } catch (err) {
    console.error(`Supabase flush error: ${err.message}`);
  } finally {
    supabaseFlushInFlight = false;
  }
}

function scheduleSupabaseFlush() {
  if (!SUPABASE_ENABLED || !supabaseReady) return;

  supabaseFlushPending = true;
  if (supabaseFlushTimer) return;

  supabaseFlushTimer = setTimeout(() => {
    supabaseFlushTimer = null;
    void runSupabaseFlushLoop();
  }, 60);
}

async function syncStoreFromSupabase() {
  if (!SUPABASE_ENABLED) return;

  const remoteUsers = await loadUsersFromSupabase();
  if (remoteUsers.length > 0) {
    store.users = remoteUsers;
  } else if (store.users.length > 0) {
    for (const user of store.users) {
      await upsertUserToSupabase(user);
    }
  }

  const remoteInventory = await loadInventoryFromSupabase();
  if (remoteInventory.length > 0) {
    store.inventory = remoteInventory;
  } else if (store.inventory.length > 0) {
    for (const item of store.inventory) {
      await upsertInventoryToSupabase(item);
    }
  }

  const remoteAccountingCounts = await loadAccountingCountsFromSupabase();
  if (remoteAccountingCounts.length > 0) {
    store.accountingCounts = remoteAccountingCounts.slice(0, 250);
  } else if (store.accountingCounts.length > 0) {
    for (const entry of store.accountingCounts) {
      await upsertAccountingCountToSupabase(entry);
    }
  }

  const remoteMenuItems = await loadMenuItemsFromSupabase();
  if (remoteMenuItems.length > 0) {
    const localBestsellerById = new Map((store.menuItems || []).map((item) => [item.id, Boolean(item.bestseller)]));
    store.menuItems = remoteMenuItems.map((item) => ({
      ...item,
      bestseller: localBestsellerById.get(item.id) || false,
    }));
    setSupabaseHashState(
      SUPABASE_MENU_ITEMS_TABLE,
      store.menuItems.map((item, index) => localMenuItemToDb(item, index)),
      (row) => String(row.id || ''),
    );
  } else if (store.menuItems.length > 0) {
    await syncRowsByIdInSupabase(
      SUPABASE_MENU_ITEMS_TABLE,
      store.menuItems.map((item, index) => localMenuItemToDb(item, index)),
    );
  }

  const remoteProducts = await loadProductsFromSupabase();
  if (remoteProducts.length > 0) {
    store.products = remoteProducts;
    setSupabaseHashState(
      SUPABASE_PRODUCTS_TABLE,
      store.products.map((product) => localProductToDb(product)),
      (row) => String(row.id || ''),
    );
  } else if (store.products.length > 0) {
    await syncRowsByIdInSupabase(SUPABASE_PRODUCTS_TABLE, store.products.map((product) => localProductToDb(product)));
  }

  const remoteSales = await loadSalesFromSupabase();
  if (remoteSales.length > 0) {
    store.sales = remoteSales;
    const salesRows = [];
    const saleItemsRows = [];
    for (const sale of store.sales) {
      salesRows.push(localSaleToDb(sale));
      saleItemsRows.push(...localSaleItemsToDb(sale));
    }
    setSupabaseHashState(SUPABASE_SALES_TABLE, salesRows, (row) => String(row.id || ''));
    setSupabaseHashState(SUPABASE_SALE_ITEMS_TABLE, saleItemsRows, (row) => String(row.id || ''));
  } else if (store.sales.length > 0) {
    const salesRows = [];
    const saleItemsRows = [];
    for (const sale of store.sales) {
      salesRows.push(localSaleToDb(sale));
      saleItemsRows.push(...localSaleItemsToDb(sale));
    }
    await syncRowsByIdInSupabase(SUPABASE_SALES_TABLE, salesRows);
    await syncRowsByIdInSupabase(SUPABASE_SALE_ITEMS_TABLE, saleItemsRows);
  }

  const remoteOrders = await loadOrdersFromSupabase();
  if (remoteOrders.length > 0) {
    store.orders = remoteOrders;
    setSupabaseHashState(
      SUPABASE_ORDERS_TABLE,
      store.orders.map((order) => localOrderToDb(order)),
      (row) => String(row.id || ''),
    );
  } else if (store.orders.length > 0) {
    await syncRowsByIdInSupabase(SUPABASE_ORDERS_TABLE, store.orders.map((order) => localOrderToDb(order)));
  }

  const remoteServiceSchedule = await loadServiceScheduleFromSupabase();
  if (remoteServiceSchedule.length > 0) {
    store.serviceSchedule = remoteServiceSchedule;
    const serviceEntries = store.serviceSchedule.map((entry) => {
      if (!entry.id) entry.id = crypto.randomUUID();
      return entry;
    });
    setSupabaseHashState(
      SUPABASE_SERVICE_SCHEDULE_TABLE,
      serviceEntries.map((entry) => localServiceScheduleEntryToDb(entry)),
      (row) => String(row.id || ''),
    );
    setSupabaseHashState(
      SUPABASE_SERVICE_ASSIGNMENTS_TABLE,
      serviceEntries.flatMap((entry) => localServiceAssignmentsToDb(entry)),
      (row) => serviceAssignmentRowKey(row),
    );
  } else if (store.serviceSchedule.length > 0) {
    const serviceEntries = store.serviceSchedule.map((entry) => {
      if (!entry.id) entry.id = crypto.randomUUID();
      return entry;
    });
    await syncRowsByIdInSupabase(SUPABASE_SERVICE_SCHEDULE_TABLE, serviceEntries.map((entry) => localServiceScheduleEntryToDb(entry)));
    await syncServiceAssignmentsInSupabase(serviceEntries.flatMap((entry) => localServiceAssignmentsToDb(entry)));
  }

  const remoteTasks = await loadTasksFromSupabase();
  if (remoteTasks.length > 0) {
    store.tasks = remoteTasks;
    setSupabaseHashState(
      SUPABASE_TASKS_TABLE,
      store.tasks.map((task) => localTaskToDb(task)),
      (row) => String(row.id || ''),
    );
  } else if (store.tasks.length > 0) {
    await syncRowsByIdInSupabase(SUPABASE_TASKS_TABLE, store.tasks.map((task) => localTaskToDb(task)));
  }

  saveStore();
  usersLastRefreshAt = Date.now();
}

function isVercelWithoutSupabase() {
  return IS_VERCEL_RUNTIME && !SUPABASE_ENABLED;
}

function refreshUsersFromSupabase({ force = false } = {}) {
  if (!SUPABASE_ENABLED) {
    return Promise.resolve();
  }

  const now = Date.now();
  if (!force && (now - usersLastRefreshAt) < USERS_REFRESH_THROTTLE_MS) {
    return Promise.resolve();
  }

  if (usersRefreshPromise) {
    return usersRefreshPromise;
  }

  usersRefreshPromise = (async () => {
    const remoteUsers = await loadUsersFromSupabase();
    store.users = Array.isArray(remoteUsers) ? remoteUsers : [];
    usersLastRefreshAt = Date.now();
  })().finally(() => {
    usersRefreshPromise = null;
  });

  return usersRefreshPromise;
}

function refreshOrdersFromSupabase({ force = false } = {}) {
  if (!SUPABASE_ENABLED) {
    return Promise.resolve();
  }

  const now = Date.now();
  if (!force && (now - ordersLastRefreshAt) < ORDERS_REFRESH_THROTTLE_MS) {
    return Promise.resolve();
  }

  if (ordersRefreshPromise) {
    return ordersRefreshPromise;
  }

  ordersRefreshPromise = (async () => {
    const remoteOrders = await loadOrdersFromSupabase();
    if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
      store.orders = remoteOrders;
      setSupabaseHashState(
        SUPABASE_ORDERS_TABLE,
        store.orders.map((order) => localOrderToDb(order)),
        (row) => String(row.id || ''),
      );
    }
    ordersLastRefreshAt = Date.now();
  })().finally(() => {
    ordersRefreshPromise = null;
  });

  return ordersRefreshPromise;
}

async function persistOrderToSupabaseNow(order) {
  if (!SUPABASE_ENABLED || !supabaseReady) return;
  if (!order || !order.id) return;

  const row = localOrderToDb(order);
  await upsertRowByIdInSupabase(SUPABASE_ORDERS_TABLE, row);
  const stateById = getSupabaseHashState(SUPABASE_ORDERS_TABLE);
  stateById.set(String(row.id || ''), hashSupabaseRow(row));
  ordersLastRefreshAt = Date.now();
}

const sseClients = new Map();
const menuDrafts = new Map();

function normalizeMenuDraftItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [];
  }

  const qtyByMenuItemId = new Map();

  for (const rawItem of rawItems) {
    const menuItemId = String(rawItem?.menuItemId || '').trim();
    if (!menuItemId) continue;

    const menuItem = store.menuItems.find((entry) => entry.id === menuItemId);
    if (!menuItem) continue;

    const qty = Number(rawItem?.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const roundedQty = Math.max(1, Math.round(qty));
    qtyByMenuItemId.set(menuItemId, (qtyByMenuItemId.get(menuItemId) || 0) + roundedQty);
  }

  const normalized = [];
  for (const [menuItemId, totalQty] of qtyByMenuItemId.entries()) {
    const menuItem = store.menuItems.find((entry) => entry.id === menuItemId);
    if (!menuItem) continue;

    const availableQty = Number(menuItem.quantity || 0);
    const cappedQty = Number.isFinite(availableQty) && availableQty >= 0
      ? Math.min(totalQty, Math.floor(availableQty))
      : totalQty;

    if (!Number.isFinite(cappedQty) || cappedQty <= 0) continue;
    normalized.push({
      menuItemId,
      qty: cappedQty,
    });
  }

  normalized.sort((left, right) => left.menuItemId.localeCompare(right.menuItemId));
  return normalized;
}

function normalizeMenuDraftNote(rawNote) {
  return String(rawNote || '').trim().slice(0, MENU_DRAFT_NOTE_MAX_LENGTH);
}

function menuDraftSignature(items, note) {
  return JSON.stringify({
    items: Array.isArray(items) ? items : [],
    note: String(note || ''),
  });
}

function menuDraftsPayload() {
  const drafts = [];

  for (const [userId, draft] of menuDrafts.entries()) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId || !draft || typeof draft !== 'object') {
      menuDrafts.delete(userId);
      continue;
    }

    const items = normalizeMenuDraftItems(draft.items);
    const note = normalizeMenuDraftNote(draft.note);
    if (!items.length && !note) {
      menuDrafts.delete(normalizedUserId);
      continue;
    }

    const updatedAt = String(draft.updatedAt || '').trim() || new Date().toISOString();
    drafts.push({
      userId: normalizedUserId,
      items,
      note,
      updatedAt,
    });
  }

  drafts.sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
  return { menuDrafts: drafts };
}

function clearMenuDraftForUser(userId) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return false;
  return menuDrafts.delete(normalizedUserId);
}

function setMenuDraftForUser(userId, rawDraft = {}) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return false;

  const items = normalizeMenuDraftItems(rawDraft.items);
  const note = normalizeMenuDraftNote(rawDraft.note);

  if (!items.length && !note) {
    return clearMenuDraftForUser(normalizedUserId);
  }

  const previous = menuDrafts.get(normalizedUserId);
  const nextSignature = menuDraftSignature(items, note);
  const previousSignature = previous ? menuDraftSignature(previous.items, previous.note) : '';

  if (nextSignature === previousSignature) {
    return false;
  }

  menuDrafts.set(normalizedUserId, {
    userId: normalizedUserId,
    items,
    note,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

function broadcastMenuDrafts() {
  broadcast('menu-drafts:updated', menuDraftsPayload());
}

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(`${PASSWORD_PEPPER}:${password}`)
    .digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc, entry) => {
    const [rawKey, ...rest] = entry.trim().split('=');
    const key = rawKey;
    const value = rest.join('=');
    if (key) {
      try {
        acc[key] = decodeURIComponent(value || '');
      } catch {
        acc[key] = value || '';
      }
    }
    return acc;
  }, {});
}

function setSessionCookie(res, token) {
  const cookieParts = [
    `cafecfoc_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];

  if (IS_VERCEL_RUNTIME || process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function clearSessionCookie(res) {
  const cookieParts = [
    'cafecfoc_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];

  if (IS_VERCEL_RUNTIME || process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

function signSessionPayload(payloadB64) {
  return crypto.createHmac('sha256', SESSION_SIGNING_KEY).update(payloadB64).digest('base64url');
}

function createSessionToken(userId) {
  const payload = {
    userId: String(userId || ''),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signSessionPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

function parseSessionToken(token) {
  const rawToken = String(token || '').trim();
  if (!rawToken) return null;

  const parts = rawToken.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, providedSignature] = parts;
  if (!payloadB64 || !providedSignature) return null;

  const expectedSignature = signSessionPayload(payloadB64);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const userId = String(payload?.userId || '').trim();
  const expiresAt = Number(payload?.expiresAt || 0);
  if (!userId || !Number.isFinite(expiresAt)) return null;
  if (expiresAt <= Date.now()) return null;

  return { userId, expiresAt };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    preferredCurrency: normalizeCurrencyCode(user.preferredCurrency),
    createdAt: user.createdAt,
  };
}

async function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.cafecfoc_session;
  if (!token) return null;

  const session = parseSessionToken(token);
  if (!session) return null;

  let user = store.users.find((item) => item.id === session.userId);
  if (!user && SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
    try {
      await refreshUsersFromSupabase({ force: true });
      user = store.users.find((item) => item.id === session.userId);
    } catch {
      user = null;
    }
  }
  if (!user) return null;

  return user;
}

function createSession(userId, res) {
  const token = createSessionToken(userId);
  setSessionCookie(res, token);
}

function destroySession(req, res) {
  clearSessionCookie(res);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { error: 'Method not allowed' });
}

function badRequest(res, message) {
  sendJson(res, 400, { error: message || 'Bad request' });
}

function unauthorized(res) {
  sendJson(res, 401, { error: 'Unauthorized' });
}

function storageUnavailable(res, message) {
  sendJson(res, 503, { error: message || 'External storage unavailable' });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_JSON_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

function sseSend(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcast(eventName, payload) {
  for (const client of sseClients.values()) {
    sseSend(client.res, eventName, payload);
  }
}

function notify(message) {
  broadcast('notify', {
    id: crypto.randomUUID(),
    message,
    at: new Date().toISOString(),
  });
}

function recalcOrderStatus(order) {
  if (order.archived || areAllOrderItemsDelivered(order)) return 'completed';
  const steps = Array.isArray(order.steps) ? order.steps : [];
  const step = (key) => steps.find((item) => item.key === key);
  if (step('servi')?.done) return 'completed';
  if (step('preparation')?.done || step('pret')?.done) return 'in_progress';
  return 'new';
}

function formatCurrencyTotals(items) {
  return items.reduce((acc, item) => {
    const currency = normalizeCurrencyCode(item.currency);
    const lineTotal = Number(item.lineTotal || 0);
    if (!Number.isFinite(lineTotal)) {
      return acc;
    }
    acc[currency] = (acc[currency] || 0) + lineTotal;
    return acc;
  }, {});
}

function isISODateString(value) {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidImageDataUrl(value) {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('data:image/')) return false;

  const marker = ';base64,';
  const markerIndex = value.indexOf(marker);
  if (markerIndex <= 0) return false;

  const base64Payload = value.slice(markerIndex + marker.length);
  if (!base64Payload) return false;

  return /^[A-Za-z0-9+/=]+$/.test(base64Payload);
}

function parseSaleItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Product list is empty');
  }

  const parsed = [];

  for (const rawItem of rawItems) {
    const product = store.products.find((item) => item.id === rawItem.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const qty = Number(rawItem.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Invalid quantity');
    }

    const lineTotal = Number((qty * Number(product.price)).toFixed(2));

    parsed.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      qty,
      unitPrice: Number(product.price),
      currency: normalizeCurrencyCode(product.currency),
      lineTotal,
      stockItemId: product.stockItemId || null,
      stockUsage: Number(product.stockUsage || 0),
    });
  }

  return parsed;
}

function parseMenuOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Menu item list is empty');
  }

  const inventoryByName = new Map(
    (store.inventory || [])
      .map((item) => [String(item?.name || '').trim().toLowerCase(), item])
      .filter(([name]) => Boolean(name)),
  );

  const parsed = [];

  for (const rawItem of rawItems) {
    const menuItemId = String(rawItem.menuItemId || '');
    const menuItem = store.menuItems.find((item) => item.id === menuItemId);
    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    const qty = Number(rawItem.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Invalid menu quantity');
    }

    const availableQty = Number(menuItem.quantity || 0);
    if (Number.isFinite(availableQty) && availableQty >= 0 && qty > availableQty) {
      throw new Error(`Insufficient menu stock for ${menuItem.name}`);
    }

    const unitPrice = Number(menuItem.price || 0);
    const currency = DEFAULT_CURRENCY;
    const lineTotal = Number((qty * unitPrice).toFixed(2));
    const matchedStock = inventoryByName.get(String(menuItem.name || '').trim().toLowerCase()) || null;

    parsed.push({
      productId: null,
      menuItemId,
      name: menuItem.name,
      qty,
      unitPrice,
      currency,
      lineTotal,
      stockItemId: matchedStock ? matchedStock.id : null,
      stockUsage: matchedStock ? 1 : 0,
    });
  }

  return parsed;
}

function applyStockFromItems(items) {
  const lowStockWarnings = [];

  for (const item of items) {
    if (!item.stockItemId || item.stockUsage <= 0) continue;
    const stock = store.inventory.find((inv) => inv.id === item.stockItemId);
    if (!stock) continue;

    const consumed = item.qty * item.stockUsage;
    stock.quantity = Number((stock.quantity - consumed).toFixed(3));

    if (stock.quantity <= stock.threshold) {
      lowStockWarnings.push(`${stock.name} is low (${stock.quantity} ${stock.unit})`);
    }
  }

  return lowStockWarnings;
}

async function handleApi(req, res, pathname, user) {
  const { method } = req;

  if (pathname === '/api/register') {
    if (method !== 'POST') return methodNotAllowed(res);
    if (isVercelWithoutSupabase()) {
      return storageUnavailable(res, 'Supabase must be configured on Vercel to persist accounts');
    }

    if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
      try {
        await refreshUsersFromSupabase({ force: true });
      } catch (err) {
        return storageUnavailable(res, err.message);
      }
    }

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = ['manager', 'volunteer', 'prep'].includes(body.role) ? body.role : 'volunteer';
    const phone = String(body.phone || '').trim();

    if (!name || !email || !password) {
      return badRequest(res, 'Name, email, and password are required');
    }

    if (store.users.some((item) => item.email === email)) {
      return sendJson(res, 409, { error: 'Email deja utilise' });
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      phone,
      preferredCurrency: DEFAULT_CURRENCY,
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    saveStore();

    try {
      await persistUser(newUser);
    } catch (err) {
      store.users = store.users.filter((item) => item.id !== newUser.id);
      saveStore();
      return storageUnavailable(res, err.message);
    }

    createSession(newUser.id, res);
    broadcast('users:updated', { users: store.users.map(publicUser) });
    notify(`New profile created: ${newUser.name}`);

    return sendJson(res, 201, { user: publicUser(newUser) });
  }

  if (pathname === '/api/login') {
    if (method !== 'POST') return methodNotAllowed(res);
    if (isVercelWithoutSupabase()) {
      return storageUnavailable(res, 'Supabase must be configured on Vercel to load accounts');
    }

    if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
      try {
        await refreshUsersFromSupabase({ force: true });
      } catch (err) {
        return storageUnavailable(res, err.message);
      }
    }

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return badRequest(res, 'Email and password required');
    }

    const existingUser = store.users.find((item) => item.email === email);
    if (!existingUser) {
      return unauthorized(res);
    }

    if (existingUser.passwordHash !== hashPassword(password)) {
      return unauthorized(res);
    }

    createSession(existingUser.id, res);
    return sendJson(res, 200, { user: publicUser(existingUser) });
  }

  if (pathname === '/api/forgot-password') {
    if (method !== 'POST') return methodNotAllowed(res);
    if (isVercelWithoutSupabase()) {
      return storageUnavailable(res, 'Supabase must be configured on Vercel to load accounts');
    }

    if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
      try {
        await refreshUsersFromSupabase({ force: true });
      } catch (err) {
        return storageUnavailable(res, err.message);
      }
    }

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '');

    if (!email || !newPassword) {
      return badRequest(res, 'Email and new password are required');
    }
    if (newPassword.length < 6) {
      return badRequest(res, 'New password must contain at least 6 characters');
    }

    const account = store.users.find((item) => item.email === email);
    if (!account) {
      return sendJson(res, 404, { error: 'Account not found' });
    }

    const previousHash = account.passwordHash;
    account.passwordHash = hashPassword(newPassword);
    saveStore();

    try {
      await persistUser(account);
    } catch (err) {
      account.passwordHash = previousHash;
      saveStore();
      return storageUnavailable(res, err.message);
    }

    notify(`Password updated for ${account.name}`);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/logout') {
    if (method !== 'POST') return methodNotAllowed(res);
    if (user && clearMenuDraftForUser(user.id)) {
      broadcastMenuDrafts();
    }
    destroySession(req, res);
    return sendJson(res, 200, { ok: true });
  }

  if (!user) {
    return unauthorized(res);
  }

  if (pathname === '/api/events') {
    if (method !== 'GET') return methodNotAllowed(res);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const id = crypto.randomUUID();
    sseClients.set(id, { res, userId: user.id });

    sseSend(res, 'ready', { ok: true, at: new Date().toISOString() });
    sseSend(res, 'menu-drafts:updated', menuDraftsPayload());

    req.on('close', () => {
      sseClients.delete(id);
    });

    return;
  }

  if (pathname === '/api/me') {
    if (method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (pathname === '/api/users') {
    if (method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, { users: store.users.map(publicUser) });
  }

  if (pathname === '/api/menu-drafts') {
    if (method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, menuDraftsPayload());
  }

  if (pathname === '/api/menu-draft') {
    if (method === 'PUT') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const changed = setMenuDraftForUser(user.id, body || {});
      if (changed) {
        broadcastMenuDrafts();
      }
      return sendJson(res, 200, menuDraftsPayload());
    }

    if (method === 'DELETE') {
      const changed = clearMenuDraftForUser(user.id);
      if (changed) {
        broadcastMenuDrafts();
      }
      return sendJson(res, 200, menuDraftsPayload());
    }

    return methodNotAllowed(res);
  }

  if (pathname === '/api/profile') {
    if (method !== 'PUT') return methodNotAllowed(res);

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const preferredCurrencyRaw = String(body.preferredCurrency || '').trim();
    const previousUser = { ...user };

    if (name) user.name = name;
    user.phone = phone;

    if (preferredCurrencyRaw) {
      user.preferredCurrency = normalizeCurrencyCode(preferredCurrencyRaw);
    }

    saveStore();

    try {
      await persistUser(user);
    } catch (err) {
      Object.assign(user, previousUser);
      saveStore();
      return storageUnavailable(res, err.message);
    }

    broadcast('users:updated', { users: store.users.map(publicUser) });

    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (pathname === '/api/profile/password') {
    if (method !== 'POST') return methodNotAllowed(res);

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const oldPassword = String(body.oldPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!oldPassword || !newPassword) {
      return badRequest(res, 'Current and new password required');
    }

    if (user.passwordHash !== hashPassword(oldPassword)) {
      return unauthorized(res);
    }

    const previousHash = user.passwordHash;
    user.passwordHash = hashPassword(newPassword);
    saveStore();

    try {
      await persistUser(user);
    } catch (err) {
      user.passwordHash = previousHash;
      saveStore();
      return storageUnavailable(res, err.message);
    }

    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/inventory') {
    if (method === 'GET') {
      return sendJson(res, 200, { inventory: store.inventory });
    }

    if (method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const name = String(body.name || '').trim();
      const category = String(body.category || '').trim();
      const quantity = Number(body.quantity || 0);
      const unit = String(body.unit || '').trim() || 'pcs';
      const threshold = Number(body.threshold || 0);

      if (!name || !CATEGORIES.includes(category)) {
        return badRequest(res, 'Invalid name or category');
      }

      if (!Number.isFinite(quantity) || !Number.isFinite(threshold)) {
        return badRequest(res, 'Invalid quantity / threshold');
      }

      const item = {
        id: crypto.randomUUID(),
        name,
        category,
        quantity,
        unit,
        threshold,
        createdAt: new Date().toISOString(),
      };

      store.inventory.push(item);
      saveStore();

      try {
        await persistInventoryItem(item);
      } catch (err) {
        store.inventory = store.inventory.filter((entry) => entry.id !== item.id);
        saveStore();
        return storageUnavailable(res, err.message);
      }

      broadcast('inventory:updated', { inventory: store.inventory });
      notify(`${user.name} added ${item.name} to stock`);

      return sendJson(res, 201, { item });
    }

    return methodNotAllowed(res);
  }

  const inventoryMatch = pathname.match(/^\/api\/inventory\/([^/]+)$/);
  if (inventoryMatch) {
    const id = inventoryMatch[1];
    const item = store.inventory.find((entry) => entry.id === id);
    if (!item) return notFound(res);

    if (method === 'PUT') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const previousItem = { ...item };

      if (body.name !== undefined) item.name = String(body.name || '').trim() || item.name;
      if (body.category !== undefined) {
        const category = String(body.category);
        if (!CATEGORIES.includes(category)) return badRequest(res, 'Invalid category');
        item.category = category;
      }
      if (body.quantity !== undefined) {
        const quantity = Number(body.quantity);
        if (!Number.isFinite(quantity)) return badRequest(res, 'Invalid quantity');
        item.quantity = quantity;
      }
      if (body.unit !== undefined) item.unit = String(body.unit || '').trim() || item.unit;
      if (body.threshold !== undefined) {
        const threshold = Number(body.threshold);
        if (!Number.isFinite(threshold)) return badRequest(res, 'Invalid threshold');
        item.threshold = threshold;
      }

      saveStore();

      try {
        await persistInventoryItem(item);
      } catch (err) {
        Object.assign(item, previousItem);
        saveStore();
        return storageUnavailable(res, err.message);
      }

      broadcast('inventory:updated', { inventory: store.inventory });
      notify(`${user.name} updated stock for ${item.name}`);

      return sendJson(res, 200, { item });
    }

    if (method === 'DELETE') {
      const previousInventory = store.inventory.map((entry) => ({ ...entry }));
      const previousProducts = store.products.map((product) => ({ ...product }));

      store.inventory = store.inventory.filter((entry) => entry.id !== id);
      store.products = store.products.map((product) => {
        if (product.stockItemId === id) {
          return { ...product, stockItemId: null, stockUsage: 0 };
        }
        return product;
      });
      saveStore();

      try {
        await removeInventoryItem(id);
      } catch (err) {
        store.inventory = previousInventory;
        store.products = previousProducts;
        saveStore();
        return storageUnavailable(res, err.message);
      }

      broadcast('inventory:updated', { inventory: store.inventory });
      broadcast('products:updated', { products: store.products });
      notify(`${user.name} deleted a stock item`);

      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  }

  if (pathname === '/api/products') {
    if (method === 'GET') {
      return sendJson(res, 200, { products: store.products });
    }

    if (method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const name = String(body.name || '').trim();
      const category = String(body.category || '').trim();
      const price = Number(body.price || 0);
      const currency = normalizeCurrencyCode(body.currency);
      const stockItemId = body.stockItemId ? String(body.stockItemId) : null;
      const stockUsage = Number(body.stockUsage || 0);

      if (!name || !CATEGORIES.includes(category) || !Number.isFinite(price) || price <= 0) {
        return badRequest(res, 'Invalid product');
      }

      if (stockItemId && !store.inventory.find((entry) => entry.id === stockItemId)) {
        return badRequest(res, 'Stock item not found');
      }

      const product = {
        id: crypto.randomUUID(),
        name,
        category,
        price,
        currency,
        stockItemId,
        stockUsage: Number.isFinite(stockUsage) ? stockUsage : 0,
        createdAt: new Date().toISOString(),
      };

      store.products.push(product);
      saveStore();

      broadcast('products:updated', { products: store.products });
      notify(`${user.name} added product ${product.name}`);

      return sendJson(res, 201, { product });
    }

    return methodNotAllowed(res);
  }

  const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const id = productMatch[1];
    const product = store.products.find((entry) => entry.id === id);
    if (!product) return notFound(res);

    if (method === 'PUT') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      if (body.name !== undefined) product.name = String(body.name || '').trim() || product.name;
      if (body.category !== undefined) {
        const category = String(body.category);
        if (!CATEGORIES.includes(category)) return badRequest(res, 'Invalid category');
        product.category = category;
      }
      if (body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price <= 0) return badRequest(res, 'Invalid price');
        product.price = price;
      }
      if (body.currency !== undefined) {
        product.currency = normalizeCurrencyCode(body.currency);
      }
      if (body.stockItemId !== undefined) {
        if (body.stockItemId && !store.inventory.find((entry) => entry.id === body.stockItemId)) {
          return badRequest(res, 'Stock item not found');
        }
        product.stockItemId = body.stockItemId || null;
      }
      if (body.stockUsage !== undefined) {
        const stockUsage = Number(body.stockUsage);
        if (!Number.isFinite(stockUsage) || stockUsage < 0) return badRequest(res, 'Invalid stock usage');
        product.stockUsage = stockUsage;
      }

      saveStore();
      broadcast('products:updated', { products: store.products });
      notify(`${user.name} updated ${product.name}`);

      return sendJson(res, 200, { product });
    }

    if (method === 'DELETE') {
      store.products = store.products.filter((entry) => entry.id !== id);
      saveStore();
      broadcast('products:updated', { products: store.products });
      notify(`${user.name} deleted a product`);
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  }

  if (pathname === '/api/menu-items') {
    if (method === 'GET') {
      return sendJson(res, 200, { menuItems: store.menuItems });
    }

    if (method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const name = String(body.name || '').trim();
      const price = Number(body.price || 0);
      const quantity = Number(body.quantity || 0);
      const priceNote = String(body.priceNote || '').trim();
      const section = String(body.section || 'food').trim();
      const theme = String(body.theme || '').trim() || 'default';
      const bestseller = body.bestseller === true;

      if (!name) return badRequest(res, 'Invalid menu name');
      if (!Number.isFinite(price) || price < 0) return badRequest(res, 'Invalid menu price');
      if (!isHalfStepPrice(price)) return badRequest(res, 'Menu price must be a multiple of 0.5');
      if (!Number.isFinite(quantity) || quantity < 0) return badRequest(res, 'Invalid menu quantity');
      if (!MENU_SECTIONS.includes(section)) return badRequest(res, 'Invalid menu category');

      let imageUrl = '';
      if (body.imageDataUrl !== undefined) {
        const imageDataUrl = String(body.imageDataUrl || '').trim();
        if (imageDataUrl) {
          if (!isValidImageDataUrl(imageDataUrl)) {
            return badRequest(res, 'Invalid image format');
          }
          if (imageDataUrl.length > 2_800_000) {
            return badRequest(res, 'Image too large (max 2MB)');
          }
          imageUrl = imageDataUrl;
        }
      } else if (body.imageUrl !== undefined) {
        imageUrl = String(body.imageUrl || '').trim();
      }

      const menuItem = {
        id: crypto.randomUUID(),
        name,
        price: Number(price.toFixed(2)),
        quantity: Number(quantity.toFixed(2)),
        priceNote,
        section,
        imageUrl,
        theme,
        bestseller,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      };

      if (section === 'food') {
        const firstDrinkIndex = store.menuItems.findIndex((entry) => entry.section === 'drink');
        if (firstDrinkIndex === -1) {
          store.menuItems.push(menuItem);
        } else {
          store.menuItems.splice(firstDrinkIndex, 0, menuItem);
        }
      } else {
        store.menuItems.push(menuItem);
      }

      saveStore();
      broadcast('menu-items:updated', { menuItems: store.menuItems });
      notify(`${user.name} added a menu item (${menuItem.name})`);

      return sendJson(res, 201, { menuItem });
    }

    return methodNotAllowed(res);
  }

  if (pathname === '/api/menu-items/reorder') {
    if (method !== 'PUT') return methodNotAllowed(res);

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!orderedIds.length) {
      return badRequest(res, 'Invalid menu order');
    }
    if (orderedIds.length !== store.menuItems.length) {
      return badRequest(res, 'Invalid number of menu items');
    }

    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return badRequest(res, 'Menu order contains duplicates');
    }

    const itemById = new Map(store.menuItems.map((entry) => [entry.id, entry]));
    for (const itemId of orderedIds) {
      if (!itemById.has(itemId)) {
        return badRequest(res, 'Menu item not found in the new order');
      }
    }

    const sections = body.sections && typeof body.sections === 'object' ? body.sections : {};
    const now = new Date().toISOString();
    const reorderedMenuItems = orderedIds.map((itemId) => {
      const currentItem = itemById.get(itemId);
      const requestedSection = Object.prototype.hasOwnProperty.call(sections, itemId)
        ? String(sections[itemId] || '').trim()
        : currentItem.section;
      const section = MENU_SECTIONS.includes(requestedSection) ? requestedSection : currentItem.section;

      return {
        ...currentItem,
        section,
        updatedAt: now,
        updatedBy: user.id,
      };
    });

    store.menuItems = reorderedMenuItems;
    saveStore();

    broadcast('menu-items:updated', { menuItems: store.menuItems });
    notify(`${user.name} reordered the menu`);

    return sendJson(res, 200, { menuItems: store.menuItems });
  }

  const menuItemMatch = pathname.match(/^\/api\/menu-items\/([^/]+)$/);
  if (menuItemMatch) {
    const menuItem = store.menuItems.find((entry) => entry.id === menuItemMatch[1]);
    if (!menuItem) return notFound(res);

    if (method === 'DELETE') {
      const removedName = menuItem.name;
      store.menuItems = store.menuItems.filter((entry) => entry.id !== menuItem.id);
      saveStore();
      broadcast('menu-items:updated', { menuItems: store.menuItems });
      notify(`${user.name} deleted a menu item (${removedName})`);
      return sendJson(res, 200, { ok: true, id: menuItem.id });
    }

    if (method !== 'PUT') return methodNotAllowed(res);

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name) return badRequest(res, 'Invalid menu name');
      menuItem.name = name;
    }

    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return badRequest(res, 'Invalid menu price');
      if (!isHalfStepPrice(price)) return badRequest(res, 'Menu price must be a multiple of 0.5');
      menuItem.price = Number(price.toFixed(2));
    }

    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) return badRequest(res, 'Invalid menu quantity');
      menuItem.quantity = Number(quantity.toFixed(2));
    }

    if (body.section !== undefined) {
      const section = String(body.section || '').trim();
      if (!MENU_SECTIONS.includes(section)) return badRequest(res, 'Invalid menu category');
      menuItem.section = section;
    }

    if (body.bestseller !== undefined) {
      menuItem.bestseller = body.bestseller === true;
    }

    if (body.clearImage === true) {
      menuItem.imageUrl = '';
    }

    if (body.imageDataUrl !== undefined) {
      const imageDataUrl = String(body.imageDataUrl || '').trim();
      if (imageDataUrl) {
        if (!isValidImageDataUrl(imageDataUrl)) {
          return badRequest(res, 'Invalid image format');
        }
        if (imageDataUrl.length > 2_800_000) {
          return badRequest(res, 'Image too large (max 2MB)');
        }
        menuItem.imageUrl = imageDataUrl;
      } else {
        menuItem.imageUrl = '';
      }
    }

    if (body.imageUrl !== undefined) {
      menuItem.imageUrl = String(body.imageUrl || '').trim();
    }

    menuItem.updatedAt = new Date().toISOString();
    menuItem.updatedBy = user.id;

    saveStore();
    broadcast('menu-items:updated', { menuItems: store.menuItems });
    notify(`${user.name} updated the menu (${menuItem.name})`);

    return sendJson(res, 200, { menuItem });
  }

  if (pathname === '/api/sales') {
    if (method === 'GET') {
      return sendJson(res, 200, { sales: store.sales });
    }

    if (method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      let items;
      try {
        items = parseSaleItems(body.items);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const totalsByCurrency = formatCurrencyTotals(items);
      const sale = {
        id: crypto.randomUUID(),
        items,
        totalsByCurrency,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };

      const lowStockWarnings = applyStockFromItems(items);
      store.sales.unshift(sale);
      saveStore();

      broadcast('sales:updated', { sales: store.sales });
      broadcast('inventory:updated', { inventory: store.inventory });
      notify(`${user.name} recorded a sale`);

      for (const warning of lowStockWarnings) {
        notify(`Stock alert: ${warning}`);
      }

      return sendJson(res, 201, { sale });
    }

    return methodNotAllowed(res);
  }

  if (pathname === '/api/orders') {
    if (method === 'GET') {
      if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
        try {
          await refreshOrdersFromSupabase();
        } catch (err) {
          console.error(`Orders refresh error: ${err.message}`);
        }
      }
      return sendJson(res, 200, { orders: store.orders });
    }

    if (method === 'POST') {
      if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
        try {
          await refreshOrdersFromSupabase({ force: true });
        } catch (err) {
          console.error(`Orders refresh error: ${err.message}`);
        }
      }

      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      let items;
      const fromMenu = Array.isArray(body.menuItems);
      try {
        items = fromMenu ? parseMenuOrderItems(body.menuItems) : parseSaleItems(body.items);
      } catch (err) {
        return badRequest(res, err.message);
      }
      items = buildTrackedOrderItems(items);
      const source = fromMenu ? 'menu' : 'caisse';
      const paymentMethod = normalizeOrderPaymentMethod(body.paymentMethod, fromMenu ? 'cash' : 'unknown');
      const createdAt = new Date().toISOString();

      const steps = [
        {
          key: 'recu',
          label: 'Order received',
          done: true,
          doneAt: createdAt,
          doneBy: user.id,
        },
        {
          key: 'preparation',
          label: 'Preparing',
          done: false,
          doneAt: null,
          doneBy: null,
        },
        {
          key: 'pret',
          label: 'Order ready',
          done: false,
          doneAt: null,
          doneBy: null,
        },
        {
          key: 'servi',
          label: 'Order served',
          done: false,
          doneAt: null,
          doneBy: null,
        },
      ];

      const nextOrderNumber = store.orders.reduce((maxValue, entry) => {
        const value = Number(entry.orderNumber || 0);
        return Number.isInteger(value) && value > maxValue ? value : maxValue;
      }, 0) + 1;

      const order = {
        id: crypto.randomUUID(),
        orderNumber: nextOrderNumber,
        items,
        totalsByCurrency: formatCurrencyTotals(items),
        status: 'new',
        archived: false,
        archivedAt: null,
        source,
        paymentMethod,
        assignedTo: body.assignedTo || null,
        notes: String(body.notes || '').trim(),
        steps,
        createdBy: user.id,
        createdAt,
      };

      let menuStockWarnings = [];
      let menuInventoryChanged = false;
      if (fromMenu) {
        const now = new Date().toISOString();
        for (const line of items) {
          const menuItem = store.menuItems.find((entry) => entry.id === line.menuItemId);
          if (!menuItem) continue;
          const currentQty = Number(menuItem.quantity || 0);
          const nextQty = Number((currentQty - Number(line.qty || 0)).toFixed(2));
          menuItem.quantity = nextQty >= 0 ? nextQty : 0;
          menuItem.updatedAt = now;
          menuItem.updatedBy = user.id;
        }

        menuStockWarnings = applyStockFromItems(items);
        menuInventoryChanged = items.some((line) => line.stockItemId && Number(line.stockUsage || 0) > 0);
      }

      store.orders.unshift(order);
      saveStore();
      await persistOrderToSupabaseNow(order);

      if (fromMenu && menuDrafts.size > 0) {
        menuDrafts.clear();
        broadcastMenuDrafts();
      }

      broadcast('orders:updated', { orders: store.orders });
      if (fromMenu) {
        broadcast('menu-items:updated', { menuItems: store.menuItems });
      }
      if (menuInventoryChanged) {
        broadcast('inventory:updated', { inventory: store.inventory });
      }
      for (const warning of menuStockWarnings) {
        notify(`Stock alert: ${warning}`);
      }
      notify(`New team order #${order.id.slice(0, 6)}`);

      return sendJson(res, 201, {
        order,
        menuItems: fromMenu ? store.menuItems : undefined,
        inventory: menuInventoryChanged ? store.inventory : undefined,
      });
    }

    return methodNotAllowed(res);
  }

  const orderAssignMatch = pathname.match(/^\/api\/orders\/([^/]+)\/assign$/);
  if (orderAssignMatch) {
    if (method !== 'PATCH') return methodNotAllowed(res);

    if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
      try {
        await refreshOrdersFromSupabase({ force: true });
      } catch (err) {
        console.error(`Orders refresh error: ${err.message}`);
      }
    }

    const order = store.orders.find((entry) => entry.id === orderAssignMatch[1]);
    if (!order) return notFound(res);

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const assignedTo = body.assignedTo ? String(body.assignedTo) : null;
    if (assignedTo && !store.users.find((entry) => entry.id === assignedTo)) {
      return badRequest(res, 'User not found');
    }

    order.assignedTo = assignedTo;
    order.updatedAt = new Date().toISOString();
    saveStore();
    await persistOrderToSupabaseNow(order);

    broadcast('orders:updated', { orders: store.orders });
    const assignedUser = store.users.find((entry) => entry.id === assignedTo);
    notify(`Order #${order.id.slice(0, 6)} assigned to ${assignedUser ? assignedUser.name : 'nobody'}`);

    return sendJson(res, 200, { order });
  }

  const orderItemMatch = pathname.match(/^\/api\/orders\/([^/]+)\/items\/([^/]+)$/);
  if (orderItemMatch) {
    if (method !== 'PATCH') return methodNotAllowed(res);

    if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
      try {
        await refreshOrdersFromSupabase({ force: true });
      } catch (err) {
        console.error(`Orders refresh error: ${err.message}`);
      }
    }

    const [_, orderId, lineId] = orderItemMatch;
    const order = store.orders.find((entry) => entry.id === orderId);
    if (!order) return notFound(res);

    const item = Array.isArray(order.items) ? order.items.find((entry) => String(entry.lineId || '') === lineId) : null;
    if (!item) return notFound(res);

    let body = {};
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const delivered = typeof body.delivered === 'boolean' ? body.delivered : !item.delivered;
    const changedAt = new Date().toISOString();
    item.delivered = delivered;
    item.deliveredAt = delivered ? changedAt : null;
    item.deliveredBy = delivered ? user.id : null;

    const shouldArchive = areAllOrderItemsDelivered(order);
    order.archived = shouldArchive;
    order.archivedAt = shouldArchive ? (order.archivedAt || changedAt) : null;
    order.status = recalcOrderStatus(order);
    order.updatedAt = changedAt;

    saveStore();
    await persistOrderToSupabaseNow(order);

    broadcast('orders:updated', { orders: store.orders });
    notify(`${user.name} ${delivered ? 'confirmed' : 'reverted'} delivery of ${item.name}`);

    return sendJson(res, 200, { order });
  }

  const orderStepMatch = pathname.match(/^\/api\/orders\/([^/]+)\/steps\/([^/]+)$/);
  if (orderStepMatch) {
    if (method !== 'PATCH') return methodNotAllowed(res);

    if (SUPABASE_ENABLED && IS_VERCEL_RUNTIME) {
      try {
        await refreshOrdersFromSupabase({ force: true });
      } catch (err) {
        console.error(`Orders refresh error: ${err.message}`);
      }
    }

    const [_, orderId, stepKey] = orderStepMatch;
    const order = store.orders.find((entry) => entry.id === orderId);
    if (!order) return notFound(res);

    const step = order.steps.find((entry) => entry.key === stepKey);
    if (!step) return notFound(res);

    let body = {};
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const done = typeof body.done === 'boolean' ? body.done : !step.done;
    const changedAt = new Date().toISOString();
    step.done = done;
    step.doneAt = done ? changedAt : null;
    step.doneBy = done ? user.id : null;
    order.status = recalcOrderStatus(order);
    order.updatedAt = changedAt;

    saveStore();
    await persistOrderToSupabaseNow(order);

    broadcast('orders:updated', { orders: store.orders });
    notify(`${user.name} updated ${step.label} (order #${order.id.slice(0, 6)})`);

    return sendJson(res, 200, { order });
  }

  if (pathname === '/api/service-schedule') {
    if (method !== 'GET') return methodNotAllowed(res);

    const serviceSchedule = [...store.serviceSchedule].sort((left, right) => left.date.localeCompare(right.date));
    return sendJson(res, 200, { serviceSchedule });
  }

  const serviceScheduleMatch = pathname.match(/^\/api\/service-schedule\/([^/]+)$/);
  if (serviceScheduleMatch) {
    if (method !== 'PUT') return methodNotAllowed(res);

    const date = String(serviceScheduleMatch[1] || '').trim();
    if (!isISODateString(date)) {
      return badRequest(res, 'Invalid date. Expected format: YYYY-MM-DD');
    }

    let body;
    try {
      body = await parseBody(req);
    } catch (err) {
      return badRequest(res, err.message);
    }

    const assignedUserIdsInput = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : [];
    const assignedUserIds = [...new Set(assignedUserIdsInput.map((value) => String(value || '').trim()).filter(Boolean))];

    const assignableUsers = store.users.filter((entry) => entry.role === 'volunteer' || entry.role === 'prep');
    const assignableUserIds = new Set(assignableUsers.map((entry) => entry.id));
    const hasInvalidUser = assignedUserIds.some((userId) => !assignableUserIds.has(userId));
    if (hasInvalidUser) {
      return badRequest(res, 'One or more volunteers are invalid');
    }

    let entry = store.serviceSchedule.find((item) => item.date === date);
    const now = new Date().toISOString();

    if (!entry) {
      entry = {
        id: crypto.randomUUID(),
        date,
        assignedUserIds: [],
        createdAt: now,
        createdBy: user.id,
        updatedAt: null,
        updatedBy: null,
      };
      store.serviceSchedule.push(entry);
    }

    entry.assignedUserIds = assignedUserIds;
    entry.updatedAt = now;
    entry.updatedBy = user.id;

    store.serviceSchedule.sort((left, right) => left.date.localeCompare(right.date));
    saveStore();

    broadcast('service-schedule:updated', { serviceSchedule: store.serviceSchedule });
    notify(`${user.name} updated service for ${date}`);

    return sendJson(res, 200, { entry });
  }

  if (pathname === '/api/tasks') {
    if (method === 'GET') {
      return sendJson(res, 200, { tasks: store.tasks });
    }

    if (method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const title = String(body.title || '').trim();
      const date = String(body.date || '').trim();
      const start = String(body.start || '').trim();
      const end = String(body.end || '').trim();
      const assignedTo = body.assignedTo ? String(body.assignedTo) : null;
      const description = String(body.description || '').trim();

      if (!title || !date || !start || !end) {
        return badRequest(res, 'Title, date, start time, and end time are required');
      }

      if (assignedTo && !store.users.find((entry) => entry.id === assignedTo)) {
        return badRequest(res, 'User not found');
      }

      const task = {
        id: crypto.randomUUID(),
        title,
        date,
        start,
        end,
        assignedTo,
        description,
        status: 'todo',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };

      store.tasks.unshift(task);
      saveStore();

      broadcast('tasks:updated', { tasks: store.tasks });
      const assignedUser = store.users.find((entry) => entry.id === assignedTo);
      notify(`New task ${title}${assignedUser ? ` for ${assignedUser.name}` : ''}`);

      return sendJson(res, 201, { task });
    }

    return methodNotAllowed(res);
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const task = store.tasks.find((entry) => entry.id === taskMatch[1]);
    if (!task) return notFound(res);

    if (method === 'PATCH') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      if (body.title !== undefined) task.title = String(body.title || '').trim() || task.title;
      if (body.date !== undefined) task.date = String(body.date || '').trim() || task.date;
      if (body.start !== undefined) task.start = String(body.start || '').trim() || task.start;
      if (body.end !== undefined) task.end = String(body.end || '').trim() || task.end;
      if (body.description !== undefined) task.description = String(body.description || '').trim();
      if (body.assignedTo !== undefined) {
        const assignedTo = body.assignedTo ? String(body.assignedTo) : null;
        if (assignedTo && !store.users.find((entry) => entry.id === assignedTo)) {
          return badRequest(res, 'User not found');
        }
        task.assignedTo = assignedTo;
      }
      if (body.status !== undefined) {
        const status = String(body.status);
        if (!['todo', 'in_progress', 'done'].includes(status)) {
          return badRequest(res, 'Invalid status');
        }
        task.status = status;
      }

      saveStore();
      broadcast('tasks:updated', { tasks: store.tasks });
      notify(`${user.name} updated the task ${task.title}`);

      return sendJson(res, 200, { task });
    }

    if (method === 'DELETE') {
      store.tasks = store.tasks.filter((entry) => entry.id !== task.id);
      saveStore();
      broadcast('tasks:updated', { tasks: store.tasks });
      notify(`${user.name} deleted a task`);
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  }

  const accountingCountMatch = pathname.match(/^\/api\/accounting-counts\/([^/]+)$/);
  if (accountingCountMatch) {
    const accountingCountId = String(accountingCountMatch[1] || '').trim();
    const entry = store.accountingCounts.find((item) => item.id === accountingCountId);
    if (!entry) return notFound(res);

    if (method === 'PUT' || method === 'PATCH') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const countedBy = String(body.countedBy ?? entry.countedBy ?? '').trim();
      const countedSignature = String(body.countedSignature ?? entry.countedSignature ?? '').trim();
      const verifiedBy = String(body.verifiedBy ?? entry.verifiedBy ?? '').trim();
      const verifiedSignature = String(body.verifiedSignature ?? entry.verifiedSignature ?? '').trim();
      const notes = String(body.notes ?? entry.notes ?? '').trim();
      const todayDate = new Date().toISOString().slice(0, 10);
      const fallbackCountDate = String(entry.countDate || '').trim() || todayDate;
      const fallbackExpenseAmount = Number(entry.expenseAmount || 0);

      let countDate;
      try {
        countDate = normalizeAccountingDate(body.countDate ?? fallbackCountDate, todayDate);
      } catch (err) {
        return badRequest(res, err.message);
      }

      let expenseAmount;
      try {
        expenseAmount = normalizeExpenseAmount(body.expenseAmount ?? fallbackExpenseAmount);
      } catch (err) {
        return badRequest(res, err.message);
      }

      if (!countedBy || !countedSignature || !verifiedBy || !verifiedSignature) {
        return badRequest(res, 'Counted by, Verified by, and signatures are required');
      }

      let lines;
      try {
        const sourceLines = Array.isArray(body.lines) ? body.lines : entry.lines;
        lines = normalizeAccountingLines(sourceLines);
      } catch (err) {
        return badRequest(res, err.message);
      }

      let electronicPayments;
      try {
        const entryElectronic = (entry.electronicPayments && typeof entry.electronicPayments === 'object')
          ? entry.electronicPayments
          : {};
        electronicPayments = normalizeElectronicPayments(
          body.electronicPayments || {
            visaAmount: body.visaAmount ?? entryElectronic.visaAmount,
            creditAmount: body.creditAmount ?? entryElectronic.creditAmount,
          },
        );
      } catch (err) {
        return badRequest(res, err.message);
      }

      const previousEntry = JSON.parse(JSON.stringify(entry));
      const totalAmount = roundMoney(lines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0));
      const summary = buildAccountingSummary(lines);

      entry.countedBy = countedBy;
      entry.countedSignature = countedSignature;
      entry.verifiedBy = verifiedBy;
      entry.verifiedSignature = verifiedSignature;
      entry.notes = notes;
      entry.countDate = countDate;
      entry.expenseAmount = expenseAmount;
      entry.lines = lines;
      entry.electronicPayments = electronicPayments;
      entry.totalAmount = totalAmount;
      entry.summary = summary;
      if (!entry.currency) {
        entry.currency = DEFAULT_CURRENCY;
      }

      saveStore();

      try {
        await persistAccountingCount(entry);
      } catch (err) {
        Object.assign(entry, previousEntry);
        saveStore();
        return storageUnavailable(res, err.message);
      }

      broadcast('accounting:updated', { accountingCounts: store.accountingCounts });
      notify(`${user.name} updated a count (${entry.totalAmount.toFixed(2)} ${entry.currency})`);

      return sendJson(res, 200, { entry });
    }

    if (method === 'DELETE') {
      const previousEntries = [...store.accountingCounts];
      const removedTotal = Number(entry.totalAmount || 0).toFixed(2);
      const removedCurrency = entry.currency || DEFAULT_CURRENCY;

      store.accountingCounts = store.accountingCounts.filter((item) => item.id !== accountingCountId);
      saveStore();

      try {
        await removeAccountingCount(accountingCountId);
      } catch (err) {
        store.accountingCounts = previousEntries;
        saveStore();
        return storageUnavailable(res, err.message);
      }

      broadcast('accounting:updated', { accountingCounts: store.accountingCounts });
      notify(`${user.name} deleted a count (${removedTotal} ${removedCurrency})`);

      return sendJson(res, 200, { ok: true, id: accountingCountId });
    }

    return methodNotAllowed(res);
  }

  if (pathname === '/api/accounting-counts') {
    if (method === 'GET') {
      const accountingCounts = [...(store.accountingCounts || [])]
        .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
      return sendJson(res, 200, { accountingCounts });
    }

    if (method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return badRequest(res, err.message);
      }

      const countedBy = String(body.countedBy || '').trim();
      const countedSignature = String(body.countedSignature || '').trim();
      const verifiedBy = String(body.verifiedBy || '').trim();
      const verifiedSignature = String(body.verifiedSignature || '').trim();
      const notes = String(body.notes || '').trim();
      const todayDate = new Date().toISOString().slice(0, 10);

      let countDate;
      try {
        countDate = normalizeAccountingDate(body.countDate, todayDate);
      } catch (err) {
        return badRequest(res, err.message);
      }

      let expenseAmount;
      try {
        expenseAmount = normalizeExpenseAmount(body.expenseAmount);
      } catch (err) {
        return badRequest(res, err.message);
      }

      if (!countedBy || !countedSignature || !verifiedBy || !verifiedSignature) {
        return badRequest(res, 'Counted by, Verified by, and signatures are required');
      }

      let lines;
      try {
        lines = normalizeAccountingLines(body.lines);
      } catch (err) {
        return badRequest(res, err.message);
      }

      let electronicPayments;
      try {
        electronicPayments = normalizeElectronicPayments(
          body.electronicPayments || {
            visaAmount: body.visaAmount,
            creditAmount: body.creditAmount,
          },
        );
      } catch (err) {
        return badRequest(res, err.message);
      }

      const totalAmount = roundMoney(lines.reduce((sum, line) => sum + Number(line.subtotal || 0), 0));
      const summary = buildAccountingSummary(lines);
      const entry = {
        id: crypto.randomUUID(),
        currency: DEFAULT_CURRENCY,
        countedBy,
        countedSignature,
        verifiedBy,
        verifiedSignature,
        notes,
        countDate,
        expenseAmount,
        lines,
        electronicPayments,
        totalAmount,
        summary,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };

      store.accountingCounts.unshift(entry);
      store.accountingCounts = store.accountingCounts.slice(0, 250);
      saveStore();

      try {
        await persistAccountingCount(entry);
      } catch (err) {
        store.accountingCounts = store.accountingCounts.filter((item) => item.id !== entry.id);
        saveStore();
        return storageUnavailable(res, err.message);
      }

      broadcast('accounting:updated', { accountingCounts: store.accountingCounts });
      notify(`${user.name} submitted a count (${entry.totalAmount.toFixed(2)} ${entry.currency})`);

      return sendJson(res, 201, { entry });
    }

    return methodNotAllowed(res);
  }

  return notFound(res);
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return methodNotAllowed(res);
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(safePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });

    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(data);
    }
  });
}

let appInitPromise = null;

async function initializeApp({ log = true } = {}) {
  if (SUPABASE_ENABLED) {
    try {
      await syncStoreFromSupabase();
      supabaseReady = true;
      if (log) {
        console.log('Supabase persistence active (full store).');
      }
    } catch (err) {
      supabaseReady = false;
      if (log) {
        console.error(`Supabase init error: ${err.message}`);
        console.error('Server started in local read mode, but Supabase writes are blocked until the connection is ready.');
      }
    }
  } else if (log) {
    console.log('Supabase not configured: local storage only.');
  }
}

function ensureAppInitialized(options = {}) {
  if (appInitPromise) return appInitPromise;

  appInitPromise = initializeApp(options).catch((err) => {
    appInitPromise = null;
    throw err;
  });

  return appInitPromise;
}

async function requestHandler(req, res) {
  try {
    await ensureAppInitialized({ log: !IS_VERCEL_RUNTIME });

    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `http://${host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/api/')) {
      const user = await getSessionUser(req);
      await handleApi(req, res, pathname, user);
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
}

if (IS_VERCEL_RUNTIME) {
  module.exports = requestHandler;
} else {
  const server = http.createServer(requestHandler);

  setInterval(() => {
    broadcast('server:ping', { at: new Date().toISOString() });
  }, 25_000);

  async function startServer() {
    await ensureAppInitialized({ log: true });

    server.listen(PORT, () => {
      console.log(`CafeCFOC running on http://localhost:${PORT}`);
    });
  }

  startServer();
}
