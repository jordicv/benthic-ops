// Benthic Cashflow Frontend Logic
let publicKey = '';
let currentLinkId = '';
let accounts = [];

// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const connectSection = document.getElementById('connect-section');
const dashboardSection = document.getElementById('dashboard-section');
const configAlert = document.getElementById('config-alert');
const disconnectBtn = document.getElementById('disconnect-btn');
const accountsGrid = document.getElementById('accounts-grid');
const accountSelector = document.getElementById('account-selector');
const movementsTbody = document.getElementById('movements-tbody');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netCashflowEl = document.getElementById('net-cashflow');

// Initialize App
async function init() {
  try {
    // 1. Fetch config (public key)
    const configRes = await fetch('/api/config');
    const configData = await configRes.json();
    publicKey = configData.publicKey;

    if (!publicKey || publicKey.includes('your_public_key')) {
      configAlert.classList.remove('hidden');
      connectBtn.disabled = true;
      connectBtn.style.opacity = '0.5';
      return;
    }

    // 2. Check if there are already connected links
    const linksRes = await fetch('/api/links');
    const links = await linksRes.json();

    if (links && links.length > 0) {
      // Use the first connected link
      currentLinkId = links[0].id;
      showDashboard();
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Connect Button Event Handler
connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = 'Iniciando conexión...';

  try {
    // Create link intent from backend
    const res = await fetch('/api/link-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create link intent');
    }

    const { widgetToken } = await res.json();

    // Initialize Fintoc Widget
    const fintocSdk = window.Fintoc || (typeof Fintoc !== 'undefined' ? Fintoc : null);
    if (!fintocSdk) {
      throw new Error('El SDK de Fintoc (Fintoc.js) no se ha cargado en el navegador. Esto ocurre si usas Brave o un bloqueador de anuncios (AdBlock, uBlock Origin) que bloquea el dominio js.fintoc.com. Por favor, desactívalo para localhost e intenta de nuevo.');
    }

    const widget = fintocSdk.create({
      publicKey: publicKey,
      holderType: 'individual',
      widgetToken: widgetToken,
      onSuccess: async (result) => {
        console.log('Fintoc link success!', result);
        
        let token = '';
        if (typeof result === 'string') {
          token = result;
        } else if (result && typeof result === 'object') {
          token = result.exchange_token || result.link_token || result.id || '';
        }
        
        if (!token) {
          console.error('No token found in Fintoc onSuccess argument:', result);
          alert('Error: No se encontró ningún token en el retorno de Fintoc.');
          resetConnectButton();
          return;
        }
        
        // Exchange token with backend
        await exchangeToken(token);
      },
      onExit: () => {
        console.log('User closed Fintoc Widget');
        resetConnectButton();
      }
    });

    widget.open();
  } catch (error) {
    console.error('Error opening Fintoc Widget:', error);
    alert('Error al iniciar la conexión: ' + error.message);
    resetConnectButton();
  }
});

function resetConnectButton() {
  connectBtn.disabled = false;
  connectBtn.innerHTML = '<span>Conectar Banco Chile</span> 🚀';
}

// Exchange temporary token for permanent Link ID
async function exchangeToken(exchangeToken) {
  try {
    const res = await fetch('/api/exchange-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchangeToken })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Exchange failed');
    }

    const linkData = await res.json();
    currentLinkId = linkData.id;
    
    // Show dashboard
    showDashboard();
  } catch (error) {
    console.error('Error exchanging token:', error);
    alert('Error al sincronizar con el backend: ' + error.message);
    resetConnectButton();
  }
}

// Show Dashboard View & load data
async function showDashboard() {
  connectSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  
  await loadAccounts();
}

