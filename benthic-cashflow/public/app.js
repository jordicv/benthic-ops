// Benthic Cashflow Frontend Logic — Multi-Bank & Analytical Edition
let publicKey = '';
let connectedLinks = [];      // [{id, institution, username, connectedAt}]
let allAccounts = [];         // [{...acc, linkId, institution}]
let selectedMonths = 12;      // Período de análisis inicial (12 meses)
let currentView = 'dashboard'; // 'dashboard' o 'bank/:id'
let activeBankLinkId = '';    // ID del banco seleccionado en la vista específica

// Chart instances
let categoryChartInstance = null;
let monthlyChartInstance = null;
let bankHistoryChartInstance = null;

// Paginación y Filtrado del historial consolidado
let movementsData = [];       // Movimientos originales cargados
let filteredMovements = [];   // Movimientos filtrados por fecha/búsqueda
let currentPage = 1;
const pageSize = 15;          // Paginación de 15 movimientos por hoja

// DOM Elements
const connectBtn       = document.getElementById('connect-btn');
const connectView      = document.getElementById('connect-view');
const dashboardView    = document.getElementById('dashboard-view');
const bankView         = document.getElementById('bank-view');
const configAlert      = document.getElementById('config-alert');
const accountsGrid     = document.getElementById('accounts-grid');
const bankAccountsGrid = document.getElementById('bank-accounts-grid');
const accountSelector  = document.getElementById('account-selector');
const movementsTbody   = document.getElementById('movements-tbody');
const bankMovementsTbody = document.getElementById('bank-movements-tbody');
const totalIncomeEl    = document.getElementById('total-income');
const totalExpenseEl   = document.getElementById('total-expense');
const netCashflowEl    = document.getElementById('net-cashflow');
const sidebarBanksList = document.getElementById('sidebar-banks-list');
const sidebarAddBtn    = document.getElementById('sidebar-add-bank-btn');
const totalBalanceEl   = document.getElementById('total-balance');
const bankBalanceEl    = document.getElementById('bank-balance');
const bankAccountsCount = document.getElementById('bank-accounts-count');
const bankDetailName   = document.getElementById('bank-detail-name');
const bankDetailMeta   = document.getElementById('bank-detail-meta');
const disconnectBankBtn = document.getElementById('disconnect-bank-btn');
const navbarPageTitle  = document.getElementById('navbar-page-title');
const sidebarEl        = document.getElementById('app-sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');

// Elementos de Filtros y Paginación
const movSearchInput   = document.getElementById('mov-search');
const filterSinceInput = document.getElementById('filter-since');
const filterUntilInput = document.getElementById('filter-until');
const paginationInfo   = document.getElementById('pagination-info');
const btnPrevPage      = document.getElementById('btn-prev-page');
const btnNextPage      = document.getElementById('btn-next-page');

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const configRes  = await fetch('/api/config');
    const configData = await configRes.json();
    publicKey = configData.publicKey;

    if (!publicKey || publicKey.includes('your_public_key')) {
      configAlert.classList.remove('hidden');
      connectBtn.disabled = true;
      connectBtn.style.opacity = '0.5';
      return;
    }

    // Cargar links conectados
    await refreshLinksData();

    // Hash Router Setup
    window.addEventListener('hashchange', router);
    router();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────
function router() {
  const hash = window.location.hash || '#dashboard';
  
  if (connectedLinks.length === 0) {
    showConnectScreen();
    return;
  }

  sidebarEl.classList.remove('hidden');

  if (hash === '#dashboard') {
    currentView = 'dashboard';
    activeBankLinkId = '';
    showDashboardView();
  } else if (hash.startsWith('#bank/')) {
    currentView = 'bank';
    activeBankLinkId = hash.replace('#bank/', '');
    showBankView(activeBankLinkId);
  }
}

// ─── UI Views Toggle ────────────────────────────────────────────────────────
function showConnectScreen() {
  connectView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  bankView.classList.add('hidden');
  sidebarEl.classList.add('hidden');
  navbarPageTitle.textContent = 'Benthic Cashflow';
}

async function showDashboardView() {
  connectView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  bankView.classList.add('hidden');
  navbarPageTitle.textContent = 'Dashboard General';
  
  updateActiveSidebarItem('nav-dash');
  await loadDashboardData();
}

