/* eslint-disable no-undef */
(function bootstrapData(globalScope) {
  const DEFAULT_SNAPSHOT = {
    ingredients: [],
    menuItems: [],
    productionHistory: [],
    orders: [],
    customers: [],
    suppliers: [],
    purchaseOrders: [],
    inventoryMovements: [],
    tasks: [],
    communications: [],
    deliverySlots: [],
    marketingCampaigns: [],
    productionSchedule: []
  };

  const hasWindow = typeof globalScope.window !== 'undefined' || typeof window !== 'undefined';
  const runtime = hasWindow ? (globalScope.window || window) : globalScope;

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SNAPSHOT));
  }

  function createId(prefix) {
    return `${prefix || 'id'}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeSnapshot(snapshot = {}) {
    const normalized = Object.assign(cloneDefaults(), snapshot || {});
    normalized.ingredients = ensureArray(normalized.ingredients);
    normalized.menuItems = ensureArray(normalized.menuItems);
    normalized.productionHistory = ensureArray(normalized.productionHistory);
    normalized.orders = ensureArray(normalized.orders);
    normalized.customers = ensureArray(normalized.customers);
    normalized.suppliers = ensureArray(normalized.suppliers);
    normalized.purchaseOrders = ensureArray(normalized.purchaseOrders);
    normalized.inventoryMovements = ensureArray(normalized.inventoryMovements);
    normalized.tasks = ensureArray(normalized.tasks);
    normalized.communications = ensureArray(normalized.communications);
    normalized.deliverySlots = ensureArray(normalized.deliverySlots);
    normalized.marketingCampaigns = ensureArray(normalized.marketingCampaigns);
    normalized.productionSchedule = ensureArray(normalized.productionSchedule);

    normalized.ingredients.forEach(ing => {
      if (!ing.id) ing.id = createId('ingredient');
      if (!ing.unit) ing.unit = '';
      ing.quantity = Number(ing.quantity) || 0;
      ing.price = Number(ing.price) || 0;
      if (typeof ing.reorderPoint === 'undefined') ing.reorderPoint = 5;
      if (!ing.supplierId && normalized.suppliers.length) {
        ing.supplierId = normalized.suppliers[0].id;
      }
    });

    normalized.orders.forEach(order => {
      if (!order.date) order.date = new Date().toISOString().slice(0, 10);
      if (typeof order.produced === 'undefined') order.produced = false;
      if (!order.status) order.status = 'Pending';
      if (!order.id) order.id = createId('order');
      if (!order.fulfillmentType) order.fulfillmentType = 'Pickup';
      if (!order.channel) order.channel = 'Direct';
      if (!order.orderType) order.orderType = 'drop';
      order.paymentMethod = order.paymentMethod || '';
      order.paymentStatus = order.paymentStatus || (order.paymentMethod ? 'Paid' : 'Unpaid');
      order.paidAmount = Number(order.paidAmount) || 0;
      order.deposit = Number(order.deposit) || 0;
      order.paidAt = order.paidAt || null;
      if (!Array.isArray(order.items)) order.items = [];
    });

    normalized.menuItems.forEach(recipe => {
      if (!recipe.id) recipe.id = createId('recipe');
      if (!Array.isArray(recipe.ingredientsRequired)) recipe.ingredientsRequired = [];
    });

    normalized.customers.forEach(customer => {
      if (!customer.id) customer.id = createId('customer');
      if (!customer.channel) customer.channel = 'Direct';
      if (!customer.status) customer.status = 'Active';
    });

    normalized.tasks.forEach(task => {
      if (!task.id) task.id = createId('task');
      if (!task.status) task.status = 'open';
      if (!task.priority) task.priority = 'medium';
    });

    normalized.productionSchedule.forEach(item => {
      if (!item.id) item.id = createId('batch');
      if (!item.status) item.status = 'planned';
      if (!Array.isArray(item.linkedOrderIds)) item.linkedOrderIds = [];
    });

    normalized.deliverySlots = normalized.deliverySlots.length
      ? normalized.deliverySlots
      : createDefaultDeliverySlots();

    return normalized;
  }

  function createDefaultDeliverySlots() {
    const slots = [];
    const base = new Date();
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(base);
      day.setDate(base.getDate() + i);
      const date = day.toISOString().slice(0, 10);
      ['08:00-10:00', '10:00-12:00', '16:00-18:00'].forEach(window => {
        slots.push({
          id: createId('slot'),
          date,
          window,
          capacity: window === '16:00-18:00' ? 6 : 4,
          committedOrders: []
        });
      });
    }
    return slots;
  }

  function loadLegacySnapshot() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const legacy = localStorage.getItem('cinnamonSecretsData');
      return legacy ? JSON.parse(legacy) : null;
    } catch (error) {
      console.error('Failed to parse legacy localStorage snapshot', error);
      return null;
    }
  }

  async function loadDemoSnapshot() {
    if (typeof fetch !== 'function') return null;
    try {
      const baseHref = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
      const url = baseHref ? new URL('./demo-snapshot.json', baseHref).href : 'demo-snapshot.json';
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to load demo snapshot', error);
      return null;
    }
  }

  async function persistSnapshot(snapshot) {
    if (runtime.api && typeof runtime.api.saveSnapshot === 'function') {
      try {
        await runtime.api.saveSnapshot(snapshot);
      } catch (error) {
        console.error('Failed to persist snapshot via IPC', error);
      }
      return;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cinnamonSecretsData', JSON.stringify(snapshot));
      }
    } catch (error) {
      console.error('Failed to persist snapshot to localStorage', error);
    }
  }

  async function fetchSnapshot() {
    if (runtime.api && typeof runtime.api.loadSnapshot === 'function') {
      try {
        const snapshot = await runtime.api.loadSnapshot();
        if (snapshot && typeof snapshot === 'object') {
          return snapshot;
        }
      } catch (error) {
        console.error('Failed to load snapshot via IPC', error);
      }
    }
    return null;
  }

  async function loadData() {
    let snapshot = await fetchSnapshot();

    if (!snapshot) {
      const legacy = loadLegacySnapshot();
      if (legacy) {
        snapshot = legacy;
        await persistSnapshot(snapshot);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('cinnamonSecretsData');
        }
      }
    }

    if (!snapshot) {
      const demo = await loadDemoSnapshot();
      if (demo) {
        snapshot = demo;
        await persistSnapshot(snapshot);
      }
    }

    if (!snapshot) {
      snapshot = cloneDefaults();
      await persistSnapshot(snapshot);
    }

    runtime.data = normalizeSnapshot(snapshot);
    return runtime.data;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEFAULT_SNAPSHOT,
      cloneDefaults,
      normalizeSnapshot,
      createId
    };
    return;
  }

  runtime.data = cloneDefaults();
  runtime.normalizeSnapshot = normalizeSnapshot;
  runtime.loadData = loadData;
  runtime.persistDataSnapshot = persistSnapshot;
  runtime.createRuntimeId = createId;
})(typeof globalThis !== 'undefined' ? globalThis : this);
