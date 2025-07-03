window.data = {
  ingredients: [],
  menuItems: [],
  productionHistory: [],
  orders: [],
  customers: []
};

window.loadData = function() {
  const localData = localStorage.getItem('cinnamonSecretsData');
  if (localData) {
    window.data = JSON.parse(localData);
  }
  // Always ensure these arrays exist!
  window.data.orders = window.data.orders || [];
  window.data.customers = window.data.customers || [];
  window.data.ingredients = window.data.ingredients || [];
  window.data.menuItems = window.data.menuItems || [];
  window.data.productionHistory = window.data.productionHistory || [];
  // Ensure new fields exist for backward compatibility
  window.data.ingredients.forEach(i => {
    if (!i.unit) i.unit = '';
  });
  window.data.orders.forEach(o => {
    if (!o.date) o.date = new Date().toISOString().slice(0,10);
    if (typeof o.produced === 'undefined') o.produced = false;
    if (!o.status) o.status = 'Pending';
  });
};