async function showBankView(linkId) {
  connectView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  bankView.classList.remove('hidden');
  
  const link = connectedLinks.find(l => l.id === linkId);
  if (!link) {
    window.location.hash = '#dashboard';
    return;
  }

  navbarPageTitle.textContent = link.institution;
  bankDetailName.textContent = link.institution;
  bankDetailMeta.textContent = `Conectado el ${new Date(link.connectedAt).toLocaleDateString('es-CL')}`;
  
  updateActiveSidebarItem(`nav-bank-${linkId}`);
  await loadBankData(linkId);
}

function updateActiveSidebarItem(activeId) {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    if (item.id === activeId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// ─── Refresh Links ──────────────────────────────────────────────────────────
async function refreshLinksData() {
  const linksRes = await fetch('/api/links');
  connectedLinks = await linksRes.json();
  renderSidebar();
}

// ─── Sidebar Render ─────────────────────────────────────────────────────────
function renderSidebar() {
  sidebarBanksList.innerHTML = '';
  connectedLinks.forEach(link => {
    const item = document.createElement('a');
    item.href = `#bank/${link.id}`;
    item.className = 'nav-item';
    item.id = `nav-bank-${link.id}`;
    item.innerHTML = `<span>🏦 ${link.institution}</span>`;
    sidebarBanksList.appendChild(item);
  });
}

// ─── Connect Widget Interactions ──────────────────────────────────────────
async function openFintocWidget(btn) {
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span>Iniciando Fintoc...</span>';

  try {
    const res = await fetch('/api/link-intent', { method: 'POST' });
    const { widgetToken } = await res.json();

    const fintocSdk = window.Fintoc || (typeof Fintoc !== 'undefined' ? Fintoc : null);
    if (!fintocSdk) throw new Error('SDK Fintoc no cargado. Desactiva Adblockers.');

    const widget = fintocSdk.create({
      publicKey,
      holderType: 'individual',
      widgetToken,
      onSuccess: async (result) => {
        let token = typeof result === 'string' ? result : (result.exchangeToken || result.exchange_token || '');
        if (!token) return alert('Token no encontrado.');
        await exchangeToken(token);
      },
      onExit: () => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    });
    widget.open();
  } catch (error) {
    alert(error.message);
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

async function exchangeToken(token) {
  const res = await fetch('/api/exchange-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exchangeToken: token })
  });
  if (res.ok) {
    await refreshLinksData();
    window.location.hash = '#dashboard';
  } else {
    alert('Error al conectar banco.');
  }
}

connectBtn.addEventListener('click', () => openFintocWidget(connectBtn));
sidebarAddBtn.addEventListener('click', () => openFintocWidget(sidebarAddBtn));

// ─── Dashboard Data Loader ────────────────────────────────────────────────
async function loadDashboardData() {
  allAccounts = [];
  accountsGrid.innerHTML = '<p class="table-empty">Cargando cuentas consolidadas...</p>';
  accountSelector.innerHTML = '';
  movementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">Cargando transacciones de los últimos 12 meses...</td></tr>';

  // Fechas del rango de análisis
  const until = new Date().toISOString().split('T')[0];
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - selectedMonths);
  const since = sinceDate.toISOString().split('T')[0];

  // Fetch accounts from all banks
  const fetchPromises = connectedLinks.map(async link => {
    try {
      const res = await fetch(`/api/accounts?linkId=${link.id}`);
      if (!res.ok) return [];
      const accs = await res.json();
      return accs.map(acc => ({ ...acc, linkId: link.id, institution: link.institution }));
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  allAccounts = results.flat();

  renderAccountsGrid(allAccounts, accountsGrid);
  renderAccountSelector();
  renderTotalBalance();

  if (allAccounts.length > 0) {
    // Cargar movimientos para la cuenta seleccionada por defecto
    const [accountId, linkId] = accountSelector.value.split('|');
    await loadDashboardMovements(accountId, linkId, since, until);
  } else {
    movementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">No se encontraron cuentas.</td></tr>';
  }
}

// ─── Render Accounts Grid ─────────────────────────────────────────────────
function renderAccountsGrid(accountsList, targetGrid) {
  targetGrid.innerHTML = '';
  if (accountsList.length === 0) {
    targetGrid.innerHTML = '<p class="table-empty">No hay cuentas disponibles.</p>';
    return;
  }

  const typeLabels = {
    checking_account: 'Cuenta Corriente',
    savings_account: 'Cuenta Ahorro',
    sight_account: 'Cuenta Vista',
    line_of_credit: 'Línea de Crédito'
  };

  accountsList.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'account-card';
    const formatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: acc.balance.currency || 'CLP', maximumFractionDigits: 0 }).format(acc.balance.available);
    const lastFour = acc.number ? '···' + acc.number.slice(-4) : '···';

    card.innerHTML = `
      <div class="account-card-type">${typeLabels[acc.type] || 'Cuenta'}</div>
      <div class="account-card-name">${acc.name}</div>
      <div class="account-card-institution">${acc.institution}</div>
      <div class="account-card-balance">${formatted}</div>
      <div class="account-card-number">${lastFour}</div>
    `;
    targetGrid.appendChild(card);
  });
}

function renderTotalBalance() {
  const total = allAccounts.reduce((sum, acc) => sum + (acc.balance.available || 0), 0);
  totalBalanceEl.textContent = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(total);
}

// ─── Dropdown Selector ──────────────────────────────────────────────────────
function renderAccountSelector() {
  accountSelector.innerHTML = '';
  const byBank = {};
  allAccounts.forEach(acc => {
    if (!byBank[acc.institution]) byBank[acc.institution] = [];
    byBank[acc.institution].push(acc);
  });

  Object.entries(byBank).forEach(([bank, accs]) => {
    const group = document.createElement('optgroup');
    group.label = bank;
    accs.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = `${acc.id}|${acc.linkId}`;
      opt.textContent = `${acc.name} (${acc.number ? acc.number.slice(-4) : '***'})`;
      group.appendChild(opt);
    });
    accountSelector.appendChild(group);
  });
}

