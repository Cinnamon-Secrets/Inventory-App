let ingredientChartInstance, recipeChartInstance, moneyChartInstance;

function renderIngredientChart() {
  const ctx = document.getElementById('ingredient-chart').getContext('2d');
  if (ingredientChartInstance) ingredientChartInstance.destroy();
  ingredientChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: (window.data.ingredients || []).map(i => i.name),
      datasets: [{
        label: 'Stock Levels',
        data: (window.data.ingredients || []).map(i => i.quantity),
        backgroundColor: '#ffb8e8',
        borderColor: '#ff80c0',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderRecipeChart() {
  const ctx = document.getElementById('recipe-chart').getContext('2d');
  if (recipeChartInstance) recipeChartInstance.destroy();
  const recipeCounts = {};
  const history = Array.isArray(window.data.productionHistory) ? window.data.productionHistory : [];
  history.forEach(entry => {
    recipeCounts[entry.recipeName] = (recipeCounts[entry.recipeName] || 0) + entry.quantity;
  });

  recipeChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(recipeCounts),
      datasets: [{
        label: 'Most Made Recipes',
        data: Object.values(recipeCounts),
        backgroundColor: ['#ffb8e8', '#ff80c0', '#ff4080', '#ffb0e0', '#ff90d0']
      }]
    },
    options: {
      responsive: true
    }
  });
}

function renderMoneyChart() {
  const ctx = document.getElementById('money-chart').getContext('2d');
  if (moneyChartInstance) moneyChartInstance.destroy();
  const history = Array.isArray(window.data.productionHistory) ? window.data.productionHistory : [];
  let totalCost = history.reduce((sum, entry) => sum + entry.totalCost, 0);
  let totalRevenue = history.reduce((sum, entry) => sum + entry.totalRevenue, 0);
  let totalProfit = totalRevenue - totalCost;
  moneyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Total Cost', 'Total Revenue', 'Profit'],
      datasets: [{
        label: 'Money Metrics',
        data: [totalCost, totalRevenue, totalProfit],
        backgroundColor: ['#ffb8e8', '#ff80c0', '#ff4080']
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function updateCharts() {
  renderIngredientChart();
  renderRecipeChart();
  renderMoneyChart();
}