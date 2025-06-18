window.data = {
  ingredients: [],
  menuItems: [],
  productionHistory: []
};

window.loadData = function() {
  const localData = localStorage.getItem('cinnamonSecretsData');
  if (localData) {
    window.data = JSON.parse(localData);
  }
};