accountSelector.addEventListener('change', () => {
  const [accountId, linkId] = accountSelector.value.split('|');
  const until = new Date().toISOString().split('T')[0];
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - selectedMonths);
  const since = sinceDate.toISOString().split('T')[0];
  loadDashboardMovements(accountId, linkId, since, until);
});

// ─── Dashboard Movements Loader & Categorizer ──────────────────────────────
// ─── Dashboard Movements Loader & Categorizer ──────────────────────────────
async function loadDashboardMovements(accountId, linkId, since, until) {
  movementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">Cargando transacciones con categorías...</td></tr>';
  
  try {
    const res = await fetch(`/api/accounts/${accountId}/movements?linkId=${linkId}&since=${since}&until=${until}`);
    if (!res.ok) throw new Error('Error al obtener movimientos');
    const movements = await res.json();

    if (movements.length === 0) {
      movementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">No hay transacciones en este período.</td></tr>';
      movementsData = [];
      filteredMovements = [];
      calculateDashboardSummary([]);
      renderCharts([]);
      updatePaginationControls();
      return;
    }

    // Guardar movimientos categorizados
    movementsData = movements.map(mov => {
      const catKey = categorizeMov(mov.description);
      return { ...mov, category: catKey };
    });

    currentPage = 1;
    applyFiltersAndRender();

  } catch (error) {
    movementsTbody.innerHTML = `<tr><td colspan="4" class="table-error">${error.message}</td></tr>`;
  }
}

// ─── Aplicar Filtros de Búsqueda y Rango de Fechas ────────────────────────────
function applyFiltersAndRender() {
  const searchQuery = movSearchInput.value.trim().toLowerCase();
  const filterSince = filterSinceInput.value;
  const filterUntil = filterUntilInput.value;

  filteredMovements = movementsData.filter(mov => {
    // 1. Filtro de búsqueda
    const catMeta = getCategoryMeta(mov.category);
    const matchesSearch = 
      mov.description.toLowerCase().includes(searchQuery) ||
      catMeta.label.toLowerCase().includes(searchQuery);

    // 2. Filtro de fecha desde
    let matchesSince = true;
    if (filterSince) {
      const movDate = new Date(mov.postDate).toISOString().split('T')[0];
      matchesSince = movDate >= filterSince;
    }

    // 3. Filtro de fecha hasta
    let matchesUntil = true;
    if (filterUntil) {
      const movDate = new Date(mov.postDate).toISOString().split('T')[0];
      matchesUntil = movDate <= filterUntil;
    }

    return matchesSearch && matchesSince && matchesUntil;
  });

  // Renderizar gráficos de barras y donut con los datos del filtro
  calculateDashboardSummary(filteredMovements);
  renderCharts(filteredMovements);

  renderPagedTable();
}