// Load Accounts from Fintoc
async function loadAccounts() {
  try {
    const res = await fetch(`/api/accounts?linkId=${currentLinkId}`);
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to fetch accounts');
    }

    accounts = await res.json();
    
    // Populate cards
    accountsGrid.innerHTML = '';
    accountSelector.innerHTML = '';

    accounts.forEach((acc, index) => {
      // 1. Create account card
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
        </div>
        <div class="mt-6">
          <div class="card-val">${formattedBalance}</div>
          <span class="text-xs text-text-muted">Saldo Disponible</span>
        </div>
      `;
      accountsGrid.appendChild(card);

      // 2. Populate selector dropdown
      const option = document.createElement('option');
      option.value = acc.id;
      option.textContent = `${acc.name} (Nº ${acc.number ? acc.number.slice(-4) : '***'})`;
      if (index === 0) option.selected = true;
      accountSelector.appendChild(option);
    });

    if (accounts.length > 0) {
      // Load movements for first account
      await loadMovements(accounts[0].id);
    } else {
      movementsTbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-text-muted">No se encontraron cuentas asociadas.</td>
        </tr>
      `;
    }

  } catch (error) {
    console.error('Error loading accounts:', error);
    movementsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-red-accent">Error al cargar cuentas: ${error.message}</td>
      </tr>
    `;
  }
}

// Selector change event
accountSelector.addEventListener('change', (e) => {
  loadMovements(e.target.value);
});

// Load Movements for a specific account
async function loadMovements(accountId) {
  movementsTbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-8 text-text-muted">Cargando transacciones...</td>
    </tr>
  `;

  try {
    const res = await fetch(`/api/accounts/${accountId}/movements?linkId=${currentLinkId}`);
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to fetch movements');
    }

    const movements = await res.json();
    
    if (movements.length === 0) {
      movementsTbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-text-muted">No hay movimientos recientes en esta cuenta.</td>
        </tr>
      `;
      calculateSummary([]);
      return;
    }

    movementsTbody.innerHTML = '';
    movements.forEach(mov => {
      const tr = document.createElement('tr');
      
      const date = new Date(mov.postDate);
      const formattedDate = date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const formattedAmount = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: mov.currency || 'CLP'
      }).format(Math.abs(mov.amount));

      const isCredit = mov.type === 'credit';
      const amountClass = isCredit ? 'green-accent' : 'red-accent';
      const typeLabel = isCredit ? 'Entrada' : 'Salida';

      tr.innerHTML = `
        <td>${formattedDate}</td>
        <td class="font-bold">${mov.description}</td>
        <td>
          <span class="section-label" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; color: ${isCredit ? 'var(--color-green)' : 'var(--color-red)'}; border-color: ${isCredit ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; background: ${isCredit ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)'};">
            ${typeLabel}
          </span>
        </td>
        <td class="text-right font-bold ${amountClass}">${isCredit ? '+' : '-'}${formattedAmount}</td>
      `;
      movementsTbody.appendChild(tr);
    });

    calculateSummary(movements);

  } catch (error) {
    console.error('Error loading movements:', error);
    movementsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-red-accent">Error al cargar transacciones: ${error.message}</td>
      </tr>
    `;
  }
}

// Calculate income, expense and net cashflow
function calculateSummary(movements) {
  let income = 0;
  let expense = 0;

  movements.forEach(mov => {
    if (mov.type === 'credit') {
      income += Math.abs(mov.amount);
    } else {
      expense += Math.abs(mov.amount);
    }
  });

  const net = income - expense;

  const fmt = (val) => new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: movements[0]?.currency || 'CLP'
  }).format(val);

  totalIncomeEl.textContent = fmt(income);
  totalExpenseEl.textContent = fmt(expense);
  
  if (net >= 0) {
    netCashflowEl.textContent = '+' + fmt(net);
    netCashflowEl.className = 'text-xl font-bold text-green-accent';
  } else {
    netCashflowEl.textContent = '-' + fmt(Math.abs(net));
    netCashflowEl.className = 'text-xl font-bold text-red-accent';
  }
}

// Disconnect Bank Account
disconnectBtn.addEventListener('click', async () => {
  if (!confirm('¿Estás seguro de que quieres desconectar esta cuenta bancaria? Se eliminará de tu panel.')) {
    return;
  }

  try {
    const res = await fetch(`/api/links/${currentLinkId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      currentLinkId = '';
      accounts = [];
      dashboardSection.classList.add('hidden');
      connectSection.classList.remove('hidden');
      resetConnectButton();
    }
  } catch (error) {
    console.error('Error disconnecting:', error);
    alert('Error al desconectar la cuenta');
  }
});

// Scroll Depth Widget Effect
const depthNumber = document.getElementById('depth-number');
const depthZoneName = document.getElementById('depth-zone-name');
const depthProgressBar = document.getElementById('depth-progress-bar');

const depthZones = [
  { limit: 200, name: 'Zona Epipelágica (Superficie)' },
  { limit: 1000, name: 'Zona Mesopelágica' },
  { limit: 3000, name: 'Zona Batipelágica' },
  { limit: 4000, name: 'Zona Béntica (Abisal)' }
];

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  
  if (scrollHeight > 0) {
    const percent = Math.min(1, Math.max(0, scrollY / scrollHeight));
    const depth = Math.round(percent * 4000);
    
    depthNumber.textContent = depth.toLocaleString();
    depthProgressBar.style.width = `${percent * 100}%`;
    
    const zone = depthZones.find(z => depth <= z.limit) || depthZones[depthZones.length - 1];
    depthZoneName.textContent = zone.name;
  }
});

// Run Init
init();
