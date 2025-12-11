(() => {
  const VIEW_LABELS = {
    'dashboard-view': 'Dashboard',
    'inventory-view': 'Inventory',
    'production-view': 'Production',
    'orders-view': 'Orders',
    'customers-view': 'Customers',
    'suppliers-view': 'Suppliers',
    'calendar-view': 'Calendar',
    'archives-view': 'Archives'
  };

  const CHANNELS = ['Direct', 'Instagram', 'Website'];
  const FULFILLMENT_OPTIONS = ['Pickup', 'Delivery'];
  const ORDER_STATUSES = ['Pending', 'Produced', 'Fulfilled', 'Cancelled'];
  const BATCH_STATUSES = ['planned', 'in-progress', 'complete'];

  const state = {
    activeView: 'dashboard-view',
    metricRange: '30',
    orderFilters: { search: '', status: '', channel: '' },
    customerFilters: { search: '', channel: '' },
    purchaseOrderFilter: 'open',
    selectedCustomerId: null,
    selectedSupplierId: null,
    editingOrderId: null,
    editingBatchId: null,
    calendarCursor: null,
    archives: []
  };

  const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const longDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  let toastTimeout = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    toggleLoading(true);
    if (typeof window.loadData === 'function') {
      await window.loadData();
    }
    window.data = window.normalizeSnapshot(window.data);
    hydrateSelections();
    state.calendarCursor = startOfMonth(new Date());
    bindNavigation();
    bindGlobalButtons();
    bindModalDismissals();
    bindForms();
    bindFilters();
    bindTables();
    renderAll();
    setActiveView(state.activeView);
    void renderArchives();
    toggleLoading(false);
  }

  function hydrateSelections() {
    if (!state.selectedCustomerId && window.data.customers.length) {
      state.selectedCustomerId = window.data.customers[0].id;
    }
    if (!state.selectedSupplierId && window.data.suppliers.length) {
      state.selectedSupplierId = window.data.suppliers[0].id;
    }
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-link').forEach(button => {
      button.addEventListener('click', () => setActiveView(button.dataset.target));
    });
  }

  function bindGlobalButtons() {
    attachClick('add-ingredient-btn', () => openIngredientModal());
    attachClick('add-recipe-btn', () => openRecipeModal());
    attachClick('create-po-btn', () => openPurchaseOrderModal());
    attachClick('log-adjustment-btn', () => openAdjustmentModal());
    attachClick('schedule-batch-btn', () => openBatchModal());
    attachClick('quick-batch-btn', () => openBatchModal());
    attachClick('quick-order-btn', () => openOrderModal());
    attachClick('new-order-btn', () => openOrderModal());
    attachClick('new-task-btn', () => openTaskModal());
    attachClick('log-communication-btn', () => openCommunicationModal());
    attachClick('add-supplier-btn', () => openSupplierModal());
    attachClick('manual-archive-btn', () => manualArchive());
    attachClick('export-report', () => exportMonthlyReport());
    attachClick('print-run-sheet', () => window.print());
    attachClick('export-data', () => exportSnapshot());
    attachClick('import-data', () => {
      const input = getById('import-file');
      if (input) input.click();
    });
    attachClick('reset-data', () => confirmReset());
    attachClick('po-filter-open', () => togglePurchaseOrderFilter());
    attachClick('prev-month', () => shiftCalendar(-1));
    attachClick('next-month', () => shiftCalendar(1));
    const importInput = getById('import-file');
    if (importInput) {
      importInput.addEventListener('change', handleSnapshotImport);
    }
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => hideModal(btn.dataset.close));
    });
  }

  function bindModalDismissals() {
    document.querySelectorAll('.modal').forEach(modal => {
      if (!modal.id || modal.id === 'loading-modal') return;
      modal.addEventListener('click', event => {
        if (event.target === modal) {
          hideModal(modal.id);
        }
      });
    });
  }

  function bindForms() {
    const ingredientForm = getById('ingredient-modal-form');
    if (ingredientForm) {
      ingredientForm.addEventListener('submit', handleIngredientSubmit);
    }

    const recipeForm = getById('recipe-modal-form');
    if (recipeForm) {
      recipeForm.addEventListener('submit', handleRecipeSubmit);
      attachClick('add-recipe-modal-ingredient', () => addRecipeIngredientRow());
    }

    const orderForm = getById('order-form');
    if (orderForm) {
      orderForm.addEventListener('submit', handleOrderSubmit);
      attachClick('add-order-item', () => addOrderItemRow());
    }

    const taskForm = getById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', handleTaskSubmit);
    }

    const communicationForm = getById('communication-form');
    if (communicationForm) {
      communicationForm.addEventListener('submit', handleCommunicationSubmit);
    }

    const customerForm = getById('customer-form');
    if (customerForm) {
      customerForm.addEventListener('submit', handleCustomerSubmit);
    }

    const supplierForm = getById('supplier-form');
    if (supplierForm) {
      supplierForm.addEventListener('submit', handleSupplierSubmit);
    }

    const purchaseOrderForm = getById('purchase-order-form');
    if (purchaseOrderForm) {
      purchaseOrderForm.addEventListener('submit', handlePurchaseOrderSubmit);
      attachClick('add-po-item', () => addPurchaseOrderItemRow());
    }

    const adjustmentForm = getById('adjustment-form');
    if (adjustmentForm) {
      adjustmentForm.addEventListener('submit', handleAdjustmentSubmit);
    }

    const batchForm = getById('batch-form');
    if (batchForm) {
      batchForm.addEventListener('submit', handleBatchSubmit);
    }
  }

  function bindFilters() {
    attachInput('order-search', value => {
      state.orderFilters.search = value;
      renderOrders();
    });
    attachChange('order-status-filter', value => {
      state.orderFilters.status = value;
      renderOrders();
    });
    attachChange('order-channel-filter', value => {
      state.orderFilters.channel = value;
      renderOrders();
    });
    attachInput('customer-search', value => {
      state.customerFilters.search = value;
      renderCustomers();
    });
    attachChange('customer-channel-filter', value => {
      state.customerFilters.channel = value;
      renderCustomers();
    });
    attachChange('kpi-range', value => {
      state.metricRange = value || 'all';
      renderMetricGrid();
      if (typeof updateCharts === 'function') {
        updateCharts(state.metricRange);
      }
    });
  }

  function bindTables() {
    const ingredientTable = getById('ingredients-table');
    if (ingredientTable) {
      ingredientTable.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const id = button.dataset.id;
        if (button.dataset.action === 'edit-ingredient') {
          openIngredientModal(window.data.ingredients.find(i => i.id === id));
        }
        if (button.dataset.action === 'delete-ingredient') {
          confirmDelete('Delete this ingredient?', () => {
            window.data.ingredients = window.data.ingredients.filter(i => i.id !== id);
            persistAndRefresh(['inventory', 'orders']);
          });
        }
      });
    }

    const ordersTable = getById('orders-table');
    if (ordersTable) {
      ordersTable.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const order = window.data.orders.find(o => o.id === button.dataset.id);
        if (!order) return;
        if (button.dataset.action === 'edit-order') {
          openOrderModal(order);
        }
        if (button.dataset.action === 'delete-order') {
          confirmDelete('Delete this order?', () => {
            window.data.orders = window.data.orders.filter(o => o.id !== order.id);
            persistAndRefresh(['orders', 'production', 'dashboard', 'calendar']);
          });
        }
        if (button.dataset.action === 'advance-order') {
          advanceOrderStatus(order);
        }
      });
    }

    const customersTable = getById('customers-table');
    if (customersTable) {
      customersTable.addEventListener('click', event => {
        const row = event.target.closest('tr[data-id]');
        if (!row) return;
        state.selectedCustomerId = row.dataset.id;
        renderCustomersTable();
        renderCustomerDetail(state.selectedCustomerId);
        renderCommunicationsLog(state.selectedCustomerId);
      });
    }

    const suppliersTable = getById('suppliers-table');
    if (suppliersTable) {
      suppliersTable.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (button) {
          const supplier = window.data.suppliers.find(s => s.id === button.dataset.id);
          if (button.dataset.action === 'delete-supplier' && supplier) {
            confirmDelete('Delete this supplier? Linked ingredients and purchase orders will no longer reference it.', () => {
              deleteSupplier(supplier.id);
            });
            return;
          }
          if (button.dataset.action === 'edit-supplier' && supplier) {
            openSupplierModal(supplier);
            return;
          }
        }
        const row = event.target.closest('tr[data-id]');
        if (!row) return;
        state.selectedSupplierId = row.dataset.id;
        renderSuppliers();
      });
    }

    const productionBoard = getById('production-board');
    if (productionBoard) {
      productionBoard.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const batch = window.data.productionSchedule.find(b => b.id === button.dataset.id);
        if (!batch) return;
        if (button.dataset.action === 'edit-batch') {
          openBatchModal(batch);
        }
        if (button.dataset.action === 'advance-batch') {
          advanceBatchStatus(batch);
        }
      });
    }
  }

  function renderAll() {
    renderDashboard();
    renderInventory();
    renderProduction();
    renderOrders();
    renderCustomers();
    renderSuppliers();
    renderCalendar();
  }

  function renderDashboard() {
    renderMetricGrid();
    renderUpcomingList();
    if (typeof updateCharts === 'function') {
      updateCharts(state.metricRange);
    }
  }

  function renderMetricGrid() {
    const grid = getById('metric-grid');
    if (!grid) return;
    const orders = window.data.orders || [];
    const openOrders = orders.filter(o => o.status !== 'Fulfilled' && o.status !== 'Cancelled');
    const rangeOrders = filterOrdersByRange(orders);
    const rangeRevenue = rangeOrders.reduce((sum, order) => sum + computeOrderTotal(order), 0);
    const avgOrderValue = rangeOrders.length ? (rangeRevenue / rangeOrders.length) : 0;
    const fulfilledInRange = rangeOrders.filter(order => order.status === 'Fulfilled').length;
    const lowStock = window.data.ingredients.filter(i => i.quantity <= (i.reorderPoint || 4)).length;
    const tasksOpen = window.data.tasks.filter(t => t.status !== 'done').length;
    const rangeLabel = state.metricRange === 'all' ? 'All Time' : `${state.metricRange} Days`;

    const metrics = [
      { label: `Revenue (${rangeLabel})`, value: formatCurrency(rangeRevenue), sub: `${rangeOrders.length} orders in range` },
      { label: `Completed (${rangeLabel})`, value: fulfilledInRange, sub: 'Orders marked fulfilled' },
      { label: 'Avg Order Value', value: formatCurrency(avgOrderValue || 0), sub: `${rangeLabel} window` },
      { label: 'Open Orders', value: openOrders.length, sub: 'Awaiting fulfilment' },
      { label: 'Low Stock Items', value: lowStock, sub: 'Below reorder point' },
      { label: 'Active Tasks', value: tasksOpen, sub: 'Operations + CRM' }
    ];

    grid.innerHTML = metrics.map(metric => `
      <div class="metric-card">
        <div class="metric-value">${metric.value || 0}</div>
        <div class="metric-label">${metric.label}</div>
        <div class="metric-sub">${metric.sub}</div>
      </div>
    `).join('');
  }

  function renderUpcomingList() {
    const list = getById('upcoming-list');
    if (!list) return;
    const today = startOfDay(new Date());
    const limit = addDays(today, 7);
    const entries = [];

    (window.data.orders || []).forEach(order => {
      const date = getOrderDate(order);
      if (!date) return;
      if (date >= today && date <= limit) {
        const orderItems = getOrderItems(order);
        entries.push({
          date,
          label: `${order.customerName || 'Walk-in'} • ${order.status}`,
          detail: `${orderItems.length} items (${formatCurrency(computeOrderTotal(order))})`
        });
      }
    });

    (window.data.tasks || []).forEach(task => {
      if (!task.dueDate) return;
      const date = startOfDay(task.dueDate);
      if (!date) return;
      if (date >= today && date <= limit && task.status !== 'done') {
        entries.push({
          date,
          label: `Task: ${task.title}`,
          detail: task.category || 'General'
        });
      }
    });

    (window.data.purchaseOrders || []).forEach(po => {
      if (!po.expectedDate) return;
      const date = startOfDay(po.expectedDate);
      if (!date) return;
      if (date >= today && date <= limit && po.status !== 'Received') {
        entries.push({
          date,
          label: `PO ${po.reference || po.id.slice(-5)} • ${po.status}`,
          detail: supplierName(po.supplierId)
        });
      }
    });

    entries.sort((a, b) => a.date - b.date);
    if (!entries.length) {
      list.innerHTML = '<div class="empty-state">Nothing scheduled for the next 7 days.</div>';
      return;
    }
    list.innerHTML = entries.map(entry => `
      <div class="list-row">
        <div class="list-date">${shortDate.format(entry.date)}</div>
        <div>
          <div class="list-label">${entry.label}</div>
          <div class="list-detail">${entry.detail || ''}</div>
        </div>
      </div>
    `).join('');
  }

  function renderInventory() {
    renderIngredientsTable();
    renderLowStockAlert();
    renderPurchaseOrders();
    renderInventoryMovements();
  }

  function renderIngredientsTable() {
    const table = getById('ingredients-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!window.data.ingredients.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No ingredients yet</td></tr>';
      return;
    }
    window.data.ingredients.forEach(ingredient => {
      const supplier = supplierName(ingredient.supplierId);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="cell-primary">${ingredient.name}</div>
          ${ingredient.notes ? `<div class="cell-sub">${ingredient.notes}</div>` : ''}
        </td>
        <td>${ingredient.quantity} ${ingredient.unit || ''}</td>
        <td>${formatCurrency(ingredient.price || 0)}</td>
        <td>${ingredient.reorderPoint || '—'}</td>
        <td>${supplier}</td>
        <td>
          <button class="link-btn" data-action="edit-ingredient" data-id="${ingredient.id}">Edit</button>
          <button class="link-btn danger" data-action="delete-ingredient" data-id="${ingredient.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function renderLowStockAlert() {
    const alert = getById('low-stock-alert');
    if (!alert) return;
    const low = window.data.ingredients.filter(i => i.quantity <= (i.reorderPoint || 4));
    if (!low.length) {
      alert.classList.add('hidden');
      alert.textContent = '';
      return;
    }
    alert.classList.remove('hidden');
    alert.innerHTML = `Low stock: ${low.map(i => `<strong>${i.name}</strong> (${i.quantity})`).join(', ')}`;
  }

  function renderPurchaseOrders() {
    const container = getById('purchase-order-list');
    if (!container) return;
    let pos = [...window.data.purchaseOrders];
    if (state.purchaseOrderFilter === 'open') {
      pos = pos.filter(po => po.status !== 'Received');
    }
    pos.sort((a, b) => new Date(a.expectedDate || 0) - new Date(b.expectedDate || 0));
    if (!pos.length) {
      container.innerHTML = '<div class="empty-state">No purchase orders.</div>';
      return;
    }
    container.innerHTML = pos.map(po => `
      <div class="list-row">
        <div>
          <div class="list-label">${po.reference || `PO ${po.id.slice(-5)}`}</div>
          <div class="list-detail">${supplierName(po.supplierId)} • ${po.status}</div>
        </div>
        <div>
          ${po.expectedDate ? shortDate.format(new Date(po.expectedDate)) : 'No date'}
        </div>
      </div>
    `).join('');
  }

  function renderInventoryMovements() {
    const log = getById('inventory-movements-log');
    if (!log) return;
    const entries = [...window.data.inventoryMovements].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!entries.length) {
      log.innerHTML = '<div class="empty-state">No adjustments recorded.</div>';
      return;
    }
    log.innerHTML = entries.map(entry => {
      const ingredient = window.data.ingredients.find(i => i.id === entry.ingredientId);
      return `
        <div class="timeline-row">
          <div class="timeline-date">${shortDate.format(new Date(entry.date))}</div>
          <div>
            <div class="timeline-label">${entry.type.toUpperCase()} • ${ingredient ? ingredient.name : 'Ingredient'}</div>
            <div class="timeline-detail">${entry.quantity > 0 ? '+' : ''}${entry.quantity} — ${entry.note || 'No note'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderProduction() {
    renderProductionBoard();
    renderOrderQueue();
  }

  function renderProductionBoard() {
    const board = getById('production-board');
    if (!board) return;
    const columns = BATCH_STATUSES.map(status => {
      const batches = window.data.productionSchedule.filter(b => b.status === status);
      const cards = batches.map(batch => `
        <div class="kanban-card">
          <div class="card-label">${menuItemName(batch.recipeId)}</div>
          <div class="card-detail">${batch.quantity || 0} units • ${batch.scheduleDate || 'No date'}</div>
          <div class="card-actions">
            <button class="link-btn" data-action="edit-batch" data-id="${batch.id}">Edit</button>
            <button class="link-btn" data-action="advance-batch" data-id="${batch.id}">Advance</button>
          </div>
        </div>
      `).join('');
      return `
        <div class="kanban-column">
          <div class="kanban-title">${status.replace('-', ' ')}</div>
          ${cards || '<div class="empty-state">No batches</div>'}
        </div>
      `;
    }).join('');
    board.innerHTML = columns;
  }

  function renderOrderQueue() {
    const list = getById('unproduced-orders-list');
    if (!list) return;
    const queue = window.data.orders.filter(o => o.status === 'Pending');
    if (!queue.length) {
      list.innerHTML = '<div class="empty-state">No pending orders.</div>';
      return;
    }
    list.innerHTML = queue.map(order => `
      <div class="list-row">
        <div>
          <div class="list-label">${order.customerName || 'Walk-in'}</div>
          <div class="list-detail">${getOrderItems(order).length} items • ${formatCurrency(computeOrderTotal(order))}</div>
        </div>
        <button class="link-btn" data-action="edit-order" data-id="${order.id}">Open</button>
      </div>
    `).join('');
  }

  function renderOrders() {
    renderOrdersTable();
    renderOrderTimeline();
  }

  function renderOrdersTable() {
    const table = getById('orders-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    let orders = [...window.data.orders];
    const { search, status, channel } = state.orderFilters;
    if (status) orders = orders.filter(order => order.status === status);
    if (channel) orders = orders.filter(order => (order.channel || 'Direct') === channel);
    if (search) {
      const term = search.toLowerCase();
      orders = orders.filter(order => {
        const customer = (order.customerName || '').toLowerCase();
        const items = getOrderItems(order).map(item => menuItemName(item.itemId).toLowerCase()).join(' ');
        return customer.includes(term) || items.includes(term) || (order.pickupDate || '').includes(term);
      });
    }
    orders.sort((a, b) => new Date(a.pickupDate || a.date) - new Date(b.pickupDate || b.date));
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">No orders match filters.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(order => {
      const orderItems = getOrderItems(order);
      const totalQty = orderItems.reduce((sum, item) => sum + (item.qty || 0), 0);
      const totalPrice = formatCurrency(computeOrderTotal(order));
      const itemDetails = orderItems.map(item => `${menuItemName(item.itemId)} × ${item.qty}`).join('<br>');
      const fulfillment = order.fulfillmentType || 'Pickup';
      const pickup = order.pickupDate ? shortDate.format(new Date(order.pickupDate)) : '—';
      const channelLabel = order.channel || 'Direct';
      return `
        <tr>
          <td>${order.date || '—'}</td>
          <td>${order.customerName || 'Walk-in'}</td>
          <td>${itemDetails}</td>
          <td>${totalQty}</td>
          <td>${totalPrice}</td>
          <td>${order.status}</td>
          <td>${fulfillment}</td>
          <td>${pickup}<br><span class="badge">${channelLabel}</span></td>
          <td>
            <button class="link-btn" data-action="edit-order" data-id="${order.id}">Edit</button>
            <button class="link-btn" data-action="advance-order" data-id="${order.id}">Advance</button>
            <button class="link-btn danger" data-action="delete-order" data-id="${order.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderOrderTimeline() {
    const timeline = getById('order-timeline');
    if (!timeline) return;
    const entries = [...window.data.orders]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15);
    if (!entries.length) {
      timeline.innerHTML = '<div class="empty-state">No recent orders.</div>';
      return;
    }
    timeline.innerHTML = entries.map(entry => `
      <div class="timeline-row">
        <div class="timeline-date">${longDate.format(new Date(entry.date))}</div>
        <div>
          <div class="timeline-label">${entry.customerName || 'Walk-in'} (${entry.status})</div>
          <div class="timeline-detail">${getOrderItems(entry).length} items • ${formatCurrency(computeOrderTotal(entry))}</div>
        </div>
      </div>
    `).join('');
  }

  function renderCustomers() {
    renderCustomersTable();
    renderCustomerDetail(state.selectedCustomerId);
    renderCommunicationsLog(state.selectedCustomerId);
  }

  function renderCustomersTable() {
    const table = getById('customers-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    let customers = [...window.data.customers];
    const { search, channel } = state.customerFilters;
    if (channel) customers = customers.filter(c => (c.channel || 'Direct') === channel);
    if (search) {
      const term = search.toLowerCase();
      customers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term)
      );
    }
    customers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (!customers.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No customers found.</td></tr>';
      return;
    }
    tbody.innerHTML = customers.map(customer => {
      const orders = window.data.orders.filter(o => o.customerId === customer.id).length;
      return `
        <tr data-id="${customer.id}" class="${customer.id === state.selectedCustomerId ? 'active' : ''}">
          <td>${customer.name}</td>
          <td>${customer.phone || '—'}<br>${customer.email || ''}</td>
          <td>${customer.channel || 'Direct'}</td>
          <td>${orders}</td>
          <td><button class="link-btn" data-id="${customer.id}">Inspect</button></td>
        </tr>
      `;
    }).join('');
  }

  function renderCustomerDetail(customerId) {
    const form = getById('customer-form');
    if (!form) return;
    const customer = window.data.customers.find(c => c.id === customerId);
    form.reset();
    if (!customer) return;
    getById('customer-id').value = customer.id;
    getById('customer-name').value = customer.name || '';
    getById('customer-phone').value = customer.phone || '';
    getById('customer-email').value = customer.email || '';
    getById('customer-channel').value = customer.channel || 'Direct';
    getById('customer-notes').value = customer.notes || '';
  }

  function renderCommunicationsLog(customerId) {
    const log = getById('communications-log');
    if (!log) return;
    const entries = window.data.communications
      .filter(entry => !customerId || entry.customerId === customerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!entries.length) {
      log.innerHTML = '<div class="empty-state">No touchpoints recorded.</div>';
      return;
    }
    log.innerHTML = entries.map(entry => `
      <div class="timeline-row">
        <div class="timeline-date">${shortDate.format(new Date(entry.date))}</div>
        <div>
          <div class="timeline-label">${entry.channel} • ${customerName(entry.customerId)}</div>
          <div class="timeline-detail">${entry.subject || '(No subject)'} — ${entry.message}</div>
        </div>
      </div>
    `).join('');
  }

  function renderSuppliers() {
    renderSuppliersTable();
    renderSupplierDetail(state.selectedSupplierId);
  }

  function renderSuppliersTable() {
    const table = getById('suppliers-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!window.data.suppliers.length) {
      state.selectedSupplierId = null;
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No suppliers yet.</td></tr>';
      return;
    }
    if (!state.selectedSupplierId || !window.data.suppliers.some(s => s.id === state.selectedSupplierId)) {
      state.selectedSupplierId = window.data.suppliers[0]?.id || null;
    }
    tbody.innerHTML = window.data.suppliers.map(supplier => `
      <tr data-id="${supplier.id}" class="${supplier.id === state.selectedSupplierId ? 'active' : ''}">
        <td>${supplier.name}</td>
        <td>${supplier.contactName || '—'}<br>${supplier.email || ''}</td>
        <td>${supplier.leadTimeDays || '—'} days</td>
        <td>${supplier.terms || '—'}</td>
        <td>
          <button class="link-btn" data-id="${supplier.id}">Inspect</button>
          <button class="link-btn" data-action="edit-supplier" data-id="${supplier.id}">Edit</button>
          <button class="link-btn danger" data-action="delete-supplier" data-id="${supplier.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function renderSupplierDetail(supplierId) {
    const panel = getById('supplier-detail');
    if (!panel) return;
    const supplier = window.data.suppliers.find(s => s.id === supplierId);
    if (!supplier) {
      panel.innerHTML = '<div class="empty-state">Select a supplier to view details.</div>';
      return;
    }
    panel.innerHTML = `
      <p><strong>Contact:</strong> ${supplier.contactName || '—'}</p>
      <p><strong>Phone:</strong> ${supplier.phone || '—'}</p>
      <p><strong>Email:</strong> ${supplier.email || '—'}</p>
      <p><strong>Lead Time:</strong> ${supplier.leadTimeDays || '—'} days</p>
      <p><strong>Terms:</strong> ${supplier.terms || '—'}</p>
      <p><strong>Notes:</strong><br>${supplier.notes || 'No notes yet.'}</p>
      <div class="panel-actions">
        <button class="secondary" id="edit-supplier-btn">Edit Supplier</button>
        <button class="danger" id="delete-supplier-btn">Delete Supplier</button>
      </div>
    `;
    const editBtn = getById('edit-supplier-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => openSupplierModal(supplier));
    }
    const deleteBtn = getById('delete-supplier-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        confirmDelete('Delete this supplier? Linked records will keep their data but no supplier will be attached.', () => {
          deleteSupplier(supplier.id);
        });
      });
    }
  }

  function renderCalendar() {
    const board = getById('calendar-board');
    if (!board || !state.calendarCursor) return;
    const cursor = new Date(state.calendarCursor);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = dateKey(new Date());

    const bucketByDate = (collection = [], extractor) => collection.reduce((acc, item) => {
      const key = dateKey(extractor(item));
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const ordersByDate = bucketByDate(window.data.orders || [], order => getOrderDate(order));
    const batchesByDate = bucketByDate(window.data.productionSchedule || [], batch => batch.scheduleDate);
    const tasksByDate = bucketByDate((window.data.tasks || []).filter(task => task.status !== 'done'), task => task.dueDate);

    const rows = [];
    let day = 1;
    while (day <= daysInMonth) {
      const cells = [];
      for (let i = 0; i < 7; i += 1) {
        if ((rows.length === 0 && i < firstDayIndex) || day > daysInMonth) {
          cells.push('<td class="calendar-empty"><div class="calendar-cell muted"></div></td>');
        } else {
          const cellDate = new Date(year, month, day);
          const key = dateKey(cellDate);
          const orders = ordersByDate[key] || [];
          const batches = batchesByDate[key] || [];
          const tasks = tasksByDate[key] || [];
          const classes = ['calendar-cell'];
          if (key === todayKey) classes.push('is-today');
          if (orders.length || batches.length || tasks.length) classes.push('has-items');
          cells.push(`
            <td>
              <div class="${classes.join(' ')}">
                <div class="calendar-day">${day}</div>
                <div class="calendar-badges">
                  ${orders.length ? `<span class="calendar-pill orders">${orders.length} orders</span>` : ''}
                  ${batches.length ? `<span class="calendar-pill batches">${batches.length} batches</span>` : ''}
                  ${tasks.length ? `<span class="calendar-pill tasks">${tasks.length} tasks</span>` : ''}
                </div>
              </div>
            </td>
          `);
          day += 1;
        }
      }
      rows.push(`<tr>${cells.join('')}</tr>`);
    }
    board.innerHTML = `
      <div class="calendar-header">
        <div>
          <p class="eyebrow">Planning</p>
          <h4>${cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
        </div>
        <div class="calendar-legend">
          <span class="calendar-pill orders">Orders</span>
          <span class="calendar-pill batches">Batches</span>
          <span class="calendar-pill tasks">Tasks</span>
        </div>
      </div>
      <table class="calendar-table">
        <thead>
          <tr>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<th>${d}</th>`).join('')}</tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    `;
  }

  async function renderArchives() {
    const list = getById('archive-list');
    if (!list || !window.api || typeof window.api.listArchives !== 'function') return;
    list.innerHTML = '<div class="loading">Loading archives...</div>';
    try {
      state.archives = await window.api.listArchives(50);
    } catch (error) {
      console.error('Failed to load archives', error);
      list.innerHTML = '<div class="error">Unable to load archives.</div>';
      return;
    }
    if (!state.archives.length) {
      list.innerHTML = '<div class="empty-state">No snapshots yet.</div>';
      return;
    }
    list.innerHTML = state.archives.map(archive => `
      <div class="list-row">
        <div>
          <div class="list-label">${archive.note || 'Snapshot'}</div>
          <div class="list-detail">${new Date(archive.created_at).toLocaleString()}</div>
        </div>
        <button class="secondary" data-archive="${archive.id}">Restore</button>
      </div>
    `).join('');
    list.querySelectorAll('button[data-archive]').forEach(button => {
      button.addEventListener('click', () => restoreArchive(button.dataset.archive));
    });
  }

  /* ------------------------------------------------------------------ */
  /* ------------------------- FORM HANDLERS -------------------------- */
  /* ------------------------------------------------------------------ */

  function openIngredientModal(ingredient = null) {
    const title = getById('ingredient-modal-title');
    if (title) title.textContent = ingredient ? 'Edit Ingredient' : 'Ingredient';
    getById('ingredient-id').value = ingredient ? ingredient.id : '';
    getById('ingredient-name').value = ingredient ? ingredient.name : '';
    getById('ingredient-quantity').value = ingredient ? ingredient.quantity : 0;
    getById('ingredient-unit').value = ingredient ? ingredient.unit || '' : '';
    getById('ingredient-price').value = ingredient ? ingredient.price : '';
    getById('ingredient-reorder').value = ingredient ? ingredient.reorderPoint || '' : '';
    populateSupplierSelect('ingredient-supplier', ingredient ? ingredient.supplierId : '');
    getById('ingredient-notes').value = ingredient ? ingredient.notes || '' : '';
    showModal('ingredient-modal');
  }

  async function handleIngredientSubmit(event) {
    event.preventDefault();
    const id = getById('ingredient-id').value || createRuntimeId('ingredient');
    const payload = {
      id,
      name: getById('ingredient-name').value,
      quantity: Number(getById('ingredient-quantity').value) || 0,
      unit: getById('ingredient-unit').value,
      price: Number(getById('ingredient-price').value) || 0,
      reorderPoint: Number(getById('ingredient-reorder').value) || 0,
      supplierId: getById('ingredient-supplier').value || null,
      notes: getById('ingredient-notes').value
    };
    const existingIndex = window.data.ingredients.findIndex(i => i.id === id);
    if (existingIndex >= 0) {
      window.data.ingredients[existingIndex] = payload;
    } else {
      window.data.ingredients.push(payload);
    }
    hideModal('ingredient-modal');
    await persistAndRefresh(['inventory', 'orders', 'production']);
    showToast('Ingredient saved');
  }

  function openRecipeModal(recipe = null) {
    getById('recipe-modal-id').value = recipe ? recipe.id : '';
    getById('recipe-modal-name').value = recipe ? recipe.name : '';
    getById('recipe-modal-price').value = recipe ? recipe.price || 0 : '';
    getById('recipe-modal-instructions').value = recipe ? recipe.instructions || '' : '';
    const container = getById('recipe-modal-ingredients-container');
    container.innerHTML = `
      <div class="stack-header">
        <h4>Ingredients</h4>
        <button type="button" id="add-recipe-modal-ingredient">+ Ingredient</button>
      </div>
    `;
    if (recipe && Array.isArray(recipe.ingredientsRequired)) {
      recipe.ingredientsRequired.forEach(entry => addRecipeIngredientRow(entry.ingredientId, entry.quantity));
    }
    attachClick('add-recipe-modal-ingredient', () => addRecipeIngredientRow());
    updateRecipeCostPreview();
    showModal('recipe-modal');
  }

  async function handleRecipeSubmit(event) {
    event.preventDefault();
    const id = getById('recipe-modal-id').value || createRuntimeId('recipe');
    const ingredientsRequired = collectRecipeIngredients();
    const cost = ingredientsRequired.reduce((total, entry) => {
      const ingredient = window.data.ingredients.find(i => i.id === entry.ingredientId);
      return ingredient ? total + (ingredient.price * entry.quantity) : total;
    }, 0);
    const recipe = {
      id,
      name: getById('recipe-modal-name').value,
      price: Number(getById('recipe-modal-price').value) || 0,
      instructions: getById('recipe-modal-instructions').value,
      ingredientsRequired,
      cost
    };
    const idx = window.data.menuItems.findIndex(item => item.id === id);
    if (idx >= 0) {
      window.data.menuItems[idx] = recipe;
    } else {
      window.data.menuItems.push(recipe);
    }
    hideModal('recipe-modal');
    await persistAndRefresh(['orders', 'production']);
    showToast('Recipe saved');
  }

  function addRecipeIngredientRow(selectedId = '', qty = 1) {
    const container = getById('recipe-modal-ingredients-container');
    const row = document.createElement('div');
    row.className = 'stack-row recipe-ingredient-row';
    const select = document.createElement('select');
    select.innerHTML = window.data.ingredients.map(ingredient => `
      <option value="${ingredient.id}">${ingredient.name}</option>
    `).join('');
    select.value = selectedId;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.value = qty;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.className = 'secondary';
    remove.addEventListener('click', () => {
      row.remove();
      updateRecipeCostPreview();
    });
    select.addEventListener('change', updateRecipeCostPreview);
    input.addEventListener('input', updateRecipeCostPreview);
    row.append(select, input, remove);
    container.appendChild(row);
    updateRecipeCostPreview();
  }

  function collectRecipeIngredients() {
    const rows = Array.from(document.querySelectorAll('.recipe-ingredient-row'));
    return rows.map(row => {
      const select = row.querySelector('select');
      const input = row.querySelector('input');
      return {
        ingredientId: select ? select.value : null,
        quantity: Number(input ? input.value : 0) || 0
      };
    }).filter(entry => entry.ingredientId);
  }

  function updateRecipeCostPreview() {
    const display = getById('recipe-modal-cost-display');
    if (!display) return;
    const cost = collectRecipeIngredients().reduce((total, entry) => {
      const ingredient = window.data.ingredients.find(i => i.id === entry.ingredientId);
      return ingredient ? total + (ingredient.price * entry.quantity) : total;
    }, 0);
    display.textContent = `Cost to make: ${formatCurrency(cost)}`;
  }

  function openOrderModal(order = null) {
    state.editingOrderId = order ? order.id : null;
    getById('order-modal-title').textContent = order ? 'Edit Order' : 'New Order';
    populateCustomerSelect('order-customer-select', order ? order.customerId : '');
    const customName = (!order || !order.customerId) ? (order ? order.customerName || '' : '') : '';
    const customerNameInput = getById('order-customer-name');
    if (customerNameInput) {
      customerNameInput.value = customName;
    }
    getById('order-channel').innerHTML = CHANNELS.map(ch => `<option value="${ch}">${ch}</option>`).join('');
    getById('order-channel').value = order ? order.channel || 'Direct' : 'Direct';
    getById('order-fulfillment').innerHTML = FULFILLMENT_OPTIONS.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    getById('order-fulfillment').value = order ? order.fulfillmentType || 'Pickup' : 'Pickup';
    getById('order-pickup-date').value = order ? order.pickupDate || '' : '';
    populateSlots('order-slot', order ? order.deliverySlotId : '');
    getById('order-deposit').value = order ? order.deposit || '' : '';
    getById('order-notes').value = order ? order.notes || '' : '';
    const itemsContainer = getById('order-items-container');
    itemsContainer.innerHTML = '';
    const items = order ? getOrderItems(order) : [{ itemId: '', qty: 1 }];
    items.forEach(item => addOrderItemRow(itemsContainer, item.itemId, item.qty));
    const customerSelect = getById('order-customer-select');
    if (customerSelect && customerNameInput) {
      const toggle = () => {
        const isNew = customerSelect.value === 'new';
        customerNameInput.style.display = isNew ? '' : 'none';
        if (!isNew) {
          customerNameInput.value = '';
        }
      };
      customerSelect.onchange = toggle;
      toggle();
      if (customName && customerSelect.value === 'new') {
        customerNameInput.value = customName;
      }
    }
    showModal('order-modal');
  }

  function addOrderItemRow(container = getById('order-items-container'), selectedId = '', qty = 1) {
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'stack-row order-item-row';
    const select = document.createElement('select');
    const options = window.data.menuItems.length
      ? window.data.menuItems.map(item => `<option value="${item.id}">${item.name}</option>`).join('')
      : '<option value="">No recipes</option>';
    select.innerHTML = options;
    select.value = selectedId;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.value = qty;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => row.remove());
    row.append(select, input, remove);
    container.appendChild(row);
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();
    const orderId = state.editingOrderId || createRuntimeId('order');
    const customerSelect = getById('order-customer-select');
    const customerId = customerSelect.value === 'new' ? null : customerSelect.value;
    const customerName = customerId
      ? (window.data.customers.find(c => c.id === customerId)?.name || '')
      : (getById('order-customer-name').value || 'Walk-in');
    const items = Array.from(document.querySelectorAll('#order-items-container .order-item-row'))
      .map(row => {
        const select = row.querySelector('select');
        const qty = row.querySelector('input');
        return { itemId: select.value, qty: Number(qty.value) || 0 };
      })
      .filter(item => item.itemId && item.qty > 0);
    if (!items.length) {
      showToast('Add at least one item');
      return;
    }
    const orderPayload = {
      id: orderId,
      customerId,
      customerName,
      channel: getById('order-channel').value,
      fulfillmentType: getById('order-fulfillment').value,
      pickupDate: getById('order-pickup-date').value,
      deliverySlotId: getById('order-slot').value,
      deposit: Number(getById('order-deposit').value) || 0,
      notes: getById('order-notes').value,
      date: new Date().toISOString().slice(0, 10),
      status: state.editingOrderId ? (window.data.orders.find(o => o.id === orderId)?.status || 'Pending') : 'Pending',
      produced: state.editingOrderId ? (window.data.orders.find(o => o.id === orderId)?.produced || false) : false,
      items
    };
    const existingIndex = window.data.orders.findIndex(order => order.id === orderId);
    if (existingIndex >= 0) {
      window.data.orders[existingIndex] = orderPayload;
    } else {
      window.data.orders.push(orderPayload);
    }
    hideModal('order-modal');
    state.editingOrderId = null;
    await persistAndRefresh(['orders', 'production', 'dashboard', 'calendar']);
    showToast('Order saved');
  }

  function openTaskModal(task = null) {
    getById('task-id').value = task ? task.id : '';
    getById('task-title').value = task ? task.title : '';
    getById('task-due-date').value = task ? task.dueDate || '' : '';
    getById('task-category').value = task ? task.category || 'production' : 'production';
    getById('task-status').value = task ? task.status || 'open' : 'open';
    getById('task-notes').value = task ? task.notes || '' : '';
    showModal('task-modal');
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();
    const id = getById('task-id').value || createRuntimeId('task');
    const payload = {
      id,
      title: getById('task-title').value,
      dueDate: getById('task-due-date').value,
      category: getById('task-category').value,
      status: getById('task-status').value,
      notes: getById('task-notes').value
    };
    const idx = window.data.tasks.findIndex(task => task.id === id);
    if (idx >= 0) {
      window.data.tasks[idx] = payload;
    } else {
      window.data.tasks.push(payload);
    }
    hideModal('task-modal');
    await persistAndRefresh(['dashboard', 'calendar']);
    showToast('Task saved');
  }

  function openCommunicationModal() {
    populateCustomerSelect('communication-customer', state.selectedCustomerId);
    getById('communication-subject').value = '';
    getById('communication-message').value = '';
    showModal('communication-modal');
  }

  async function handleCommunicationSubmit(event) {
    event.preventDefault();
    const payload = {
      id: createRuntimeId('comm'),
      customerId: getById('communication-customer').value || null,
      channel: getById('communication-channel').value,
      subject: getById('communication-subject').value,
      message: getById('communication-message').value,
      date: new Date().toISOString()
    };
    window.data.communications.push(payload);
    hideModal('communication-modal');
    await persistAndRefresh(['customers']);
    showToast('Touchpoint logged');
  }

  async function handleCustomerSubmit(event) {
    event.preventDefault();
    const id = getById('customer-id').value || createRuntimeId('customer');
    const payload = {
      id,
      name: getById('customer-name').value,
      phone: getById('customer-phone').value,
      email: getById('customer-email').value,
      channel: getById('customer-channel').value,
      notes: getById('customer-notes').value
    };
    const idx = window.data.customers.findIndex(c => c.id === id);
    if (idx >= 0) {
      window.data.customers[idx] = payload;
    } else {
      window.data.customers.push(payload);
    }
    state.selectedCustomerId = id;
    await persistAndRefresh(['customers', 'orders']);
    showToast('Customer saved');
  }

  function openSupplierModal(supplier = null) {
    getById('supplier-id').value = supplier ? supplier.id : '';
    getById('supplier-name').value = supplier ? supplier.name : '';
    getById('supplier-contact').value = supplier ? supplier.contactName || '' : '';
    getById('supplier-phone').value = supplier ? supplier.phone || '' : '';
    getById('supplier-email').value = supplier ? supplier.email || '' : '';
    getById('supplier-lead-time').value = supplier ? supplier.leadTimeDays || '' : '';
    getById('supplier-terms').value = supplier ? supplier.terms || '' : '';
    getById('supplier-notes').value = supplier ? supplier.notes || '' : '';
    showModal('supplier-modal');
  }

  async function handleSupplierSubmit(event) {
    event.preventDefault();
    const id = getById('supplier-id').value || createRuntimeId('supplier');
    const payload = {
      id,
      name: getById('supplier-name').value,
      contactName: getById('supplier-contact').value,
      phone: getById('supplier-phone').value,
      email: getById('supplier-email').value,
      leadTimeDays: Number(getById('supplier-lead-time').value) || 0,
      terms: getById('supplier-terms').value,
      notes: getById('supplier-notes').value
    };
    const idx = window.data.suppliers.findIndex(s => s.id === id);
    if (idx >= 0) {
      window.data.suppliers[idx] = payload;
    } else {
      window.data.suppliers.push(payload);
    }
    state.selectedSupplierId = id;
    hideModal('supplier-modal');
    await persistAndRefresh(['inventory', 'suppliers']);
    showToast('Supplier saved');
  }

  async function deleteSupplier(supplierId) {
    if (!supplierId) return;
    window.data.suppliers = window.data.suppliers.filter(s => s.id !== supplierId);
    window.data.ingredients.forEach(ingredient => {
      if (ingredient.supplierId === supplierId) {
        ingredient.supplierId = null;
      }
    });
    window.data.purchaseOrders.forEach(po => {
      if (po.supplierId === supplierId) {
        po.supplierId = null;
      }
    });
    if (state.selectedSupplierId === supplierId) {
      state.selectedSupplierId = window.data.suppliers[0]?.id || null;
    }
    await persistAndRefresh(['inventory', 'suppliers']);
    showToast('Supplier deleted');
  }

  function openPurchaseOrderModal(po = null) {
    getById('purchase-order-id').value = po ? po.id : '';
    populateSupplierSelect('po-supplier', po ? po.supplierId : '');
    getById('po-expected-date').value = po ? po.expectedDate || '' : '';
    getById('po-status').value = po ? po.status || 'Draft' : 'Draft';
    getById('po-notes').value = po ? po.notes || '' : '';
    const container = getById('po-items-container');
    container.innerHTML = '';
    const items = po ? po.items : [{ ingredientId: '', quantity: 1 }];
    items.forEach(item => addPurchaseOrderItemRow(item.ingredientId, item.quantity));
    showModal('purchase-order-modal');
  }

  function addPurchaseOrderItemRow(selectedId = '', qty = 1) {
    const container = getById('po-items-container');
    const row = document.createElement('div');
    row.className = 'stack-row';
    const select = document.createElement('select');
    select.innerHTML = window.data.ingredients.map(ing => `<option value="${ing.id}">${ing.name}</option>`).join('');
    select.value = selectedId;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.value = qty;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => row.remove());
    row.append(select, input, remove);
    container.appendChild(row);
  }

  async function handlePurchaseOrderSubmit(event) {
    event.preventDefault();
    const id = getById('purchase-order-id').value || createRuntimeId('po');
    const items = Array.from(document.querySelectorAll('#po-items-container .stack-row')).map(row => {
      const select = row.querySelector('select');
      const input = row.querySelector('input');
      return { ingredientId: select.value, quantity: Number(input.value) || 0 };
    }).filter(item => item.ingredientId);
    const payload = {
      id,
      supplierId: getById('po-supplier').value,
      expectedDate: getById('po-expected-date').value,
      status: getById('po-status').value,
      notes: getById('po-notes').value,
      items
    };
    const idx = window.data.purchaseOrders.findIndex(po => po.id === id);
    if (idx >= 0) {
      window.data.purchaseOrders[idx] = payload;
    } else {
      window.data.purchaseOrders.push(payload);
    }
    hideModal('purchase-order-modal');
    await persistAndRefresh(['inventory', 'dashboard']);
    showToast('PO saved');
  }

  function openAdjustmentModal() {
    populateIngredientSelect('adjustment-ingredient');
    getById('adjustment-quantity').value = 0;
    getById('adjustment-type').value = 'restock';
    getById('adjustment-note').value = '';
    showModal('adjustment-modal');
  }

  async function handleAdjustmentSubmit(event) {
    event.preventDefault();
    const ingredientId = getById('adjustment-ingredient').value;
    const rawQty = Number(getById('adjustment-quantity').value) || 0;
    const type = getById('adjustment-type').value;
    const note = getById('adjustment-note').value;
    const ingredient = window.data.ingredients.find(i => i.id === ingredientId);
    if (!ingredient) {
      showToast('Select an ingredient');
      return;
    }
    if (!rawQty) {
      showToast('Enter a quantity');
      return;
    }
    let delta = rawQty;
    if (type === 'restock') {
      delta = Math.abs(rawQty);
    } else if (type === 'usage') {
      delta = -Math.abs(rawQty);
    }
    ingredient.quantity = Math.max(0, ingredient.quantity + delta);
    window.data.inventoryMovements.push({
      id: createRuntimeId('move'),
      ingredientId,
      quantity: delta,
      type,
      note,
      date: new Date().toISOString()
    });
    hideModal('adjustment-modal');
    await persistAndRefresh(['inventory', 'dashboard']);
    showToast('Inventory updated');
  }

  function openBatchModal(batch = null) {
    state.editingBatchId = batch ? batch.id : null;
    populateRecipeSelect('batch-recipe', batch ? batch.recipeId : '');
    getById('batch-quantity').value = batch ? batch.quantity || 1 : 1;
    getById('batch-date').value = batch ? batch.scheduleDate || '' : '';
    getById('batch-status').value = batch ? batch.status || 'planned' : 'planned';
    populateOrderMultiSelect('batch-orders', batch ? batch.linkedOrderIds : []);
    showModal('batch-modal');
  }

  async function handleBatchSubmit(event) {
    event.preventDefault();
    const id = state.editingBatchId || createRuntimeId('batch');
    const payload = {
      id,
      recipeId: getById('batch-recipe').value,
      quantity: Number(getById('batch-quantity').value) || 0,
      scheduleDate: getById('batch-date').value,
      status: getById('batch-status').value,
      linkedOrderIds: Array.from(getById('batch-orders').selectedOptions).map(opt => opt.value)
    };
    const idx = window.data.productionSchedule.findIndex(batch => batch.id === id);
    if (idx >= 0) {
      window.data.productionSchedule[idx] = payload;
    } else {
      window.data.productionSchedule.push(payload);
    }
    state.editingBatchId = null;
    hideModal('batch-modal');
    await persistAndRefresh(['production', 'calendar']);
    showToast('Batch scheduled');
  }

  /* ------------------------------------------------------------------ */
  /* --------------------------- UTILITIES ---------------------------- */
  /* ------------------------------------------------------------------ */

  function setActiveView(viewId) {
    if (!viewId) return;
    state.activeView = viewId;
    document.querySelectorAll('.nav-link').forEach(button => {
      button.classList.toggle('active', button.dataset.target === viewId);
    });
    document.querySelectorAll('.view').forEach(section => {
      section.classList.toggle('active', section.id === viewId);
    });
    const title = getById('view-title');
    if (title) {
      title.textContent = VIEW_LABELS[viewId] || 'Dashboard';
    }
  }

  async function persistAndRefresh(sections = []) {
    await saveData();
    sections.forEach(section => {
      if (section === 'inventory') renderInventory();
      if (section === 'orders') renderOrders();
      if (section === 'customers') renderCustomers();
      if (section === 'production') renderProduction();
      if (section === 'dashboard') renderDashboard();
      if (section === 'calendar') renderCalendar();
      if (section === 'suppliers') renderSuppliers();
    });
  }

  async function saveData() {
    window.data = window.normalizeSnapshot(window.data);
    if (window.persistDataSnapshot) {
      await window.persistDataSnapshot(window.data);
    } else {
      localStorage.setItem('cinnamonSecretsData', JSON.stringify(window.data));
    }
  }

  function showToast(message = 'Saved successfully!') {
    const toast = getById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  function toggleLoading(show) {
    const modal = getById('loading-modal');
    if (!modal) return;
    if (show) {
      modal.removeAttribute('hidden');
    } else {
      modal.setAttribute('hidden', 'true');
    }
  }

  function showModal(id) {
    const modal = getById(id);
    if (modal) modal.removeAttribute('hidden');
  }

  function hideModal(id) {
    const modal = getById(id);
    if (modal) {
      modal.setAttribute('hidden', 'true');
      modal.querySelectorAll('form').forEach(form => form.reset());
    }
  }

  function attachClick(id, handler) {
    const el = getById(id);
    if (el) {
      el.addEventListener('click', handler);
    }
  }

  function attachInput(id, handler) {
    const el = getById(id);
    if (el) {
      el.addEventListener('input', event => handler(event.target.value));
    }
  }

  function attachChange(id, handler) {
    const el = getById(id);
    if (el) {
      el.addEventListener('change', event => handler(event.target.value));
    }
  }

  function supplierName(supplierId) {
    const supplier = window.data.suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'No supplier';
  }

  function customerName(customerId) {
    const customer = window.data.customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Walk-in';
  }

  function menuItemName(menuId) {
    const item = window.data.menuItems.find(m => m.id === menuId);
    return item ? item.name : 'Menu Item';
  }

  function getOrderItems(order) {
    return Array.isArray(order?.items) ? order.items : [];
  }

  function computeOrderTotal(order) {
    return getOrderItems(order).reduce((sum, item) => {
      const recipe = window.data.menuItems.find(m => m.id === item.itemId);
      return sum + ((recipe?.price || 0) * (item.qty || 0));
    }, 0);
  }

  function formatCurrency(value) {
    return moneyFormatter.format(Number(value) || 0);
  }

  function addDays(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  function startOfDay(input) {
    if (!input) return null;
    let date;
    if (typeof input === 'string') {
      const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, yearStr, monthStr, dayStr] = match;
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(input);
      }
    } else {
      date = new Date(input);
    }
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function dateKey(value) {
    const normalized = startOfDay(value);
    return normalized ? normalized.toISOString().slice(0, 10) : '';
  }

  function getOrderDate(order) {
    if (!order) return null;
    const base = order.pickupDate || order.date;
    return base ? startOfDay(base) : null;
  }

  function filterOrdersByRange(orders = []) {
    if (state.metricRange === 'all') return [...orders];
    const days = Number(state.metricRange);
    if (!days) return [...orders];
    const end = startOfDay(new Date());
    const start = addDays(end, -days);
    return orders.filter(order => {
      const date = getOrderDate(order);
      return date && date >= start && date <= end;
    });
  }

  function populateSupplierSelect(id, selected) {
    const select = getById(id);
    if (!select) return;
    if (!window.data.suppliers.length) {
      select.innerHTML = '<option value="">Add a supplier first</option>';
      select.value = '';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = window.data.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const fallback = window.data.suppliers[0]?.id || '';
    select.value = window.data.suppliers.some(s => s.id === selected) ? selected : fallback;
  }

  function populateIngredientSelect(id) {
    const select = getById(id);
    if (!select) return;
    select.innerHTML = window.data.ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  }

  function populateCustomerSelect(id, selected) {
    const select = getById(id);
    if (!select) return;
    const options = window.data.customers.map(customer => `<option value="${customer.id}">${customer.name}</option>`);
    options.unshift('<option value="new">New / Walk-in</option>');
    select.innerHTML = options.join('');
    select.value = selected || 'new';
  }

  function populateRecipeSelect(id, selected) {
    const select = getById(id);
    if (!select) return;
    select.innerHTML = window.data.menuItems.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
    select.value = selected || (window.data.menuItems[0]?.id || '');
  }

  function populateSlots(id, selected) {
    const select = getById(id);
    if (!select) return;
    select.innerHTML = window.data.deliverySlots.map(slot => {
      const label = `${slot.date} • ${slot.window}`;
      return `<option value="${slot.id}">${label}</option>`;
    }).join('');
    select.value = selected || (window.data.deliverySlots[0]?.id || '');
  }

  function populateOrderMultiSelect(id, selected = []) {
    const select = getById(id);
    if (!select) return;
    select.innerHTML = window.data.orders.map(order => `<option value="${order.id}">${order.customerName || 'Walk-in'} • ${order.pickupDate || ''}</option>`).join('');
    Array.from(select.options).forEach(option => {
      option.selected = selected.includes(option.value);
    });
  }

  function shiftCalendar(delta) {
    if (!state.calendarCursor) return;
    const next = new Date(state.calendarCursor);
    next.setMonth(next.getMonth() + delta);
    state.calendarCursor = startOfMonth(next);
    renderCalendar();
  }

  function startOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async function manualArchive() {
    await saveData();
    showToast('Snapshot saved');
    void renderArchives();
  }

  function confirmReset() {
    confirmDelete('Reset workspace? This cannot be undone.', async () => {
      window.data = window.normalizeSnapshot({});
      await saveData();
      location.reload();
    });
  }

  function exportSnapshot() {
    const dataStr = JSON.stringify(window.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cinnamon_secrets_snapshot.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handleSnapshotImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async loadEvent => {
      try {
        const parsed = JSON.parse(loadEvent.target.result);
        window.data = window.normalizeSnapshot(parsed);
        await saveData();
        location.reload();
      } catch (error) {
        console.error('Failed to import snapshot', error);
        showToast('Invalid snapshot file');
      }
    };
    reader.readAsText(file);
  }

  function confirmDelete(message, onYes) {
    const modal = getById('confirm-modal');
    if (!modal) {
      if (window.confirm(message)) onYes();
      return;
    }
    getById('confirm-modal-message').textContent = message;
    showModal('confirm-modal');
    getById('confirm-modal-yes').onclick = () => {
      hideModal('confirm-modal');
      if (typeof onYes === 'function') onYes();
    };
    getById('confirm-modal-no').onclick = () => hideModal('confirm-modal');
  }

  function advanceOrderStatus(order) {
    const currentIndex = ORDER_STATUSES.indexOf(order.status);
    const nextStatus = ORDER_STATUSES[Math.min(currentIndex + 1, ORDER_STATUSES.length - 1)];
    order.status = nextStatus;
    if (nextStatus === 'Fulfilled') {
      order.produced = true;
    }
    persistAndRefresh(['orders', 'production', 'dashboard', 'calendar']);
  }

  function advanceBatchStatus(batch) {
    const index = BATCH_STATUSES.indexOf(batch.status);
    batch.status = BATCH_STATUSES[Math.min(index + 1, BATCH_STATUSES.length - 1)];
    persistAndRefresh(['production', 'calendar']);
  }

  function togglePurchaseOrderFilter() {
    state.purchaseOrderFilter = state.purchaseOrderFilter === 'open' ? 'all' : 'open';
    const button = getById('po-filter-open');
    if (button) {
      button.textContent = state.purchaseOrderFilter === 'open' ? 'Open' : 'All';
    }
    renderPurchaseOrders();
  }

  function generateDeliverySlots(days = 7) {
    const slots = [];
    const base = new Date();
    for (let i = 0; i < days; i += 1) {
      const day = new Date(base);
      day.setDate(base.getDate() + i);
      const date = day.toISOString().slice(0, 10);
      ['08:00-10:00', '10:00-12:00', '16:00-18:00'].forEach(windowLabel => {
        slots.push({
          id: createRuntimeId('slot'),
          date,
          window: windowLabel,
          capacity: windowLabel === '16:00-18:00' ? 6 : 4,
          committedOrders: []
        });
      });
    }
    return slots;
  }

  function populateSlotsIfEmpty() {
    if (window.data.deliverySlots.length) return;
    window.data.deliverySlots = generateDeliverySlots();
  }

  async function restoreArchive(archiveId) {
    if (!window.api || typeof window.api.restoreArchive !== 'function') return;
    await window.api.restoreArchive(archiveId);
    await window.loadData();
    renderAll();
    showToast('Archive restored');
  }

  function exportMonthlyReport() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'long' });
    let csv = `Cinnamon Secrets Monthly Report\nMonth,${month} ${year}\n\n`;
    csv += 'Date,Customer,Status,Items,Total\n';
    window.data.orders.forEach(order => {
      const orderItems = getOrderItems(order);
      csv += [
        order.date,
        order.customerName,
        order.status,
        orderItems.length,
        formatCurrency(computeOrderTotal(order))
      ].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cinnamon_secrets_report_${year}_${now.getMonth() + 1}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function getById(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  window.createRuntimeId = window.createRuntimeId || (prefix => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`);
  populateSlotsIfEmpty();
})();