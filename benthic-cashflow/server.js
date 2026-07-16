const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions for our simple JSON database
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { links: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '{"links":[]}');
  } catch (err) {
    console.error('Error reading DB file:', err);
    return { links: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// Mode select: 'test' or 'live' (defaults to 'test' if not explicitly 'live')
const FINTOC_MODE = process.env.FINTOC_MODE === 'live' ? 'live' : 'test';

// Select active keys based on mode
const fintocApiKey = FINTOC_MODE === 'live' 
  ? process.env.FINTOC_SECRET_KEY_LIVE 
  : process.env.FINTOC_SECRET_KEY_TEST;

const fintocPublicKey = FINTOC_MODE === 'live' 
  ? process.env.FINTOC_PUBLIC_KEY_LIVE 
  : process.env.FINTOC_PUBLIC_KEY_TEST;

// Middleware to check Fintoc API Key configuration
const checkFintocInit = (req, res, next) => {
  if (!fintocApiKey || fintocApiKey.includes('your_secret_key') || fintocApiKey.includes('COPIA_AQUI')) {
    return res.status(400).json({ 
      error: `Fintoc Secret API Key for mode [${FINTOC_MODE}] is not configured. Please update your .env file.` 
    });
  }
  next();
};

// API: Get current public API key (needed by frontend widget)
app.get('/api/config', (req, res) => {
  res.json({
    publicKey: fintocPublicKey || ''
  });
});

// API: Get connected links
app.get('/api/links', (req, res) => {
  const db = readDb();
  res.json(db.links);
});

// API: Create a Link Intent for the Widget (Direct REST API Call)
app.post('/api/link-intent', checkFintocInit, async (req, res) => {
  try {
    const response = await fetch('https://api.fintoc.com/v1/link_intents', {
      method: 'POST',
      headers: {
        'Authorization': fintocApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: 'movements',
        holder_type: 'individual',
        country: 'cl'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Fintoc API returned status ${response.status}`);
    }

    const linkIntent = await response.json();
    
    res.json({
      id: linkIntent.id,
      widgetToken: linkIntent.widget_token
    });
  } catch (error) {
    console.error('Error creating Link Intent:', error);
    res.status(500).json({ error: error.message || 'Failed to create Link Intent' });
  }
});

// API: Exchange the temporary token for a permanent Link ID (Direct REST API Call)
app.post('/api/exchange-token', checkFintocInit, async (req, res) => {
  const { exchangeToken } = req.body;
  
  if (!exchangeToken) {
    return res.status(400).json({ error: 'exchangeToken is required' });
  }
  
  try {
    const response = await fetch(`https://api.fintoc.com/v1/links?exchange_token=${exchangeToken}`, {
      method: 'GET',
      headers: {
        'Authorization': fintocApiKey
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Fintoc API returned status ${response.status}`);
    }

    const linksList = await response.json();
    if (!linksList || linksList.length === 0) {
      return res.status(404).json({ error: 'No se encontró ninguna conexión vinculada para este token de intercambio.' });
    }

    const link = linksList[0];
    
    // Save link information to local JSON database
    const db = readDb();
    const newLink = {
      id: link.id,
      linkToken: link.link_token,
      username: link.username || 'Usuario Banco Chile',
      institution: link.institution ? link.institution.name : 'Banco Chile',
      connectedAt: new Date().toISOString()
    };
    
    // Avoid duplicates
    const exists = db.links.some(l => l.id === link.id);
    if (!exists) {
      db.links.push(newLink);
      writeDb(db);
    }
    
    res.json(newLink);
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: error.message || 'Failed to exchange token' });
  }
});

// API: List accounts for a specific link (Direct REST API Call)
app.get('/api/accounts', checkFintocInit, async (req, res) => {
  const { linkId } = req.query;
  
  if (!linkId) {
    return res.status(400).json({ error: 'linkId query parameter is required' });
  }
  
  try {
    // Find the link token from our database
    const db = readDb();
    const savedLink = db.links.find(l => l.id === linkId);
    if (!savedLink) {
      return res.status(404).json({ error: 'Link connection not found in local database' });
    }
    
    const linkToken = savedLink.linkToken;

    // Fetch Link object details which contains the accounts array
    const response = await fetch(`https://api.fintoc.com/v1/links/${linkToken}`, {
      method: 'GET',
      headers: {
        'Authorization': fintocApiKey
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Fintoc API returned status ${response.status}`);
    }

    const linkData = await response.json();
    const accounts = linkData.accounts || [];
    
    // Map accounts to a simplified format for frontend
    const formattedAccounts = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      number: acc.number,
      officialName: acc.official_name,
      balance: {
        available: acc.balance.available,
        current: acc.balance.current,
        currency: acc.currency
      },
      type: acc.type
    }));
    
    res.json(formattedAccounts);
  } catch (error) {
    console.error('Error listing accounts:', error);
    res.status(500).json({ error: error.message || 'Failed to list accounts' });
  }
});

// API: List movements (transactions) for an account (Direct REST API Call)
app.get('/api/accounts/:accountId/movements', checkFintocInit, async (req, res) => {
  const { linkId } = req.query;
  const { accountId } = req.params;
  
  if (!linkId) {
    return res.status(400).json({ error: 'linkId query parameter is required' });
  }
  
  try {
    // Find the link token from our database
    const db = readDb();
    const savedLink = db.links.find(l => l.id === linkId);
    if (!savedLink) {
      return res.status(404).json({ error: 'Link connection not found in local database' });
    }
    
    const linkToken = savedLink.linkToken;

    // Fetch movements directly from REST API
    const response = await fetch(`https://api.fintoc.com/v1/accounts/${accountId}/movements?link_token=${linkToken}`, {
      method: 'GET',
      headers: {
        'Authorization': fintocApiKey
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Fintoc API returned status ${response.status}`);
    }

    const movements = await response.json();
    
    const formattedMovements = movements.slice(0, 50).map(mov => ({
      id: mov.id,
      amount: mov.amount,
      postDate: mov.post_date,
      description: mov.description,
      type: mov.type, // 'debit' or 'credit'
      currency: mov.currency,
      pending: mov.pending
    }));
    
    res.json(formattedMovements);
  } catch (error) {
    console.error('Error listing movements:', error);
    res.status(500).json({ error: error.message || 'Failed to list movements' });
  }
});

// Delete connection API
app.delete('/api/links/:linkId', (req, res) => {
  const { linkId } = req.params;
  const db = readDb();
  db.links = db.links.filter(l => l.id !== linkId);
  writeDb(db);
  res.json({ success: true, message: 'Link disconnected successfully from dashboard' });
});

app.listen(PORT, () => {
  console.log(`Benthic Cashflow server running at http://localhost:${PORT}`);
});
