// Global data store
// let data = {
//   ingredients: [],
//   menuItems: [],
//   productionHistory: []
// };

// function loadData() {
//   const localData = localStorage.getItem('cinnamonSecretsData');
//   if (localData) {
//       data = JSON.parse(localData);
//   }
// }

// Function to show toast notification
function showToast(message = "Saved successfully!") {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.style.display = 'none';
      toast.style.transition = '';
    }, 500);
  }, 3000);
}

function saveData() {
  localStorage.setItem('cinnamonSecretsData', JSON.stringify(window.data));
}

// Navigation handling
document.getElementById('nav-ingredients').addEventListener('click', () => {
  showSection('ingredients-section');
  renderIngredients();
});
document.getElementById('nav-recipes').addEventListener('click', () => {
  showSection('recipes-section');
  renderMenuItems();
});
document.getElementById('nav-production').addEventListener('click', () => {
  showSection('production-section');
  renderMenuList();
});
document.getElementById('nav-dashboard').addEventListener('click', () => {
  showSection('dashboard-section');
  updateCharts();
});
document.getElementById('nav-orders').addEventListener('click', () => {
  showSection('orders-section');
  document.getElementById('order-search').value = '';
  document.getElementById('order-status-filter').value = '';
  renderOrders();
  populateOrderCustomer();
  const container = document.getElementById('order-items-container');
  container.innerHTML = '';
  addOrderItemRow();
});
// document.getElementById('nav-staff').addEventListener('click', () => {
//   showSection('staff-section');
//   renderStaff();
// });
document.getElementById('nav-customers').addEventListener('click', () => {
  showSection('customers-section');
  renderCustomers();
});

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => {
    sec.style.display = sec.id === sectionId ? 'block' : 'none';
  });
}

// INGREDIENTS MANAGEMENT
document.getElementById('ingredient-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let id = document.getElementById('ingredient-id').value;
  let name = document.getElementById('ingredient-name').value;
  let price = parseFloat(document.getElementById('ingredient-price').value);
  let quantity = parseInt(document.getElementById('ingredient-quantity').value);

  if (id) {
    window.data.ingredients = window.data.ingredients.map(ing =>
      ing.id === id ? { id, name, price, quantity } : ing
    );
  } else {
    id = Date.now().toString();
    window.data.ingredients.push({ id, name, price, quantity });
  }
  saveData();
  renderIngredients();
  this.reset();
  document.getElementById('ingredient-id').value = '';
  showToast();
});

function renderIngredients() {
  const tbody = document.getElementById('ingredients-table').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  if (!window.data.ingredients.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align:center;color:#aaa;">No ingredients yet. Add one above!</td>`;
    tbody.appendChild(tr);
    return;
  }
  window.data.ingredients.forEach(ing => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ing.name}</td>
      <td contenteditable="true" onblur="updateIngredientPrice('${ing.id}', this.textContent)">${ing.price.toFixed(2)}</td>
      <td>
        <button onclick="changeIngredientQty('${ing.id}', -1)">–</button>
        <span style="margin:0 8px;" contenteditable="true" onblur="updateIngredientQty('${ing.id}', this.textContent)">${ing.quantity}</span>
        <button onclick="changeIngredientQty('${ing.id}', 1)">+</button>
      </td>
      <td>
        <button type="button" onclick="editIngredient('${ing.id}')">Edit</button>
        <button type="button" onclick="deleteIngredient('${ing.id}')">Delete</button>
        <button type="button" onclick="restockIngredient('${ing.id}')">Restock</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

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

// MENU MANAGEMENT (Recipes)
function renderMenuItems() {
  const tbody = document.getElementById('menu-table').getElementsByTagName('tbody')[0];
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
      <td>${item.recipe}</td>
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
    document.getElementById('menu-id').value = item.id;
    document.getElementById('menu-name').value = item.name;
    document.getElementById('menu-recipe').value = item.recipe;
    document.getElementById('menu-price').value = item.price;
    document.getElementById('menu-cost-display').textContent = `Cost to Make: $${item.cost ? item.cost.toFixed(2) : "0.00"}`;
    document.getElementById('menu-ingredients-container').innerHTML = '<h3>Ingredients Required</h3>';
    item.ingredientsRequired.forEach(ir => {
      addMenuIngredientRow(ir.ingredientId, ir.quantity);
    });
    updateMenuCostPreview();
  }
};

