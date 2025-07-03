// --- DOM SAFE GETTER ---
function getById(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`Element with id '${id}' not found!`);
  }
  return el;
}

// --- SECTION SHOW/HIDE ---
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => {
    sec.style.display = (sec.id === sectionId) ? '' : 'none';
  });
}

// --- TOAST ---
function showToast(message = "Saved successfully!") {
  const toast = getById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 500);
  }, 3000);
}

function saveData() {
  localStorage.setItem('cinnamonSecretsData', JSON.stringify(window.data));
}

// --- NAVIGATION ---
function setupNavigation() {
  const navMap = [
    ['nav-ingredients', 'ingredients-section', renderIngredients],
    ['nav-recipes', 'recipes-section', renderMenuItems],
    ['nav-production', 'production-section', renderUnproducedOrders],
    ['nav-dashboard', 'dashboard-section', updateCharts],
    ['nav-orders', 'orders-section', renderOrders],
    ['nav-customers', 'customers-section', renderCustomers],
    ['nav-calendar', 'calendar-section', renderCalendarView]
  ];
  navMap.forEach(([btnId, sectionId, cb]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.onclick = function() {
        showSection(sectionId);
        if (typeof cb === 'function') cb();
      };
    }
  });
}

// --- DATE HELPERS ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Always treat as local date (no timezone shift)
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function getMinPickupDateStr() {
  const now = new Date();
  now.setHours(0,0,0,0);
  now.setDate(now.getDate() + 2); // 48 hours from now
  return now.toISOString().slice(0,10);
}

// --- INGREDIENTS ---
function renderIngredients() {
  const table = getById('ingredients-table');
  if (!table) return;
  let tbody = table.getElementsByTagName('tbody')[0];
  if (!tbody) {
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
  }
  tbody.innerHTML = '';
  if (!window.data.ingredients.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center;color:#aaa;">No ingredients yet. Add one above!</td>`;
    tbody.appendChild(tr);
    return;
  }
  window.data.ingredients.forEach(ing => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ing.name}</td>
      <td>${ing.unit || ''}</td>
      <td>${ing.price.toFixed(2)}</td>
      <td>${ing.quantity}</td>
      <td>
        <button type="button" onclick="editIngredient('${ing.id}')">Edit</button>
        <button type="button" onclick="deleteIngredient('${ing.id}')">Delete</button>
        <button type="button" onclick="restockIngredient('${ing.id}')">Restock</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('ingredient-modal-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let id = document.getElementById('ingredient-id').value;
  let name = document.getElementById('ingredient-name').value;
  let price = parseFloat(document.getElementById('ingredient-price').value);
  let quantity = parseInt(document.getElementById('ingredient-quantity').value);
  let unit = document.getElementById('ingredient-unit') ? document.getElementById('ingredient-unit').value : '';
  if (id) {
    window.data.ingredients = window.data.ingredients.map(ing =>
      ing.id === id ? { id, name, price, quantity, unit } : ing
    );
  } else {
    id = Date.now().toString();
    window.data.ingredients.push({ id, name, price, quantity, unit });
  }
  saveData();
  renderIngredients();
  this.reset();
  document.getElementById('ingredient-id').value = '';
  hideModal('ingredient-modal');
  showToast();
});

window.changeIngredientQty = function(id, delta) {
  const ing = window.data.ingredients.find(i => i.id === id);
  if (ing) {
    ing.quantity = Math.max(0, ing.quantity + delta);
    saveData();
    renderIngredients();
    showLowStockAlert();
  }
};

window.updateIngredientQty = function(id, value) {
  const ing = window.data.ingredients.find(i => i.id === id);
  const qty = parseInt(value);
  if (ing && !isNaN(qty)) {
    ing.quantity = qty;
    saveData();
    renderIngredients();
    showLowStockAlert();
  }
};

window.updateIngredientPrice = function(id, value) {
  const ing = window.data.ingredients.find(i => i.id === id);
  const price = parseFloat(value);
  if (ing && !isNaN(price)) {
    ing.price = price;
    saveData();
    renderIngredients();
  }
};

let restockIngredientId = null;

window.restockIngredient = function(id) {
  const ing = window.data.ingredients.find(i => i.id === id);
  if (!ing) return;
  restockIngredientId = id;
  document.getElementById('restock-modal-name').textContent = `Ingredient: ${ing.name}`;
  document.getElementById('restock-amount').value = 10;
  document.getElementById('restock-modal').style.display = 'flex';
};

document.getElementById('restock-cancel').onclick = function() {
  document.getElementById('restock-modal').style.display = 'none';
  restockIngredientId = null;
};

document.getElementById('restock-confirm').onclick = function() {
  const amount = parseInt(document.getElementById('restock-amount').value);
  if (!isNaN(amount) && amount > 0 && restockIngredientId) {
    const ing = window.data.ingredients.find(i => i.id === restockIngredientId);
    if (ing) {
      ing.quantity += amount;
      saveData();
      renderIngredients();
      showLowStockAlert();
      showToast(`Restocked ${ing.name} by ${amount}.`);
    }
  }
  document.getElementById('restock-modal').style.display = 'none';
  restockIngredientId = null;
};