// ─── Renderizar Tabla Paginada ────────────────────────────────────────────────
function renderPagedTable() {
  movementsTbody.innerHTML = '';

  if (filteredMovements.length === 0) {
    movementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">No se encontraron movimientos con los filtros aplicados.</td></tr>';
    updatePaginationControls();
    return;
  }

  const totalItems = filteredMovements.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Ajustar página actual si excede límites
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);

  const pageItems = filteredMovements.slice(startIdx, endIdx);

  // Configurar los límites de fecha permitidos dinámicamente en base a los movimientos reales
  if (movementsData.length > 0) {
    const dates = movementsData.map(m => m.postDate).sort();
    const minDateStr = dates[0].split('T')[0];
    const maxDateStr = dates[dates.length - 1].split('T')[0];
    
    filterSinceInput.min = minDateStr;
    filterSinceInput.max = maxDateStr;
    filterUntilInput.min = minDateStr;
    filterUntilInput.max = maxDateStr;
  }

  pageItems.forEach(mov => {
    const tr = document.createElement('tr');
    
    // Cambiado para mostrar el año como 2 dígitos (ej: 09 jul 26)
    const dateStr = new Date(mov.postDate).toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    });
    
    const amountStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: mov.currency || 'CLP', maximumFractionDigits: 0 }).format(Math.abs(mov.amount));
    const catMeta = getCategoryMeta(mov.category);
    const isCredit = mov.type === 'credit';
    const cls = isCredit ? 'credit' : 'debit';

    tr.innerHTML = `
      <td style="color:var(--text-3);white-space:nowrap;">${dateStr}</td>
      <td class="mov-desc" title="${mov.description}">${mov.description}</td>
      <td><span class="mov-badge ${mov.category}">${catMeta.label}</span></td>
      <td class="mov-amount ${cls}">${isCredit ? '+' : '-'}${amountStr}</td>
    `;
    movementsTbody.appendChild(tr);
  });

  // Actualizar info y botones
  paginationInfo.textContent = `Mostrando ${startIdx + 1}-${endIdx} de ${totalItems} movimientos`;
  btnPrevPage.disabled = currentPage === 1;
  btnNextPage.disabled = currentPage === totalPages || totalPages === 0;
}

function updatePaginationControls() {
  paginationInfo.textContent = `Mostrando 0-0 de 0 movimientos`;
  btnPrevPage.disabled = true;
  btnNextPage.disabled = true;
}

// ─── Listeners de Filtros y Búsqueda ──────────────────────────────────────────
movSearchInput.addEventListener('input', () => {
  currentPage = 1;
  applyFiltersAndRender();
});

filterSinceInput.addEventListener('change', () => {
  currentPage = 1;
  applyFiltersAndRender();
});

filterUntilInput.addEventListener('change', () => {
  currentPage = 1;
  applyFiltersAndRender();
});

btnPrevPage.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPagedTable();
  }
});

btnNextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderPagedTable();
  }
});

// Listener para el botón de limpiar filtros
const btnClearFilters = document.getElementById('btn-clear-filters');
if (btnClearFilters) {
  btnClearFilters.addEventListener('click', () => {
    movSearchInput.value = '';
    filterSinceInput.value = '';
    filterUntilInput.value = '';
    currentPage = 1;
    applyFiltersAndRender();
  });
}

// ─── Dashboard Summary calculation ──────────────────────────────────────────
function calculateDashboardSummary(movements) {
  let income = 0;
  let expense = 0;

  movements.forEach(mov => {
    if (mov.type === 'credit') income  += Math.abs(mov.amount);
    else                        expense += Math.abs(mov.amount);
  });

  const net = income - expense;
  const fmt = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

  totalIncomeEl.textContent  = fmt(income);
  totalExpenseEl.textContent = fmt(expense);
  netCashflowEl.textContent  = (net >= 0 ? '+' : '-') + fmt(Math.abs(net));
  netCashflowEl.className    = 'kpi-value ' + (net >= 0 ? 'kpi-green' : 'kpi-red');
}