document.getElementById('menu-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let id = document.getElementById('menu-id').value;
  let name = document.getElementById('menu-name').value;
  let recipe = document.getElementById('menu-recipe').value;
  let price = parseFloat(document.getElementById('menu-price').value);

  let ingredientsRequired = [];
  document.querySelectorAll('.menu-ingredient-row').forEach(row => {
    const select = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    ingredientsRequired.push({ ingredientId: select.value, quantity: parseInt(qtyInput.value) });
  });

  let cost = ingredientsRequired.reduce((total, ir) => {
    let ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
    return ingredient ? total + (ingredient.price * ir.quantity) : total;
  }, 0);

  document.getElementById('menu-cost-display').textContent = `Cost to Make: $${cost.toFixed(2)}`;

  if (id) {
    window.data.menuItems = window.data.menuItems.map(item =>
      item.id === id ? { id, name, recipe, ingredientsRequired, cost, price } : item
    );
  } else {
    id = Date.now().toString();
    window.data.menuItems.push({ id, name, recipe, ingredientsRequired, cost, price });
  }
  saveData();
  renderMenuItems();
  this.reset();
  document.getElementById('menu-id').value = '';
  document.getElementById('menu-ingredients-container').innerHTML = '<h3>Ingredients Required</h3>';
  document.getElementById('menu-cost-display').textContent = 'Cost to Make: $0.00';
  showToast();
});

document.getElementById('add-menu-ingredient').addEventListener('click', function() {
  addMenuIngredientRow();
});

function addMenuIngredientRow(selectedId = '', qty = 1) {
  const container = document.getElementById('menu-ingredients-container');
  const row = document.createElement('div');
  row.className = 'menu-ingredient-row';

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
    updateMenuCostPreview();
  };

  // Update cost preview on change
  select.addEventListener('change', updateMenuCostPreview);
  input.addEventListener('input', updateMenuCostPreview);

  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeBtn);

  container.appendChild(row);

  updateMenuCostPreview();
}

// PRODUCTION FUNCTIONALITY
function renderMenuList() {
  const menuListDiv = document.getElementById('menu-list');
  menuListDiv.innerHTML = '';
  window.data.menuItems.forEach(item => {
    const div = document.createElement('div');
    div.className = "menu-item";
    div.textContent = item.name;
    div.onclick = () => {
      openQuantityModal(item);
    };
    menuListDiv.appendChild(div);
  });
}

function openQuantityModal(menuItem) {
  document.getElementById('quantity-modal').style.display = 'flex';
  document.getElementById('production-quantity').value = '';

  document.getElementById('calculate-production').onclick = function() {
    const qty = parseInt(document.getElementById('production-quantity').value);
    if (!qty || qty < 1) {
      alert("Please enter a valid quantity.");
      return;
    }
    closeModal();
    calculateProduction(menuItem, qty);
  };
}

function closeModal() {
  document.getElementById('quantity-modal').style.display = 'none';
  document.getElementById('production-quantity').value = '';
}

document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('back-to-production').addEventListener('click', () => {
  document.getElementById('production-details').style.display = 'none';
  document.getElementById('menu-list').style.display = 'flex';
});

let currentProduction = null;

function calculateProduction(menuItem, qty) {
  let details = `To produce ${qty} of ${menuItem.name}, you will need:<br/>`;
  let shortages = [];
  let canProduce = true;

  menuItem.ingredientsRequired.forEach(ir => {
    const ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
    if (ingredient) {
      const required = ir.quantity * qty;
      const shortageAmount = required - ingredient.quantity;
      if (shortageAmount > 0) {
        shortages.push(`${ingredient.name}: Need ${shortageAmount} more`);
        canProduce = false;
      }
      details += `${ingredient.name}: ${required} ${shortageAmount > 0 ? "(Low Stock!)" : ""}<br/>`;
    }
  });

  if (shortages.length > 0) {
    details += `<br><strong>Shortages:</strong><br>${shortages.join("<br>")}`;
  }

  document.getElementById('production-info').innerHTML = details;
  document.getElementById('production-details').style.display = 'block';
  document.getElementById('menu-list').style.display = 'none';

  currentProduction = { menuItem, qty, canProduce };
}