// --- MENU MANAGEMENT (RECIPES) ---
function renderMenuItems() {
  const table = getById('menu-table');
  if (!table) return;
  let tbody = table.getElementsByTagName('tbody')[0];
  if (!tbody) {
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
  }
  tbody.innerHTML = '';
  if (!window.data.menuItems.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align:center;color:#aaa;">No recipes yet. Add one above!</td>`;
    tbody.appendChild(tr);
    return;
  }
  window.data.menuItems.forEach(item => {
    const ingList = item.ingredientsRequired
      .map(ir => {
        const ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
        return ingredient ? `${ingredient.name} (${ir.quantity})` : '';
      })
      .join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${ingList}</td>
      <td>${item.instructions}</td>
      <td>${item.cost ? item.cost.toFixed(2) : "0.00"}</td>
      <td>${item.price ? item.price.toFixed(2) : "0.00"}</td>
      <td>
        <button type="button" onclick="editMenuItem('${item.id}')">Edit</button>
        <button type="button" onclick="deleteMenuItem('${item.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editMenuItem = function(id) {
  const item = window.data.menuItems.find(m => m.id === id);
  if (item) {
    document.getElementById('recipe-modal-id').value = item.id;
    document.getElementById('recipe-modal-name').value = item.name;
    document.getElementById('recipe-modal-instructions').value = item.instructions;
    document.getElementById('recipe-modal-price').value = item.price;
    document.getElementById('recipe-modal-cost-display').textContent = `Cost to Make: $${item.cost ? item.cost.toFixed(2) : "0.00"}`;
    document.getElementById('recipe-modal-ingredients-container').innerHTML = '<h3>Ingredients Required</h3>';
    item.ingredientsRequired.forEach(ir => {
      addRecipeIngredientRow(ir.ingredientId, ir.quantity);
    });
    updateRecipeCostPreview();
  }
};

document.getElementById('recipe-modal-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let id = document.getElementById('recipe-modal-id').value;
  let name = document.getElementById('recipe-modal-name').value;
  let instructions = document.getElementById('recipe-modal-instructions').value;
  let price = parseFloat(document.getElementById('recipe-modal-price').value);

  let ingredientsRequired = [];
  document.querySelectorAll('.recipe-ingredient-row').forEach(row => {
    const select = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    ingredientsRequired.push({ ingredientId: select.value, quantity: parseInt(qtyInput.value) });
  });

  let cost = ingredientsRequired.reduce((total, ir) => {
    let ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
    return ingredient ? total + (ingredient.price * ir.quantity) : total;
  }, 0);

  document.getElementById('recipe-modal-cost-display').textContent = `Cost to Make: $${cost.toFixed(2)}`;

  if (id) {
    window.data.menuItems = window.data.menuItems.map(item =>
      item.id === id ? { id, name, instructions, ingredientsRequired, cost, price } : item
    );
  } else {
    id = Date.now().toString();
    window.data.menuItems.push({ id, name, instructions, ingredientsRequired, cost, price });
  }
  saveData();
  renderMenuItems();
  this.reset();
  document.getElementById('recipe-modal-id').value = '';
  document.getElementById('recipe-modal-ingredients-container').innerHTML = '<h3>Ingredients Required</h3>';
  document.getElementById('recipe-modal-cost-display').textContent = 'Cost to Make: $0.00';
  showToast();
});

document.getElementById('add-recipe-modal-ingredient').addEventListener('click', function() {
  addRecipeIngredientRow();
});

function addRecipeIngredientRow(selectedId = '', qty = 1) {
  const container = document.getElementById('recipe-modal-ingredients-container');
  const row = document.createElement('div');
  row.className = 'recipe-ingredient-row';

  const select = document.createElement('select');
  select.required = true;
  window.data.ingredients.forEach(ing => {
    const option = document.createElement('option');
    option.value = ing.id;
    option.textContent = ing.name;
    if (ing.id === selectedId) option.selected = true;
    select.appendChild(option);
  });

  const input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.value = qty;
  input.required = true;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = 'Remove';
  removeBtn.onclick = () => {
    row.remove();
    updateRecipeCostPreview();
  };

  // Update cost preview on change
  select.addEventListener('change', updateRecipeCostPreview);
  input.addEventListener('input', updateRecipeCostPreview);

  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeBtn);

  container.appendChild(row);

  updateRecipeCostPreview();
}

// --- RECIPE COST PREVIEW ---
function updateRecipeCostPreview() {
  let cost = 0;
  document.querySelectorAll('.recipe-ingredient-row').forEach(row => {
    const select = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    const ingredient = window.data.ingredients.find(i => i.id === select.value);
    if (ingredient && !isNaN(parseFloat(qtyInput.value))) {
      cost += ingredient.price * parseFloat(qtyInput.value);
    }
  });
  const costDisplay = document.getElementById('recipe-modal-cost-display');
  if (costDisplay) costDisplay.textContent = `Cost to Make: $${cost.toFixed(2)}`;
}

// --- MENU ITEM MODAL FORM RENDER ---
function renderMenuItemModalForm(item = {}) {
  const form = getById('menu-item-modal-form');
  if (!form) return;
  form.innerHTML = `
    <input type="hidden" id="menu-item-id" value="${item.id || ''}">
    <label>Name:<input type="text" id="menu-item-name" value="${item.name || ''}" required></label><br>
    <label>Price:<input type="number" id="menu-item-price" value="${item.price != null ? item.price : ''}" min="0" step="0.01" required></label><br>
    <label>Ingredients:</label>
    <div id="menu-item-ingredients-container">
      <h3>Ingredients Required</h3>
    </div>
    <button type="button" id="add-menu-item-ingredient">Add Ingredient</button><br>
    <label>Instructions:<textarea id="menu-item-instructions" required>${item.instructions || ''}</textarea></label><br>
    <button type="submit">Save</button>
  `;
  // Re-add ingredient rows if editing
  if (item.ingredientsRequired) {
    item.ingredientsRequired.forEach(ir => {
      addMenuItemIngredientRow(ir.ingredientId, ir.quantity);
    });
  }
}