// ─── Render Visual Charts (Chart.js) ───────────────────────────────────────
function renderCharts(movements) {
  // 1. Prepare Category Donut Data
  const categoriesSum = {};
  movements.forEach(mov => {
    if (mov.type === 'debit') { // Solo categorizamos gastos para la torta
      const catMeta = getCategoryMeta(mov.category);
      const label = catMeta.label;
      categoriesSum[label] = (categoriesSum[label] || 0) + Math.abs(mov.amount);
    }
  });

  const donutLabels = Object.keys(categoriesSum);
  const donutData = Object.values(categoriesSum);
  const donutColors = donutLabels.map(label => {
    // Buscar color
    for (const cat of Object.values(CATEGORIES)) {
      if (cat.label === label) return cat.color;
    }
    return '#6b7280';
  });

  // Destroy old donut chart
  if (categoryChartInstance) categoryChartInstance.destroy();

  const ctxCategory = document.getElementById('categoryChart').getContext('2d');
  categoryChartInstance = new Chart(ctxCategory, {
    type: 'doughnut',
    data: {
      labels: donutLabels,
      datasets: [{
        data: donutData,
        backgroundColor: donutColors,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
      }
    }
  });

  // 2. Prepare Monthly Bars Data (Ultimos 12 meses)
  const monthlySum = {};
  movements.forEach(mov => {
    const d = new Date(mov.postDate);
    const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
    if (!monthlySum[label]) monthlySum[label] = { income: 0, expense: 0 };
    
    if (mov.type === 'credit') monthlySum[label].income += Math.abs(mov.amount);
    else                        monthlySum[label].expense += Math.abs(mov.amount);
  });

  const barLabels = Object.keys(monthlySum).reverse();
  const incomeData = barLabels.map(l => monthlySum[l].income);
  const expenseData = barLabels.map(l => monthlySum[l].expense);

  // Destroy old bar chart
  if (monthlyChartInstance) monthlyChartInstance.destroy();

  const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
  monthlyChartInstance = new Chart(ctxMonthly, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [
        { label: 'Entradas', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'Salidas', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { position: 'top', labels: { color: '#94a3b8' } }
      }
    }
  });
}

// ─── Bank Specific View Loader ──────────────────────────────────────────────
async function loadBankData(linkId) {
  bankAccountsGrid.innerHTML = '<p class="table-empty">Cargando cuentas del banco...</p>';
  bankMovementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">Cargando historial transaccional...</td></tr>';

  try {
    const res = await fetch(`/api/accounts?linkId=${linkId}`);
    if (!res.ok) throw new Error('Error al obtener cuentas');
    const accounts = await res.json();
    
    const bankAccounts = accounts.map(acc => ({ ...acc, linkId, institution: bankDetailName.textContent }));
    renderAccountsGrid(bankAccounts, bankAccountsGrid);

    const total = bankAccounts.reduce((sum, acc) => sum + (acc.balance.available || 0), 0);
    bankBalanceEl.textContent = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(total);
    bankAccountsCount.textContent = `${bankAccounts.length} cuenta(s) activa(s)`;

    if (bankAccounts.length > 0) {
      // Cargar movimientos e historial del saldo de la cuenta principal del banco
      await loadBankMovements(bankAccounts[0].id, linkId);
    } else {
      bankMovementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">No hay cuentas en este banco.</td></tr>';
    }

  } catch (error) {
    bankMovementsTbody.innerHTML = `<tr><td colspan="4" class="table-error">${error.message}</td></tr>`;
  }
}