document.getElementById('confirm-production').onclick = function() {
  if (!currentProduction || !currentProduction.canProduce) {
    alert("Cannot produce due to ingredient shortages.");
    return;
  }
  currentProduction.menuItem.ingredientsRequired.forEach(ir => {
    const ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
    if (ingredient) {
      ingredient.quantity -= ir.quantity * currentProduction.qty;
    }
  });
  const totalCost = (currentProduction.menuItem.cost || 0) * currentProduction.qty;
  const totalRevenue = (currentProduction.menuItem.price || 0) * currentProduction.qty;
  window.data.productionHistory.push({
    recipeName: currentProduction.menuItem.name,
    quantity: currentProduction.qty,
    totalCost,
    totalRevenue,
    date: new Date().toISOString()
  });
  saveData();
  renderIngredients();
  updateCharts();
  document.getElementById('production-details').style.display = 'none';
  document.getElementById('menu-list').style.display = 'flex';
  currentProduction = null;
  showToast("Production confirmed! Ingredient levels updated.");
};

function showLowStockAlert() {
  const lowStock = window.data.ingredients.filter(i => i.quantity < 4);
  const alertDiv = document.getElementById('low-stock-alert');
  if (lowStock.length) {
    alertDiv.style.display = 'block';
    alertDiv.innerHTML = `<strong>Low Stock Alert:</strong> ${lowStock.map(i => i.name).join(', ')}`;
  } else {
    alertDiv.style.display = 'none';
  }
}

// Call this in updateCharts and after ingredient changes
function updateCharts() {
  if (typeof renderIngredientChart === "function") renderIngredientChart();
  if (typeof renderRecipeChart === "function") renderRecipeChart();
  if (typeof renderMoneyChart === "function") renderMoneyChart();
  showLowStockAlert();
}

window.onload = function() {
  window.loadData();
  renderIngredients();
  renderMenuItems();
  renderMenuList();
  updateCharts();
  if (!localStorage.getItem('cinnamonSecretsWelcomed')) {
    showToast("Welcome to Cinnamon Secrets Bakery Manager! 🎉");
    localStorage.setItem('cinnamonSecretsWelcomed', 'yes');
  }
};

window.editIngredient = function(id) {
  const ing = window.data.ingredients.find(i => i.id === id);
  if (ing) {
    document.getElementById('ingredient-id').value = ing.id;
    document.getElementById('ingredient-name').value = ing.name;
    document.getElementById('ingredient-price').value = ing.price;
    document.getElementById('ingredient-quantity').value = ing.quantity;
  }
};

window.deleteIngredient = function(id) {
  if (confirm('Delete this ingredient?')) {
    window.data.ingredients = window.data.ingredients.filter(i => i.id !== id);
    window.data.menuItems.forEach(item => {
      item.ingredientsRequired = item.ingredientsRequired.filter(ir => ir.ingredientId !== id);
    });
    saveData();
    renderIngredients();
    renderMenuItems();
    renderMenuList();
    showToast("Ingredient deleted!");
  }
};

window.deleteMenuItem = function(id) {
  if (confirm('Delete this recipe?')) {
    window.data.menuItems = window.data.menuItems.filter(m => m.id !== id);
    saveData();
    renderMenuItems();
    renderMenuList();
    showToast("Recipe deleted!");
  }
};

// Add to window.data
window.data.orders = window.data.orders || [];

window.data.customers = window.data.customers || [];

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
  showToast("Customer saved!");
});

function renderCustomers() {
  const tbody = document.getElementById('customers-table').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  if (!window.data.customers.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align:center;color:#aaa;">No customers yet.</td>`;
    tbody.appendChild(tr);
    return;
  }
  window.data.customers.forEach(c => {
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

window.editCustomer = function(id) {
  const c = window.data.customers.find(c => c.id === id);
  if (c) {
    document.getElementById('customer-id').value = c.id;
    document.getElementById('customer-name').value = c.name;
    document.getElementById('customer-phone').value = c.phone;
    document.getElementById('customer-email').value = c.email;
  }
};

window.deleteCustomer = function(id) {
  if (confirm('Delete this customer?')) {
    window.data.customers = window.data.customers.filter(c => c.id !== id);
    saveData();
    renderCustomers();
    showToast("Customer deleted!");
  }
};

// Orders: Use customer dropdown
function populateOrderCustomer() {
  const select = document.getElementById('order-customer');
  select.innerHTML = '';
  window.data.customers.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    select.appendChild(option);
  });
  // Allow manual entry for new customers
  const option = document.createElement('option');
  option.value = '';
  option.textContent = 'New Customer...';
  select.appendChild(option);
}

document.getElementById('nav-orders').addEventListener('click', () => {
  showSection('orders-section');
  document.getElementById('order-search').value = '';
  document.getElementById('order-status-filter').value = '';
  renderOrders();
  populateOrderCustomer();
  const container = document.getElementById('order-items-container');
  container.innerHTML = '';
  addOrderItemRow();
});

document.getElementById('order-customer').addEventListener('change', function() {
  if (this.value === '') {
    this.type = 'text';
    this.value = '';
    this.placeholder = 'Enter customer name';
  }
});

// Update order-form submit to save new customers if needed
let pendingOrderSubmit = null;

document.getElementById('order-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let customerId = document.getElementById('order-customer').value;
  let customerName = '';
  let isWalkIn = false;

  if (!customerId) {
    // Show walk-in modal instead of prompt
    document.getElementById('walkin-name').value = '';
    document.getElementById('walkin-modal').style.display = 'flex';
    // Accepts the name from the modal!
    pendingOrderSubmit = (walkinName) => submitOrder(this, walkinName, true);
    return;
  } else {
    const customer = window.data.customers.find(c => c.id === customerId);
    customerName = customer ? customer.name : "Unknown";
    submitOrder(this, customerName, false);
  }
});