// --- ORDER FORM RENDER & HANDLING ---
function renderOrderForm() {
  const form = getById('order-form');
  if (!form) return;
  let customers = window.data.customers || [];
  const minPickup = getMinPickupDateStr();
  form.innerHTML = `
    <label>Customer:
      <select id="order-customer-select" required>
        <option value="">Select Customer</option>
        ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        <option value="new">New Customer / Walk-in</option>
      </select>
      <input type="text" id="order-customer-name" placeholder="Enter name or leave blank for Walk-in" style="display:none;margin-top:5px;">
    </label><br>
    <label>Pickup Date:
      <input type="date" id="order-pickup-date" min="${minPickup}" required>
      <span style="font-size:0.9em;color:#888;">(Must be at least 48 hours from now)</span>
    </label><br>
    <div id="order-items-container"></div>
    <button type="button" id="add-order-item">Add Another Item</button>
    <button type="submit">Add Order</button>
  `;

  // Attach customer select logic
  const select = getById('order-customer-select');
  const nameInput = getById('order-customer-name');
  if (select && nameInput) {
    select.onchange = function() {
      nameInput.style.display = (select.value === 'new') ? '' : 'none';
    };
  }

  // Set default pickup date to min
  const pickupInput = getById('order-pickup-date');
  if (pickupInput) pickupInput.value = minPickup;

  // Render first item row
  addOrderItemRow();

  // Attach add item button
  getById('add-order-item').onclick = addOrderItemRow;

  // Attach form submit
  form.onsubmit = handleOrderFormSubmit;
}

