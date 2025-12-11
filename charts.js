let channelChartInstance, recipeChartInstance, moneyChartInstance, ingredientUsageChartInstance;

function renderChannelChart(range = 'all') {
  const canvas = document.getElementById('channel-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (channelChartInstance) channelChartInstance.destroy();
  const orders = getOrdersWithinRange(range);
  const channelCounts = orders.reduce((acc, order) => {
    const key = order.channel || 'Direct';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const labels = Object.keys(channelCounts);
  const values = labels.map(label => channelCounts[label]);
  if (!labels.length) {
    canvas.setAttribute('data-empty', 'true');
    return;
  }
  canvas.removeAttribute('data-empty');
  channelChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Order Channels',
        data: values,
        backgroundColor: ['#ff80c0', '#ffb8e8', '#ff4080', '#ff90d0']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderRecipeChart() {
  const canvas = document.getElementById('recipe-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
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
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderMoneyChart(range = 'all') {
  const canvas = document.getElementById('money-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (moneyChartInstance) moneyChartInstance.destroy();
  const orders = getOrdersWithinRange(range);
  const totalRevenue = orders.reduce((sum, order) => {
    const itemsTotal = (order.items || []).reduce((subtotal, item) => {
      const recipe = window.data.menuItems.find(m => m.id === item.itemId);
      return subtotal + ((recipe?.price || 0) * (item.qty || 0));
    }, 0);
    return sum + itemsTotal;
  }, 0);
  const totalDeposits = orders.reduce((sum, order) => sum + (Number(order.deposit) || 0), 0);
  const ingredientSpend = (window.data.inventoryMovements || [])
    .filter(move => move.type === 'restock')
    .reduce((sum, move) => {
      const ingredient = window.data.ingredients.find(i => i.id === move.ingredientId);
      return sum + ((ingredient?.price || 0) * Math.abs(move.quantity || 0));
    }, 0);
  moneyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Revenue', 'Deposits', 'Ingredient Spend'],
      datasets: [{
        label: 'Money Metrics',
        data: [totalRevenue, totalDeposits, ingredientSpend],
        backgroundColor: ['#ff80c0', '#ffb8e8', '#ff4080']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderIngredientUsageChart() {
  const canvas = document.getElementById('ingredient-usage-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (ingredientUsageChartInstance) ingredientUsageChartInstance.destroy();
  // Calculate usage per ingredient from productionHistory
  const usage = {};
  const history = Array.isArray(window.data.productionHistory) ? window.data.productionHistory : [];
  history.forEach(entry => {
    if (Array.isArray(entry.ingredientsUsed)) {
      entry.ingredientsUsed.forEach(used => {
        usage[used.name] = (usage[used.name] || 0) + used.amount;
      });
    }
  });
  ingredientUsageChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(usage),
      datasets: [{
        label: 'Ingredient Usage',
        data: Object.values(usage),
        backgroundColor: '#ffb8e8',
        borderColor: '#ff80c0',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function updateCharts(range = 'all') {
  const normalizedRange = range || 'all';
  renderMoneyChart(normalizedRange);
  renderChannelChart(normalizedRange);
  renderIngredientUsageChart();
  renderRecipeChart();
}

function getOrdersWithinRange(range) {
  const orders = Array.isArray(window.data?.orders) ? window.data.orders : [];
  if (!range || range === 'all') return orders;
  const days = Number(range);
  if (!days) return orders;
  const end = startOfDay(new Date());
  const start = addDays(end, -days);
  return orders.filter(order => {
    const date = getOrderDate(order);
    return date && date >= start && date <= end;
  });
}

function getOrderDate(order) {
  if (!order) return null;
  const base = order.pickupDate || order.date;
  return base ? startOfDay(base) : null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfDay(input) {
  if (!input) return null;
  let date;
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, yearStr, monthStr, dayStr] = match;
      date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
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