window.data = {
  ingredients: [],
  menuItems: [],
  productionHistory: [],
  orders: [], // Each order: { id, customerId, items, status, date }
  customers: []
};

window.loadData = function () {
  const localData = localStorage.getItem('cinnamonSecretsData');
  if (localData) {
    window.data = JSON.parse(localData);
  }
  // Always ensure these arrays exist!
  window.data.orders = (window.data.orders || []).map(order => {
    // Ensure every order has a date (default to today if missing)
    if (!order.date) {
      const d = new Date();
      order.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return order;
  });
  window.data.customers = window.data.customers || [];
  window.data.ingredients = window.data.ingredients || [];
  window.data.menuItems = window.data.menuItems || [];
  window.data.productionHistory = window.data.productionHistory || [];
};