// Helper to add an item row
function addOrderItemRow(selectedId = '', qty = 1) {
  const container = getById('order-items-container');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'order-item-row';
  // Menu items dropdown
  const select = document.createElement('select');
  select.required = true;
  select.innerHTML = `<option value="">Select Item</option>` +
    (window.data.menuItems || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  if (selectedId) select.value = selectedId;
  // Quantity input
  const input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.value = qty;
  input.required = true;
  input.style = 'width:60px;display:inline-block;margin-left:8px;';
  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = 'Remove';
  removeBtn.style = 'margin-left:8px;';
  removeBtn.onclick = () => row.remove();
  // Append
  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

// Handle order form submit
function handleOrderFormSubmit(e) {
  e.preventDefault();
  const select = getById('order-customer-select');
  const nameInput = getById('order-customer-name');
  const pickupInput = getById('order-pickup-date');
  let customerId = '';
  let customerName = '';
  if (select) {
    if (select.value === 'new') {
      customerName = nameInput.value.trim() || 'Walk-in';
    } else {
      customerId = select.value;
      const custObj = (window.data.customers || []).find(c => c.id === customerId);
      customerName = custObj ? custObj.name : '';
    }
  }
  // Validate pickup date
  let pickupDate = pickupInput ? pickupInput.value : '';
  if (!pickupDate) {
    showToast('Please select a pickup date.');
    return;
  }
  const minPickup = getMinPickupDateStr();
  if (pickupDate < minPickup) {
    showToast('Pickup date must be at least 48 hours from now.');
    return;
  }
  // Gather items
  const items = [];
  document.querySelectorAll('.order-item-row').forEach(row => {
    const itemSelect = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    if (itemSelect && qtyInput && itemSelect.value && parseInt(qtyInput.value) > 0) {
      items.push({ itemId: itemSelect.value, qty: parseInt(qtyInput.value) });
    }
  });
  if (!customerName || !items.length) return;
  window.data.orders.push({
    id: Date.now().toString(),
    customerId,
    customerName,
    items,
    date: new Date().toISOString().slice(0,10),
    pickupDate,
    produced: false,
    status: 'Pending'
  });
  saveData();
  renderOrders();
  showToast('Order added!');
  renderOrderForm(); // Reset form
}

// --- PATCH renderOrders TO CALL renderOrderForm ---
function renderOrders(searchTerm = '', statusFilter = '') {
  renderOrderForm();
  const table = getById('orders-table');
  if (!table) return;
  const tbody = table.getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  let orders = window.data.orders;
  if (statusFilter) {
    orders = orders.filter(order => order.status === statusFilter);
  }
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    orders = orders.filter(order => {
      const customer = order.customerName || (window.data.customers.find(c => c.id === order.customerId)?.name) || '';
      const itemsStr = (order.items || []).map(oi => {
        const item = window.data.menuItems.find(m => m.id === oi.itemId);
        return item ? item.name : '';
      }).join(' ');
      return customer.toLowerCase().includes(term) || itemsStr.toLowerCase().includes(term) || (order.pickupDate || '').toLowerCase().includes(term);
    });
  }
  if (!orders.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="9" style="text-align:center;color:#aaa;">No orders found.</td>`;
    tbody.appendChild(tr);
    return;
  }
  orders.forEach(order => {
    const customer = order.customerName || (window.data.customers.find(c => c.id === order.customerId)?.name) || 'Unknown';
    const itemsStr = (order.items || []).map(oi => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return `${item ? item.name : 'Unknown'} x${oi.qty}`;
    }).join('<br>');
    const total = (order.items || []).reduce((sum, oi) => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return sum + ((item?.price || 0) * oi.qty);
    }, 0);
    const produced = order.produced ? '✅' : '❌';
    const date = order.date || '';
    const pickup = order.pickupDate ? formatDate(order.pickupDate) : '';
    const canFulfill = order.status === 'Produced';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td>${customer}</td>
      <td>${itemsStr}</td>
      <td>${order.items.reduce((sum, oi) => sum + oi.qty, 0)}</td>
      <td>$${total.toFixed(2)}</td>
      <td>${order.status}</td>
      <td>${produced}</td>
      <td>${pickup}</td>
      <td>
        <button type="button" onclick="editOrder('${order.id}')">Edit</button>
        ${canFulfill ? `<button type="button" onclick="fulfillOrder('${order.id}')">Fulfill</button>` : ''}
        <button type="button" onclick="deleteOrder('${order.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- ORDERS: SEARCH & FILTER ---
document.getElementById('order-search').addEventListener('input', function() {
  renderOrders(this.value, document.getElementById('order-status-filter').value);
});
document.getElementById('order-status-filter').addEventListener('change', function() {
  renderOrders(document.getElementById('order-search').value, this.value);
});

// --- ORDERS: FULFILL & DELETE ---
window.fulfillOrder = function(orderId) {
  const order = window.data.orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = 'Fulfilled';
  order.produced = true;
  saveData();
  renderOrders();
  showToast("Order fulfilled!");
};

window.deleteOrder = function(orderId) {
  showConfirm('Delete this order?', () => {
    window.data.orders = window.data.orders.filter(o => o.id !== orderId);
    saveData();
    renderOrders();
    showToast('Order deleted!');
  });
};

// --- CUSTOMERS: SEARCH & FILTER ---
document.getElementById('customer-search').addEventListener('input', function() {
  renderCustomers(this.value);
});
function renderCustomers(searchTerm = '') {
  const table = getById('customers-table');
  if (!table) return;
  const tbody = table.getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  let customers = window.data.customers;
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    customers = customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }
  if (!customers.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align:center;color:#aaa;">No customers found.</td>`;
    tbody.appendChild(tr);
    return;
  }
  customers.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.phone || ''}</td>
      <td>${c.email || ''}</td>
      <td>
        <button type="button" onclick="editCustomer('${c.id}')">Edit</button>
        <button type="button" onclick="deleteCustomer('${c.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- PRODUCTION: UNPRODUCED ORDERS WORKFLOW ---
function renderUnproducedOrders() {
  const list = document.getElementById('unproduced-orders-list');
  list.innerHTML = '';
  const unproduced = window.data.orders.filter(o => !o.produced && o.status === 'Pending');
  if (!unproduced.length) {
    list.innerHTML = '<div style="color:#aaa;text-align:center;">No unproduced orders.</div>';
    return;
  }
  unproduced.forEach(order => {
    const div = document.createElement('div');
    div.className = 'menu-item';
    const customer = order.customerName || (window.data.customers.find(c => c.id === order.customerId)?.name) || 'Unknown';
    const pickup = order.pickupDate ? `<br><strong>Pickup:</strong> ${formatDate(order.pickupDate)}` : '';
    div.innerHTML = `<strong>${customer}</strong><br>${order.date || ''}${pickup}<br>${order.items.map(oi => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return `${item ? item.name : 'Unknown'} x${oi.qty}`;
    }).join('<br>')}`;
    div.onclick = () => showProductionDetails(order);
    list.appendChild(div);
  });
}
function showProductionDetails(order) {
  document.getElementById('production-details').style.display = 'block';
  document.getElementById('unproduced-orders-list').style.display = 'none';
  let info = `<strong>Customer:</strong> ${order.customerName || (window.data.customers.find(c => c.id === order.customerId)?.name) || 'Unknown'}<br>`;
  info += `<strong>Date:</strong> ${order.date || ''}<br>`;
  if (order.pickupDate) info += `<strong>Pickup:</strong> ${formatDate(order.pickupDate)}<br>`;
  info += `<strong>Items:</strong><br>`;
  order.items.forEach(oi => {
    const item = window.data.menuItems.find(m => m.id === oi.itemId);
    info += `- ${item ? item.name : 'Unknown'} x${oi.qty}<br>`;
    if (item) info += `<em>${item.instructions}</em><br>`;
  });
  document.getElementById('production-order-info').innerHTML = info;
  // Show ingredient requirements and warnings
  let warnings = '';
  let canProduce = true;
  let usedIngredients = [];
  order.items.forEach(oi => {
    const item = window.data.menuItems.find(m => m.id === oi.itemId);
    if (!item) return;
    item.ingredientsRequired.forEach(ir => {
      const ing = window.data.ingredients.find(i => i.id === ir.ingredientId);
      if (ing) {
        const required = ir.quantity * oi.qty;
        usedIngredients.push({ name: ing.name, amount: required });
        if (ing.quantity - required < 4) {
          warnings += `<div style='color:#b30000;'>Warning: ${ing.name} will be below critical stock after production!</div>`;
        }
        if (ing.quantity < required) {
          canProduce = false;
          warnings += `<div style='color:#b30000;'>Not enough ${ing.name} for this order!</div>`;
        }
      }
    });
  });
  document.getElementById('production-recipe-info').innerHTML = warnings;
  document.getElementById('confirm-production').disabled = !canProduce;
  document.getElementById('confirm-production').onclick = function() {
    // Deduct ingredients, mark order as produced, add to productionHistory
    order.items.forEach(oi => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      if (!item) return;
      item.ingredientsRequired.forEach(ir => {
        const ing = window.data.ingredients.find(i => i.id === ir.ingredientId);
        if (ing) ing.quantity -= ir.quantity * oi.qty;
      });
      const totalCost = (item.cost || 0) * oi.qty;
      const totalRevenue = (item.price || 0) * oi.qty;
      window.data.productionHistory.push({
        recipeName: item.name,
        quantity: oi.qty,
        totalCost,
        totalRevenue,
        date: new Date().toISOString(),
        ingredientsUsed: item.ingredientsRequired.map(ir => {
          const ing = window.data.ingredients.find(i => i.id === ir.ingredientId);
          return { name: ing ? ing.name : ir.ingredientId, amount: ir.quantity * oi.qty };
        })
      });
    });
    order.produced = true;
    order.status = 'Produced';
    saveData();
    renderIngredients();
    renderUnproducedOrders();
    updateCharts();
    document.getElementById('production-details').style.display = 'none';
    document.getElementById('unproduced-orders-list').style.display = 'block';
  };
}
document.getElementById('back-to-production').onclick = function() {
  document.getElementById('production-details').style.display = 'none';
  document.getElementById('unproduced-orders-list').style.display = 'block';
};
document.getElementById('nav-production').addEventListener('click', () => {
  showSection('production-section');
  renderUnproducedOrders();
});

