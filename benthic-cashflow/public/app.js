// Benthic Cashflow Frontend Logic — Multi-Bank Edition
let publicKey = '';
let connectedLinks = [];      // [{id, institution, username, connectedAt}]
let allAccounts = [];         // [{...acc, linkId, institution}]

// DOM Elements
const connectBtn       = document.getElementById('connect-btn');
const connectSection   = document.getElementById('connect-section');
const dashboardSection = document.getElementById('dashboard-section');
const configAlert      = document.getElementById('config-alert');
const accountsGrid     = document.getElementById('accounts-grid');
const accountSelector  = document.getElementById('account-selector');
const movementsTbody   = document.getElementById('movements-tbody');
const totalIncomeEl    = document.getElementById('total-income');
const totalExpenseEl   = document.getElementById('total-expense');
const netCashflowEl    = document.getElementById('net-cashflow');
const linkedBanksBar   = document.getElementById('linked-banks-bar');
const addBankBtn       = document.getElementById('add-bank-btn');
const totalBalanceEl   = document.getElementById('total-balance');

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

    // Load already-connected links
    const linksRes = await fetch('/api/links');
    connectedLinks = await linksRes.json();

    if (connectedLinks && connectedLinks.length > 0) {
      showDashboard();
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// ─── Open Fintoc Widget ───────────────────────────────────────────────────────
async function openFintocWidget(buttonEl) {
  buttonEl.disabled  = true;
  const originalHTML = buttonEl.innerHTML;
  buttonEl.innerHTML = '<span>Conectando...</span> ⏳';

  try {
    const res = await fetch('/api/link-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create link intent');
    }

    const { widgetToken } = await res.json();

    const fintocSdk = window.Fintoc || (typeof Fintoc !== 'undefined' ? Fintoc : null);
    if (!fintocSdk) {
      throw new Error('El SDK de Fintoc no se cargó. Desactiva el bloqueador de anuncios para localhost.');
    }

    const widget = fintocSdk.create({
      publicKey:  publicKey,
      holderType: 'individual',
      widgetToken: widgetToken,
      onSuccess: async (result) => {
        console.log('Fintoc onSuccess raw result:', JSON.stringify(result));
        let token = '';
        if (typeof result === 'string') {
          token = result;
        } else if (result && typeof result === 'object') {
          token = result.exchangeToken || result.exchange_token || result.link_token || result.id || '';
        }

        if (!token) {
          alert('Error: No se encontró ningún token en el retorno de Fintoc.');
          buttonEl.disabled  = false;
          buttonEl.innerHTML = originalHTML;
          return;
        }

        console.log('Sending exchange token to backend:', token);
        await exchangeToken(token, buttonEl, originalHTML);
      },
      onExit: () => {
        buttonEl.disabled  = false;
        buttonEl.innerHTML = originalHTML;
      }
    });

    widget.open();
  } catch (error) {
    console.error('Error opening Fintoc Widget:', error);
    alert('Error al iniciar la conexión: ' + error.message);
    buttonEl.disabled  = false;
    buttonEl.innerHTML = originalHTML;
  }
}

// Connect button (initial screen)
connectBtn.addEventListener('click', () => openFintocWidget(connectBtn));

// Add bank button (dashboard)
addBankBtn.addEventListener('click', () => openFintocWidget(addBankBtn));

// ─── Exchange Token ───────────────────────────────────────────────────────────
async function exchangeToken(token, buttonEl, originalHTML) {
  try {
    const res = await fetch('/api/exchange-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchangeToken: token })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(JSON.stringify(errData.error || errData));
    }

    const linkData = await res.json();

    // Add to connected links if not already there
    const exists = connectedLinks.find(l => l.id === linkData.id);
    if (!exists) {
      connectedLinks.push(linkData);
    } else {
      connectedLinks = connectedLinks.map(l => l.id === linkData.id ? linkData : l);
    }

    showDashboard();
  } catch (error) {
    console.error('Error exchanging token:', error);
    alert('Error al sincronizar con el backend: ' + error.message);
    if (buttonEl) {
      buttonEl.disabled  = false;
      buttonEl.innerHTML = originalHTML;
    }
  }
}

// ─── Show Dashboard ───────────────────────────────────────────────────────────
async function showDashboard() {
  connectSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  renderLinkedBanksBar();
  await loadAllAccounts();
}

