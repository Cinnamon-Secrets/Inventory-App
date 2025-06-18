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
      <td>${ing.price.toFixed(2)}</td>
      <td>${ing.quantity}</td>
      <td>
        <button type="button" onclick="editIngredient('${ing.id}')">Edit</button>
        <button type="button" onclick="deleteIngredient('${ing.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

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
  removeBtn.onclick = () => row.remove();

  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(removeBtn);

  container.appendChild(row);
}

document.getElementById('add-menu-ingredient').addEventListener('click', () => {
  addMenuIngredientRow();
});

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

function updateCharts() {
  if (typeof renderIngredientChart === "function") renderIngredientChart();
  if (typeof renderRecipeChart === "function") renderRecipeChart();
  if (typeof renderMoneyChart === "function") renderMoneyChart();
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
  if (confirm("Are you sure you want to clear ALL data and start fresh? This cannot be undone.")) {
    localStorage.removeItem('cinnamonSecretsData');
    window.data = { ingredients: [], menuItems: [], productionHistory: [] };
    saveData();
    renderIngredients();
    renderMenuItems();
    renderMenuList();
    updateCharts();
    showToast("All data cleared!");
  }
};