document.getElementById('walkin-cancel').onclick = function() {
  document.getElementById('walkin-modal').style.display = 'none';
  pendingOrderSubmit = null;
};

document.getElementById('walkin-confirm').onclick = function() {
  const name = document.getElementById('walkin-name').value.trim() || "Walk-in";
  document.getElementById('walkin-modal').style.display = 'none';
  if (pendingOrderSubmit) {
    pendingOrderSubmit(name);
    pendingOrderSubmit = null;
  }
};

// Helper for order submission
function submitOrder(form, walkinName, isWalkIn) {
  let customerId = document.getElementById('order-customer').value;
  let customerName = walkinName || '';
  if (!isWalkIn) {
    const customer = window.data.customers.find(c => c.id === customerId);
    customerName = customer ? customer.name : "Unknown";
  }

  // Gather all selected items and quantities
  let items = [];
  document.querySelectorAll('.order-item-row').forEach(row => {
    const itemSelect = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    if (itemSelect && qtyInput && itemSelect.value && qtyInput.value > 0) {
      items.push({
        itemId: itemSelect.value,
        qty: parseInt(qtyInput.value)
      });
    }
  });
  if (!items.length) {
    showToast("Please add at least one menu item.");
    return;
  }

  // Save order (do not save walk-in to customers)
  window.data.orders.push({
    id: Date.now().toString(),
    customerId: isWalkIn ? null : customerId,
    customerName,
    items,
    status: 'Pending'
  });
  saveData();
  renderOrders();
  form.reset();
  // Reset order items to just one row
  document.getElementById('order-items-container').innerHTML = '';
  addOrderItemRow();
  showToast("Order added!");
}

document.getElementById('order-search').addEventListener('input', function() {
  renderOrders(this.value, document.getElementById('order-status-filter').value);
});
document.getElementById('order-status-filter').addEventListener('change', function() {
  renderOrders(document.getElementById('order-search').value, this.value);
});