// --- CALENDAR TAB ---
document.getElementById('nav-calendar').addEventListener('click', () => {
  showSection('calendar-section');
  renderCalendarView();
});

let calendarMonth = null; // {year, month} (month is 0-based)

function renderCalendarView() {
  const cal = getById('calendar-view');
  if (!cal) return;
  let now = new Date();
  let year, month;
  if (calendarMonth) {
    year = calendarMonth.year;
    month = calendarMonth.month;
  } else {
    year = now.getFullYear();
    month = now.getMonth();
    calendarMonth = { year, month };
  }
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Month navigation
  let html = `
    <div class="calendar-header">
      <button id="cal-prev-month">&lt;</button>
      <span style="font-size:1.2em;">${firstDay.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
      <button id="cal-next-month">&gt;</button>
    </div>
    <table>
      <tr>${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<th>${d}</th>`).join('')}</tr>
  `;
  let day = 1;
  for (let i = 0; i < 6; i++) {
    html += '<tr>';
    for (let j = 0; j < 7; j++) {
      if ((i === 0 && j < firstDay.getDay()) || day > daysInMonth) {
        html += '<td></td>';
      } else {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const orders = window.data.orders.filter(o => o.pickupDate === dateStr);
        const prods = (window.data.productionHistory||[]).filter(p => (p.date||'').slice(0,10) === dateStr);
        // Highlight today
        let isToday = (year === now.getFullYear() && month === now.getMonth() && day === now.getDate());
        html += `<td class="${isToday ? 'calendar-today' : ''}">
          <span class="calendar-day-number">${day}</span>
          ${orders.length ? `<div class="calendar-orders">Orders: ${orders.length}</div>` : ''}
          ${prods.length ? `<div class="calendar-produced">Produced: ${prods.length}</div>` : ''}
        </td>`;
        day++;
      }
    }
    html += '</tr>';
    if (day > daysInMonth) break;
  }
  html += '</table>';
  cal.innerHTML = html;

  // Attach month navigation
  document.getElementById('cal-prev-month').onclick = function() {
    calendarMonth.month--;
    if (calendarMonth.month < 0) {
      calendarMonth.month = 11;
      calendarMonth.year--;
    }
    renderCalendarView();
  };
  document.getElementById('cal-next-month').onclick = function() {
    calendarMonth.month++;
    if (calendarMonth.month > 11) {
      calendarMonth.month = 0;
      calendarMonth.year++;
    }
    renderCalendarView();
  };
}

// --- PATCH MODAL BUTTON HANDLERS TO BE ROBUST ---
function attachModalHandlers() {
  // Ingredient Modal
  var addIngBtn = document.getElementById('add-ingredient-btn');
  if (addIngBtn) {
    addIngBtn.onclick = function() {
      if (typeof renderIngredientModalForm === 'function') {
        renderIngredientModalForm();
      }
      var title = document.getElementById('ingredient-modal-title');
      if (title) title.textContent = 'Add Ingredient';
      if (typeof showModal === 'function') showModal('ingredient-modal');
    };
  }
  var closeIngModal = document.getElementById('close-ingredient-modal');
  if (closeIngModal) {
    closeIngModal.onclick = function() { if (typeof hideModal === 'function') hideModal('ingredient-modal'); };
  }
  // Recipe Modal
  var addRecipeBtn = document.getElementById('add-recipe-btn');
  if (addRecipeBtn) {
    addRecipeBtn.onclick = function() {
      var form = document.getElementById('recipe-modal-form');
      if (form) form.reset();
      var id = document.getElementById('recipe-modal-id');
      if (id) id.value = '';
      var name = document.getElementById('recipe-modal-name');
      if (name) name.value = '';
      var instr = document.getElementById('recipe-modal-instructions');
      if (instr) instr.value = '';
      var ingCont = document.getElementById('recipe-modal-ingredients-container');
      if (ingCont) ingCont.innerHTML = '<h3>Ingredients Required</h3>';
      var price = document.getElementById('recipe-modal-price');
      if (price) price.value = '';
      var costDisp = document.getElementById('recipe-modal-cost-display');
      if (costDisp) costDisp.textContent = 'Cost to Make: $0.00';
      var title = document.getElementById('recipe-modal-title');
      if (title) title.textContent = 'Add Recipe';
      if (typeof showModal === 'function') showModal('recipe-modal');
      if (typeof attachRecipeModalIngredientBtn === 'function') attachRecipeModalIngredientBtn();
    };
  }
  var closeRecipeModal = document.getElementById('close-recipe-modal');
  if (closeRecipeModal) {
    closeRecipeModal.onclick = function() { if (typeof hideModal === 'function') hideModal('recipe-modal'); };
  }
  // Restock Modal
  var restockCancel = document.getElementById('restock-cancel');
  if (restockCancel) {
    restockCancel.onclick = function() {
      var modal = document.getElementById('restock-modal');
      if (modal) modal.style.display = 'none';
      window.restockIngredientId = null;
    };
  }
  var restockConfirm = document.getElementById('restock-confirm');
  if (restockConfirm) {
    restockConfirm.onclick = function() {
      const amount = parseInt(document.getElementById('restock-amount').value);
      if (!isNaN(amount) && amount > 0 && restockIngredientId) {
        const ing = window.data.ingredients.find(i => i.id === restockIngredientId);
        if (ing) {
          ing.quantity += amount;
          saveData();
          renderIngredients();
          showLowStockAlert();
          showToast(`Restocked ${ing.name} by ${amount}.`);
        }
      }
      const modal = document.getElementById('restock-modal');
      if (modal) modal.style.display = 'none';
      restockIngredientId = null;
    };
  }
  // Walk-in Modal
  var walkinCancel = document.getElementById('walkin-cancel');
  if (walkinCancel) {
    walkinCancel.onclick = function() {
      var modal = document.getElementById('walkin-modal');
      if (modal) modal.style.display = 'none';
    };
  }
  var walkinConfirm = document.getElementById('walkin-confirm');
  if (walkinConfirm) {
    walkinConfirm.onclick = function() {
      var nameInput = document.getElementById('walkin-name');
      if (!nameInput) return;
      const name = nameInput.value.trim() || 'Walk-in';
      var modal = document.getElementById('walkin-modal');
      if (modal) modal.style.display = 'none';
    };
  }
  // Quantity Modal
  var closeQtyModal = document.getElementById('close-modal');
  if (closeQtyModal) {
    closeQtyModal.onclick = function() {
      var modal = document.getElementById('quantity-modal');
      if (modal) modal.style.display = 'none';
    };
  }
  // Confirmation Modal
  var closeConfirmModal = document.getElementById('close-confirm-modal');
  if (closeConfirmModal) {
    closeConfirmModal.onclick = function() { if (typeof hideModal === 'function') hideModal('confirm-modal'); };
  }
  // Add Ingredient to Recipe Modal
  if (typeof attachRecipeModalIngredientBtn === 'function') attachRecipeModalIngredientBtn();
}

// --- CALL attachModalHandlers ON LOAD ---
window.onload = function() {
  if (window.loadData) window.loadData();
  if (typeof setupNavigation === 'function') setupNavigation();
  if (typeof attachModalHandlers === 'function') attachModalHandlers();
  if (typeof showSection === 'function') showSection('dashboard-section');
  if (typeof updateCharts === 'function') updateCharts();
};

// --- MISSING FUNCTION IMPLEMENTATIONS ---

// INGREDIENTS
window.editIngredient = function(id) {
  const ing = window.data.ingredients.find(i => i.id === id);
  if (!ing) return;
  document.getElementById('ingredient-id').value = ing.id;
  document.getElementById('ingredient-name').value = ing.name;
  document.getElementById('ingredient-quantity').value = ing.quantity;
  document.getElementById('ingredient-unit').value = ing.unit || '';
  document.getElementById('ingredient-price').value = ing.price;
  document.getElementById('ingredient-modal-title').textContent = 'Edit Ingredient';
  showModal('ingredient-modal');
};

window.deleteIngredient = function(id) {
  showConfirm('Delete this ingredient?', () => {
    window.data.ingredients = window.data.ingredients.filter(i => i.id !== id);
    saveData();
    renderIngredients();
    showToast('Ingredient deleted!');
  });
};

window.showLowStockAlert = function() {
  const alertDiv = document.getElementById('low-stock-alert');
  if (!alertDiv) return;
  const low = window.data.ingredients.filter(i => i.quantity < 4);
  if (low.length) {
    alertDiv.innerHTML = 'Low stock: ' + low.map(i => `<b>${i.name}</b> (${i.quantity})`).join(', ');
    alertDiv.style.display = '';
  } else {
    alertDiv.style.display = 'none';
  }
};

// RECIPES
window.deleteMenuItem = function(id) {
  showConfirm('Delete this recipe?', () => {
    window.data.menuItems = window.data.menuItems.filter(m => m.id !== id);
    saveData();
    renderMenuItems();
    showToast('Recipe deleted!');
  });
};

// CUSTOMERS
function renderCustomerForm(customer = null) {
  document.getElementById('customer-id').value = customer ? customer.id : '';
  document.getElementById('customer-name').value = customer ? customer.name : '';
  document.getElementById('customer-phone').value = customer ? customer.phone || '' : '';
  document.getElementById('customer-email').value = customer ? customer.email || '' : '';
}
window.editCustomer = function(id) {
  const c = window.data.customers.find(c => c.id === id);
  if (c) renderCustomerForm(c);
};
window.deleteCustomer = function(id) {
  showConfirm('Delete this customer?', () => {
    window.data.customers = window.data.customers.filter(c => c.id !== id);
    saveData();
    renderCustomers();
    showToast('Customer deleted!');
  });
}
document.getElementById('customer-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let id = document.getElementById('customer-id').value;
  let name = document.getElementById('customer-name').value;
  let phone = document.getElementById('customer-phone').value;
  let email = document.getElementById('customer-email').value;
  if (id) {
    window.data.customers = window.data.customers.map(c =>
      c.id === id ? { id, name, phone, email } : c
    );
  } else {
    id = Date.now().toString();
    window.data.customers.push({ id, name, phone, email });
  }
  saveData();
  renderCustomers();
  this.reset();
  document.getElementById('customer-id').value = '';
  showToast('Customer saved!');
});

// --- GENERIC CONFIRM MODAL ---
window.showConfirm = function(message, onYes) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-modal-message').textContent = message;
  modal.style.display = 'flex';
  document.getElementById('confirm-modal-yes').onclick = function() {
    modal.style.display = 'none';
    if (typeof onYes === 'function') onYes();
  };
  document.getElementById('confirm-modal-no').onclick = function() {
    modal.style.display = 'none';
  };
  document.getElementById('close-confirm-modal').onclick = function() {
    modal.style.display = 'none';
  };
};
window.hideModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
};
window.showModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
};

// --- DASHBOARD BUTTONS ---
document.getElementById('export-data').onclick = function() {
  const dataStr = JSON.stringify(window.data, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cinnamon_secrets_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
document.getElementById('import-data').onclick = function() {
  document.getElementById('import-file').click();
};
document.getElementById('import-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      window.data = JSON.parse(evt.target.result);
      saveData();
      location.reload();
    } catch (err) {
      showToast('Import failed: Invalid file');
    }
  };
  reader.readAsText(file);
});
document.getElementById('reset-data').onclick = function() {
  showConfirm('Reset ALL data? This cannot be undone.', () => {
    localStorage.removeItem('cinnamonSecretsData');
    location.reload();
  });
};
document.getElementById('export-report').onclick = function() {
  // Get current month/year
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  // Helper to check if a date string is in this month
  function isInMonth(dateStr) {
    if (!dateStr) return false;
    const [y, m] = dateStr.split('-');
    return Number(y) === year && Number(m) === month;
  }

  // --- ORDERS SECTION ---
  let csv = `CINNAMON SECRETS MONTHLY REPORT\nMonth,${now.toLocaleString(undefined, { month: 'long', year: 'numeric' })}\n\n`;
  csv += '--- ORDERS ---\n';
  csv += 'Order Date,Pickup Date,Customer,Customer Type,Items,Qty,Total,Status\n';

  const orders = (window.data.orders || []).filter(o => isInMonth(o.pickupDate));
  orders.forEach(order => {
    const customerType = order.customerId ? 'Registered' : 'Walk-in';
    const itemsStr = (order.items || []).map(oi => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return `${item ? item.name : 'Unknown'} x${oi.qty}`;
    }).join(' | ');
    const qty = order.items.reduce((sum, oi) => sum + oi.qty, 0);
    const total = order.items.reduce((sum, oi) => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return sum + ((item?.price || 0) * oi.qty);
    }, 0);
    csv += [
      order.date,
      order.pickupDate,
      `"${order.customerName}"`,
      customerType,
      `"${itemsStr}"`,
      qty,
      `$${total.toFixed(2)}`,
      order.status
    ].join(',') + '\n';
  });

  csv += '\n';

  // --- CUSTOMER SUMMARY SECTION ---
  csv += '--- CUSTOMER SUMMARY ---\n';
  csv += 'Customer,Customer Type,Orders,Total Items,Total Spent\n';
  // Group by customerName/customerId
  const customerStats = {};
  orders.forEach(order => {
    const key = order.customerId || 'walkin:' + (order.customerName || 'Walk-in');
    if (!customerStats[key]) {
      customerStats[key] = {
        name: order.customerName,
        type: order.customerId ? 'Registered' : 'Walk-in',
        orders: 0,
        items: 0,
        spent: 0
      };
    }
    customerStats[key].orders += 1;
    customerStats[key].items += order.items.reduce((sum, oi) => sum + oi.qty, 0);
    customerStats[key].spent += order.items.reduce((sum, oi) => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return sum + ((item?.price || 0) * oi.qty);
    }, 0);
  });
  Object.values(customerStats).forEach(stat => {
    csv += [
      `"${stat.name}"`,
      stat.type,
      stat.orders,
      stat.items,
      `$${stat.spent.toFixed(2)}`
    ].join(',') + '\n';
  });

  csv += '\n';

  // --- RECIPE SUMMARY SECTION ---
  csv += '--- RECIPE SUMMARY ---\n';
  csv += 'Recipe,Produced Qty,Total Revenue\n';
  // Count by recipe
  const recipeStats = {};
  orders.forEach(order => {
    (order.items || []).forEach(oi => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      if (!item) return;
      if (!recipeStats[item.name]) {
        recipeStats[item.name] = { qty: 0, revenue: 0 };
      }
      recipeStats[item.name].qty += oi.qty;
      recipeStats[item.name].revenue += (item.price || 0) * oi.qty;
    });
  });
  Object.entries(recipeStats).forEach(([name, stat]) => {
    csv += [
      `"${name}"`,
      stat.qty,
      `$${stat.revenue.toFixed(2)}`
    ].join(',') + '\n';
  });

  csv += '\n';

  // --- PRODUCTION HISTORY SECTION ---
  csv += '--- PRODUCTION HISTORY ---\n';
  csv += 'Date,Recipe,Qty,Total Cost,Total Revenue\n';
  (window.data.productionHistory || []).forEach(entry => {
    // Only include this month
    if (!isInMonth((entry.date || '').slice(0, 10))) return;
    csv += [
      entry.date || '',
      entry.recipeName || '',
      entry.quantity || '',
      entry.totalCost || '',
      entry.totalRevenue || ''
    ].join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cinnamon_secrets_monthly_report_${year}_${String(month).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- EDIT ORDER MODAL LOGIC ---

window.editOrder = function(orderId) {
  const order = window.data.orders.find(o => o.id === orderId);
  if (!order) return;
  // Populate modal fields
  document.getElementById('edit-order-id').value = order.id;

  // Populate customer select
  const customers = window.data.customers || [];
  const select = document.getElementById('edit-order-customer-select');
  select.innerHTML = `
    <option value="">Select Customer</option>
    ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    <option value="new">New Customer / Walk-in</option>
  `;
  const nameInput = document.getElementById('edit-order-customer-name');
  if (order.customerId) {
    select.value = order.customerId;
    nameInput.style.display = 'none';
    nameInput.value = '';
  } else {
    select.value = 'new';
    nameInput.style.display = '';
    nameInput.value = order.customerName || '';
  }
  select.onchange = function() {
    nameInput.style.display = (select.value === 'new') ? '' : 'none';
  };

  // Pickup date
  const pickupInput = document.getElementById('edit-order-pickup-date');
  pickupInput.min = getMinPickupDateStr();
  pickupInput.value = order.pickupDate || getMinPickupDateStr();

  // Items
  const container = document.getElementById('edit-order-items-container');
  container.innerHTML = '';
  (order.items || []).forEach(item => {
    addEditOrderItemRow(item.itemId, item.qty);
  });
  if (!order.items || !order.items.length) addEditOrderItemRow();

  // Add item button
  document.getElementById('edit-add-order-item').onclick = addEditOrderItemRow;

  // Show modal
  document.getElementById('edit-order-modal').style.display = 'flex';
};

// Helper for edit modal: add item row
function addEditOrderItemRow(selectedId = '', qty = 1) {
  const container = document.getElementById('edit-order-items-container');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'order-item-row';
  // Menu items dropdown
  const select = document.createElement('select');
  select.required = true;
  select.innerHTML = `<option value="">Select Item</option>` +
    (window.data.menuItems || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  if (selectedId) select.value = selectedId;
  // Quantity input
  const input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.value = qty;
  input.required = true;
  input.style = 'width:60px;display:inline-block;margin-left:8px;';
  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = 'Remove';
  removeBtn.style = 'margin-left:8px;';
  removeBtn.onclick = () => row.remove();
  // Append
  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

// Save changes handler
document.getElementById('edit-order-form').onsubmit = function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-order-id').value;
  const select = document.getElementById('edit-order-customer-select');
  const nameInput = document.getElementById('edit-order-customer-name');
  const pickupInput = document.getElementById('edit-order-pickup-date');
  let customerId = '';
  let customerName = '';
  if (select) {
    if (select.value === 'new') {
      customerName = nameInput.value.trim() || 'Walk-in';
    } else {
      customerId = select.value;
      const custObj = (window.data.customers || []).find(c => c.id === customerId);
      customerName = custObj ? custObj.name : '';
    }
  }
  // Validate pickup date
  let pickupDate = pickupInput ? pickupInput.value : '';
  const minPickup = getMinPickupDateStr();
  if (!pickupDate || pickupDate < minPickup) {
    showToast('Pickup date must be at least 48 hours from now.');
    return;
  }
  // Gather items
  const items = [];
  document.querySelectorAll('#edit-order-items-container .order-item-row').forEach(row => {
    const itemSelect = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    if (itemSelect && qtyInput && itemSelect.value && parseInt(qtyInput.value) > 0) {
      items.push({ itemId: itemSelect.value, qty: parseInt(qtyInput.value) });
    }
  });
  if (!customerName || !items.length) return;
  // Update order
  const order = window.data.orders.find(o => o.id === id);
  if (order) {
    order.customerId = customerId;
    order.customerName = customerName;
    order.pickupDate = pickupDate;
    order.items = items;
  }
  saveData();
  renderOrders();
  showToast('Order updated!');
  document.getElementById('edit-order-modal').style.display = 'none';
};

// Close modal handler
document.getElementById('close-edit-order-modal').onclick = function() {
  document.getElementById('edit-order-modal').style.display = 'none';
};

// --- END PATCH ---