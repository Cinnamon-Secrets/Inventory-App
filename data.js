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
};