// Update the renderOrders function to accept a status filter:
function renderOrders(searchTerm = '', statusFilter = '') {
  const tbody = document.getElementById('orders-table').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  let orders = window.data.orders;
  if (statusFilter) {
    orders = orders.filter(order => order.status === statusFilter);
  }
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    orders = orders.filter(order => {
      const customer = order.customerName || (window.data.customers.find(c => c.id === order.customerId)?.name) || '';
      const itemsStr = order.items.map(oi => {
        const item = window.data.menuItems.find(m => m.id === oi.itemId);
        return item ? item.name : '';
      }).join(' ');
      return customer.toLowerCase().includes(term) || itemsStr.toLowerCase().includes(term);
    });
  }
  if (!orders.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center;color:#aaa;">No orders found.</td>`;
    tbody.appendChild(tr);
    return;
  }
  orders.forEach(order => {
    const customer = order.customerName || (window.data.customers.find(c => c.id === order.customerId)?.name) || 'Unknown';
    const itemsStr = order.items.map(oi => {
      const item = window.data.menuItems.find(m => m.id === oi.itemId);
      return `${item ? item.name : 'Unknown'} x${oi.qty}`;
    }).join('<br>');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${customer}</td>
      <td>${itemsStr}</td>
      <td>${order.items.reduce((sum, oi) => sum + oi.qty, 0)}</td>
      <td>${order.status}</td>
      <td>
        ${order.status === 'Pending' ? `<button type="button" onclick="fulfillOrder('${order.id}')">Fulfill</button>` : ''}
        <button type="button" onclick="deleteOrder('${order.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.fulfillOrder = function(id) {
  const order = window.data.orders.find(o => o.id === id);
  if (!order) return;

  // Fulfill all items in the order
  let canProduce = true;
  let shortages = [];
  order.items.forEach(oi => {
    const menuItem = window.data.menuItems.find(m => m.id === oi.itemId);
    if (!menuItem) return;
    menuItem.ingredientsRequired.forEach(ir => {
      const ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
      if (ingredient) {
        const required = ir.quantity * oi.qty;
        if (ingredient.quantity < required) {
          shortages.push(`${ingredient.name} (need ${required - ingredient.quantity} more)`);
          canProduce = false;
        }
      }
    });
  });

  if (!canProduce) {
    showToast("Cannot fulfill order: Not enough ingredients!\n" + shortages.join(", "));
    return;
  }

  // Deduct ingredients and record production
  order.items.forEach(oi => {
    const menuItem = window.data.menuItems.find(m => m.id === oi.itemId);
    if (!menuItem) return;
    menuItem.ingredientsRequired.forEach(ir => {
      const ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
      if (ingredient) {
        ingredient.quantity -= ir.quantity * oi.qty;
      }
    });
    const totalCost = (menuItem.cost || 0) * oi.qty;
    const totalRevenue = (menuItem.price || 0) * oi.qty;
    window.data.productionHistory.push({
      recipeName: menuItem.name,
      quantity: oi.qty,
      totalCost,
      totalRevenue,
      date: new Date().toISOString()
    });
  });

  order.status = 'Fulfilled';
  saveData();
  renderIngredients();
  renderOrders();
  updateCharts();
  showToast("Order fulfilled!");
};

window.deleteOrder = function(id) {
  window.data.orders = window.data.orders.filter(o => o.id !== id);
  saveData();
  renderOrders();
  showToast("Order deleted!");
};

document.getElementById('export-data').onclick = function() {
  const blob = new Blob([JSON.stringify(window.data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "cinnamon_secrets_data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Data exported!");
};

document.getElementById('import-data').onclick = function() {
  document.getElementById('import-file').click();
};

document.getElementById('import-file').onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (imported.ingredients && imported.menuItems && imported.productionHistory) {
        window.data = imported;
        window.data.orders = window.data.orders || [];
        window.data.customers = window.data.customers || [];
        saveData();
        renderIngredients();
        renderMenuItems();
        renderMenuList();
        updateCharts();
        showToast("Data imported!");
      } else {
        showToast("Invalid data file.");
      }
    } catch {
      showToast("Failed to import data.");
    }
  };
  reader.readAsText(file);
};

document.addEventListener('keydown', function(e) {
  if (e.key === "Escape") closeModal();
});

document.getElementById('quantity-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.getElementById('reset-data').onclick = function() {
  // Show a prompt for what to keep
  const keepIngredients = confirm("Keep ingredients? (OK = Yes, Cancel = No)");
  const keepRecipes = confirm("Keep recipes? (OK = Yes, Cancel = No)");
  const keepCustomers = confirm("Keep customers? (OK = Yes, Cancel = No)");
  window.data = {
    ingredients: keepIngredients ? window.data.ingredients : [],
    menuItems: keepRecipes ? window.data.menuItems : [],
    productionHistory: [],
    orders: [],
    customers: keepCustomers ? window.data.customers : []
  };
  window.data.orders = window.data.orders || [];
  window.data.customers = window.data.customers || [];
  saveData();
  renderIngredients();
  renderMenuItems();
  renderMenuList();
  renderCustomers();
  updateCharts();
  showToast("Data reset!");
};