// ─── Linked Banks Chips Bar ───────────────────────────────────────────────────
function renderLinkedBanksBar() {
  linkedBanksBar.innerHTML = '';

  connectedLinks.forEach(link => {
    const chip = document.createElement('div');
    chip.className = 'bank-chip';
    chip.innerHTML = `
      <span class="bank-chip-dot"></span>
      <span class="bank-chip-name">${link.institution}</span>
      <button class="bank-chip-remove" data-link-id="${link.id}" title="Desconectar ${link.institution}">✕</button>
    `;
    linkedBanksBar.appendChild(chip);
  });

  // Disconnect handler per chip
  linkedBanksBar.querySelectorAll('.bank-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => disconnectBank(btn.dataset.linkId));
  });
}

// ─── Load All Accounts (all links) ───────────────────────────────────────────
async function loadAllAccounts() {
  allAccounts = [];
  accountsGrid.innerHTML = '<p class="text-text-muted text-sm">Cargando cuentas...</p>';
  accountSelector.innerHTML = '';
  movementsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-text-muted">Cargando transacciones...</td></tr>`;

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

  renderAccountsGrid();
  renderAccountSelector();

  if (allAccounts.length > 0) {
    await loadMovements(allAccounts[0].id, allAccounts[0].linkId);
  } else {
    movementsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-text-muted">No se encontraron cuentas asociadas.</td></tr>`;
    calculateSummary([]);
  }

  renderTotalBalance();
}

// ─── Render Accounts Grid ─────────────────────────────────────────────────────
function renderAccountsGrid() {
  accountsGrid.innerHTML = '';

  if (allAccounts.length === 0) {
    accountsGrid.innerHTML = '<p class="text-text-muted text-sm">No hay cuentas disponibles.</p>';
    return;
  }

  allAccounts.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'glass-card p-6 flex flex-col justify-between';

    const balance = acc.balance.available;
    const formattedBalance = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: acc.balance.currency || 'CLP'
    }).format(balance);

    card.innerHTML = `
      <div>
        <span class="card-label">${acc.name}</span>
        <h4 class="card-num mt-1">Nº ${acc.number || '***'}</h4>
        <span class="text-xs text-text-muted mt-1 block">${acc.institution}</span>
      </div>
      <div class="mt-6">
        <div class="card-val">${formattedBalance}</div>
        <span class="text-xs text-text-muted">Saldo Disponible</span>
      </div>
    `;
    accountsGrid.appendChild(card);
  });
}

// ─── Render Total Balance Badge ───────────────────────────────────────────────
function renderTotalBalance() {
  if (!totalBalanceEl) return;
  const total = allAccounts.reduce((sum, acc) => sum + (acc.balance.available || 0), 0);
  totalBalanceEl.textContent = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(total);
}

// ─── Render Account Selector ──────────────────────────────────────────────────
function renderAccountSelector() {
  accountSelector.innerHTML = '';

  // Group by bank
  const byBank = {};
  allAccounts.forEach(acc => {
    if (!byBank[acc.institution]) byBank[acc.institution] = [];
    byBank[acc.institution].push(acc);
  });

  Object.entries(byBank).forEach(([bank, accs]) => {
    if (Object.keys(byBank).length > 1) {
      const group = document.createElement('optgroup');
      group.label = bank;
      accs.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = `${acc.id}|${acc.linkId}`;
        opt.textContent = `${acc.name} (Nº ${acc.number ? acc.number.slice(-4) : '***'})`;
        group.appendChild(opt);
      });
      accountSelector.appendChild(group);
    } else {
      accs.forEach((acc, i) => {
        const opt = document.createElement('option');
        opt.value = `${acc.id}|${acc.linkId}`;
        opt.textContent = `${acc.name} (Nº ${acc.number ? acc.number.slice(-4) : '***'})`;
        if (i === 0) opt.selected = true;
        accountSelector.appendChild(opt);
      });
    }
  });
}

// Selector change
accountSelector.addEventListener('change', (e) => {
  const [accountId, linkId] = e.target.value.split('|');
  loadMovements(accountId, linkId);
});