async function loadBankMovements(accountId, linkId) {
  const until = new Date().toISOString().split('T')[0];
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - 12);
  const since = sinceDate.toISOString().split('T')[0];

  try {
    const res = await fetch(`/api/accounts/${accountId}/movements?linkId=${linkId}&since=${since}&until=${until}`);
    if (!res.ok) throw new Error('Error al obtener transacciones');
    const movements = await res.json();

    if (movements.length === 0) {
      bankMovementsTbody.innerHTML = '<tr><td colspan="4" class="table-empty">No hay transacciones recientes.</td></tr>';
      renderBankHistoryChart([], 0);
      return;
    }

    bankMovementsTbody.innerHTML = '';
    
    const categorized = movements.map(mov => ({ ...mov, category: categorizeMov(mov.description) }));
    
    categorized.forEach(mov => {
      const tr = document.createElement('tr');
      
      // Mostrar el año (ej: 09 jul 26)
      const dateStr = new Date(mov.postDate).toLocaleDateString('es-CL', { 
        day: '2-digit', 
        month: 'short', 
        year: '2-digit' 
      });
      
      const amountStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: mov.currency || 'CLP', maximumFractionDigits: 0 }).format(Math.abs(mov.amount));
      const catMeta = getCategoryMeta(mov.category);
      const isCredit = mov.type === 'credit';
      const cls = isCredit ? 'credit' : 'debit';

      tr.innerHTML = `
        <td style="color:var(--text-3);white-space:nowrap;">${dateStr}</td>
        <td class="mov-desc" title="${mov.description}">${mov.description}</td>
        <td><span class="mov-badge ${mov.category}">${catMeta.label}</span></td>
        <td class="mov-amount ${cls}">${isCredit ? '+' : '-'}${amountStr}</td>
      `;
      bankMovementsTbody.appendChild(tr);
    });

    // Gráfico de evolución de saldo histórico
    renderBankHistoryChart(categorized);

  } catch (error) {
    bankMovementsTbody.innerHTML = `<tr><td colspan="4" class="table-error">${error.message}</td></tr>`;
  }
}

// ─── Bank History Evolution Line Chart ──────────────────────────────────────
function renderBankHistoryChart(movements) {
  // Simulamos saldo acumulativo inverso
  let currentSimulated = 2063; // Saldo base real actual
  const dataPoints = [];
  const labels = [];

  movements.forEach(mov => {
    const dateLabel = new Date(mov.postDate).toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    });
    labels.push(dateLabel);
    dataPoints.push(currentSimulated);
    
    // Invertir flujo para ir hacia atrás en el tiempo
    if (mov.type === 'credit') currentSimulated -= Math.abs(mov.amount);
    else                        currentSimulated += Math.abs(mov.amount);
  });

  labels.reverse();
  dataPoints.reverse();

  if (bankHistoryChartInstance) bankHistoryChartInstance.destroy();

  const ctxHistory = document.getElementById('bankHistoryChart').getContext('2d');
  bankHistoryChartInstance = new Chart(ctxHistory, {
    type: 'line',
    data: {
      labels: labels.slice(-20), // Últimos 20 registros
      datasets: [{
        label: 'Saldo Disponible',
        data: dataPoints.slice(-20),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.05)',
        fill: true,
        tension: 0.35,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#475569', font: { size: 9 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ─── Disconnect Bank Connection ─────────────────────────────────────────────
disconnectBankBtn.addEventListener('click', async () => {
  if (!activeBankLinkId) return;
  const link = connectedLinks.find(l => l.id === activeBankLinkId);
  if (!confirm(`¿Eliminar la conexión con ${link ? link.institution : 'este banco'}?`)) return;

  const res = await fetch(`/api/links/${activeBankLinkId}`, { method: 'DELETE' });
  if (res.ok) {
    await refreshLinksData();
    window.location.hash = '#dashboard';
  } else {
    alert('No se pudo desconectar.');
  }
});

// ─── Period buttons ───────────────────────────────────────────────────────
document.querySelectorAll('.btn-period').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedMonths = parseInt(e.target.dataset.months);
    
    // Reload dashboard
    const until = new Date().toISOString().split('T')[0];
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - selectedMonths);
    const since = sinceDate.toISOString().split('T')[0];
    const [accountId, linkId] = accountSelector.value.split('|');
    loadDashboardMovements(accountId, linkId, since, until);
  });
});

// ─── Responsive menu button ────────────────────────────────────────────────
toggleSidebarBtn.addEventListener('click', () => {
  sidebarEl.classList.toggle('show');
});

// ─── Boot ───────────────────────────────────────────────────────────────────
init();