document.getElementById('export-report').onclick = function() {
  // Group production by month
  const history = window.data.productionHistory || [];
  const orders = window.data.orders || [];
  if (!history.length && !orders.length) {
    showToast("No data to report.");
    return;
  }
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Production summary
  let totalRevenue = 0, totalCost = 0, totalProfit = 0;
  let recipeSummary = {};
  let ingredientUsage = {};

  history.forEach(entry => {
    const d = new Date(entry.date);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      totalRevenue += entry.totalRevenue;
      totalCost += entry.totalCost;
      totalProfit += (entry.totalRevenue - entry.totalCost);
      recipeSummary[entry.recipeName] = (recipeSummary[entry.recipeName] || 0) + entry.quantity;
      // Calculate ingredient usage
      const menuItem = window.data.menuItems.find(m => m.name === entry.recipeName);
      if (menuItem) {
        menuItem.ingredientsRequired.forEach(ir => {
          ingredientUsage[ir.ingredientId] = (ingredientUsage[ir.ingredientId] || 0) + ir.quantity * entry.quantity;
        });
      }
    }
  });

  // Orders summary
  let ordersSection = `Orders This Month:\n`;
  let orderCount = 0;
  orders.forEach(order => {
    const d = new Date(parseInt(order.id));
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      orderCount++;
      ordersSection += `Order #${order.id} - ${order.customerName || 'Unknown'}\n`;
      order.items.forEach(oi => {
        const item = window.data.menuItems.find(m => m.id === oi.itemId);
        ordersSection += `  - ${item ? item.name : 'Unknown'} x${oi.qty}\n`;
      });
      ordersSection += `Status: ${order.status}\n\n`;
    }
  });
  if (orderCount === 0) ordersSection += "No orders this month.\n";

  let report = `Cinnamon Secrets Monthly Report - ${month}\n\n`;
  report += `Total Revenue: $${totalRevenue.toFixed(2)}\n`;
  report += `Total Cost: $${totalCost.toFixed(2)}\n`;
  report += `Total Profit: $${totalProfit.toFixed(2)}\n\n`;
  report += `Production Summary:\n`;
  Object.entries(recipeSummary).forEach(([name, qty]) => {
    report += `- ${name}: ${qty}\n`;
  });
  report += `\nIngredient Usage:\n`;
  Object.entries(ingredientUsage).forEach(([id, qty]) => {
    const ing = window.data.ingredients.find(i => i.id === id);
    report += `- ${ing ? ing.name : id}: ${qty}\n`;
  });
  report += `\n${ordersSection}`;

  // Export as text file
  const blob = new Blob([report], {type: "text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CinnamonSecrets_Report_${month.replace(/\s/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Monthly report exported!");
};

function updateMenuCostPreview() {
  let ingredientsRequired = [];
  document.querySelectorAll('.menu-ingredient-row').forEach(row => {
    const select = row.querySelector('select');
    const qtyInput = row.querySelector('input[type="number"]');
    if (select && qtyInput) {
      ingredientsRequired.push({ ingredientId: select.value, quantity: parseInt(qtyInput.value) || 0 });
    }
  });
  let cost = ingredientsRequired.reduce((total, ir) => {
    let ingredient = window.data.ingredients.find(i => i.id === ir.ingredientId);
    return ingredient ? total + (ingredient.price * ir.quantity) : total;
  }, 0);
  document.getElementById('menu-cost-display').textContent = `Cost to Make: $${cost.toFixed(2)}`;
}

// window.data.staff = window.data.staff || [];

// document.getElementById('nav-staff').addEventListener('click', () => {
//   showSection('staff-section');
//   renderStaff();
// });

// document.getElementById('staff-form').addEventListener('submit', function(e) {
//   e.preventDefault();
//   const name = document.getElementById('staff-name').value;
//   const role = document.getElementById('staff-role').value;
//   window.data.staff.push({ id: Date.now().toString(), name, role });
//   saveData();
//   renderStaff();
//   this.reset();
//   showToast("Staff added!");
// });

// function renderStaff() {
//   const tbody = document.getElementById('staff-table').getElementsByTagName('tbody')[0];
//   tbody.innerHTML = '';
//   if (!window.data.staff.length) {
//     const tr = document.createElement('tr');
//     tr.innerHTML = `<td colspan="3" style="text-align:center;color:#aaa;">No staff yet.</td>`;
//     tbody.appendChild(tr);
//     return;
//   }
//   window.data.staff.forEach(staff => {
//     const tr = document.createElement('tr');
//     tr.innerHTML = `
//       <td>${staff.name}</td>
//       <td>${staff.role}</td>
//       <td><button type="button" onclick="deleteStaff('${staff.id}')">Delete</button></td>
//     `;
//     tbody.appendChild(tr);
//   });
// }

// window.deleteStaff = function(id) {
//   window.data.staff = window.data.staff.filter(s => s.id !== id);
//   saveData();
//   renderStaff();
//   showToast("Staff deleted!");
// };

function addOrderItemRow(selectedId = '', qty = 1) {
  const container = document.getElementById('order-items-container');
  const row = document.createElement('div');
  row.className = 'order-item-row';

  const select = document.createElement('select');
  window.data.menuItems.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    if (item.id === selectedId) option.selected = true;
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
  removeBtn.onclick = () => row.remove();

  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeBtn);

  container.appendChild(row);
}

// Add row button
document.getElementById('add-order-item').addEventListener('click', function() {
  addOrderItemRow();
});