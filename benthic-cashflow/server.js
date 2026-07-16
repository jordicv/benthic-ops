const express = require('express');
const cors = require('cors');
const { Fintoc } = require('fintoc');
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

// Initialize Fintoc client
const fintocApiKey = process.env.FINTOC_SECRET_KEY || '';
const fintoc = fintocApiKey ? new Fintoc(fintocApiKey) : null;

// Middleware to check Fintoc client initialization
const checkFintocInit = (req, res, next) => {
  if (!fintocApiKey || fintocApiKey.includes('your_secret_key')) {
    return res.status(400).json({ 
      error: 'Fintoc Secret API Key is not configured. Please update the .env file.' 
    });
  }
  if (!fintoc) {
    return res.status(500).json({ error: 'Fintoc client failed to initialize.' });
  }
  next();
};

// API: Get current public API key (needed by frontend widget)
app.get('/api/config', (req, res) => {
  res.json({
    publicKey: process.env.FINTOC_PUBLIC_KEY || ''
  });
});

// API: Get connected links
app.get('/api/links', (req, res) => {
  const db = readDb();
  res.json(db.links);
});

// API: Create a Link Intent for the Widget
app.post('/api/link-intent', checkFintocInit, async (req, res) => {
  try {
    const linkIntent = await fintoc.link_intents.create({
      product: 'movements',
      holder_type: 'individual'
    });
    
    res.json({
      id: linkIntent.id,
      widgetToken: linkIntent.widget_token
    });
  } catch (error) {
    console.error('Error creating Link Intent:', error);
    res.status(500).json({ error: error.message || 'Failed to create Link Intent' });
  }
});

// API: Exchange the temporary token for a permanent Link ID
app.post('/api/exchange-token', checkFintocInit, async (req, res) => {
  const { exchangeToken } = req.body;
  
  if (!exchangeToken) {
    return res.status(400).json({ error: 'exchangeToken is required' });
  }
  
  try {
    // Exchange token for Link object
    const link = await fintoc.link_intents.exchange(exchangeToken);
    
    // Save link information to local JSON database
    const db = readDb();
    const newLink = {
      id: link.id,
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

// API: List accounts for a specific link
app.get('/api/accounts', checkFintocInit, async (req, res) => {
  const { linkId } = req.query;
  
  if (!linkId) {
    return res.status(400).json({ error: 'linkId query parameter is required' });
  }
  
  try {
    const linkObj = await fintoc.links.get(linkId);
    
    // Fetch all accounts for this link
    const accounts = await linkObj.accounts.all();
    
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

// API: List movements (transactions) for an account
app.get('/api/accounts/:accountId/movements', checkFintocInit, async (req, res) => {
  const { linkId } = req.query;
  const { accountId } = req.params;
  
  if (!linkId) {
    return res.status(400).json({ error: 'linkId query parameter is required' });
  }
  
  try {
    const linkObj = await fintoc.links.get(linkId);
    
    // Find the specific account
    const accounts = await linkObj.accounts.all();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Fetch movements (limiting to top 50 for performance)
    const movements = await account.movements.all();
    
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