// ─── Load Movements ───────────────────────────────────────────────────────────
async function loadMovements(accountId, linkId) {
  movementsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-text-muted">Cargando transacciones...</td></tr>`;

  try {
    const res = await fetch(`/api/accounts/${accountId}/movements?linkId=${linkId}`);

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to fetch movements');
    }

    const movements = await res.json();

    if (movements.length === 0) {
      movementsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-text-muted">No hay movimientos recientes en esta cuenta.</td></tr>`;
      calculateSummary([]);
      return;
    }

    movementsTbody.innerHTML = '';
    movements.forEach(mov => {
      const tr = document.createElement('tr');

      const date = new Date(mov.postDate);
      const formattedDate = date.toLocaleDateString('es-CL', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      const formattedAmount = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: mov.currency || 'CLP'
      }).format(Math.abs(mov.amount));

      const isCredit   = mov.type === 'credit';
      const typeLabel  = isCredit ? 'Entrada' : 'Salida';
      const colorMain  = isCredit ? 'var(--color-green)' : 'var(--color-red)';
      const colorBg    = isCredit ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)';
      const colorBorder= isCredit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)';

      tr.innerHTML = `
        <td>${formattedDate}</td>
        <td class="font-bold">${mov.description}</td>
        <td>
          <span class="section-label" style="font-size:0.6rem;padding:0.1rem 0.4rem;color:${colorMain};border-color:${colorBorder};background:${colorBg};">
            ${typeLabel}
          </span>
        </td>
        <td class="text-right font-bold" style="color:${colorMain};">${isCredit ? '+' : '-'}${formattedAmount}</td>
      `;
      movementsTbody.appendChild(tr);
    });

    calculateSummary(movements);
  } catch (error) {
    console.error('Error loading movements:', error);
    movementsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-accent">Error al cargar transacciones: ${error.message}</td></tr>`;
  }
}

// ─── Summary Calculation ──────────────────────────────────────────────────────
function calculateSummary(movements) {
  let income = 0;
  let expense = 0;

  movements.forEach(mov => {
    if (mov.type === 'credit') income  += Math.abs(mov.amount);
    else                        expense += Math.abs(mov.amount);
  });

  const net = income - expense;
  const fmt = (val) => new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: movements[0]?.currency || 'CLP'
  }).format(val);

  totalIncomeEl.textContent  = fmt(income);
  totalExpenseEl.textContent = fmt(expense);

  if (net >= 0) {
    netCashflowEl.textContent = '+' + fmt(net);
    netCashflowEl.className   = 'text-xl font-bold text-green-accent';
  } else {
    netCashflowEl.textContent = '-' + fmt(Math.abs(net));
    netCashflowEl.className   = 'text-xl font-bold text-red-accent';
  }
}

// ─── Disconnect a specific bank ───────────────────────────────────────────────
async function disconnectBank(linkId) {
  const link = connectedLinks.find(l => l.id === linkId);
  if (!confirm(`¿Desconectar ${link ? link.institution : 'este banco'}? Se eliminará del panel.`)) return;

  try {
    await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
    connectedLinks = connectedLinks.filter(l => l.id !== linkId);

    if (connectedLinks.length === 0) {
      dashboardSection.classList.add('hidden');
      connectSection.classList.remove('hidden');
      connectBtn.disabled  = false;
      connectBtn.innerHTML = '<span>Conectar Banco Chile</span> 🚀';
    } else {
      renderLinkedBanksBar();
      await loadAllAccounts();
    }
  } catch (error) {
    alert('Error al desconectar la cuenta.');
  }
}

// ─── Scroll Depth Widget ──────────────────────────────────────────────────────
const depthNumber      = document.getElementById('depth-number');
const depthZoneName    = document.getElementById('depth-zone-name');
const depthProgressBar = document.getElementById('depth-progress-bar');

const depthZones = [
  { limit: 200,  name: 'Zona Epipelágica (Superficie)' },
  { limit: 1000, name: 'Zona Mesopelágica' },
  { limit: 3000, name: 'Zona Batipelágica' },
  { limit: 4000, name: 'Zona Béntica (Abisal)' }
];

window.addEventListener('scroll', () => {
  const scrollY      = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollHeight > 0) {
    const percent = Math.min(1, Math.max(0, scrollY / scrollHeight));
    const depth   = Math.round(percent * 4000);

    depthNumber.textContent       = depth.toLocaleString();
    depthProgressBar.style.width  = `${percent * 100}%`;

    const zone = depthZones.find(z => depth <= z.limit) || depthZones[depthZones.length - 1];
    depthZoneName.textContent = zone.name;
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
