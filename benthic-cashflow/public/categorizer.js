// Motor de categorización automática de transacciones en español para Chile
const CATEGORIES = {
  supermercado: {
    label: '🛒 Supermercado',
    color: '#3b82f6',
    keywords: ['jumbo', 'lider', 'santa isabel', 'unimarc', 'walmart', 'tottus', 'ok market', 'mayorista', 'alvi']
  },
  restaurantes: {
    label: '🍽️ Restaurante/Delivery',
    color: '#f97316',
    keywords: ['rappi', 'uber eats', 'pedidosya', 'mcdonald', 'burger', 'sushi', 'dominos', 'pizz', 'starbucks', 'cafe', 'bravissimo', 'dunkin']
  },
  transporte: {
    label: '🚗 Transporte',
    color: '#06b6d4',
    keywords: ['uber', 'cabify', 'bip', 'metro', 'copec', 'shell', 'enex', 'petrobras', 'autopista', 'peaje', 'estacionamiento', 'costanera']
  },
  salud: {
    label: '💊 Salud',
    color: '#ec4899',
    keywords: ['farmacia', 'cruz verde', 'ahumada', 'clinica', 'hospital', 'isapre', 'fonasa', 'salcobrand', 'dent', 'medico']
  },
  servicios: {
    label: '⚡ Servicios',
    color: '#84cc16',
    keywords: ['vtr', 'movistar', 'entel', 'claro', 'enel', 'aguas', 'metrogas', 'electricidad', 'netflix', 'spotify', 'steam', 'hbo', 'disney', 'prime', 'sencillito', 'servipag']
  },
  hogar: {
    label: '🏠 Hogar',
    color: '#10b981',
    keywords: ['arriendo', 'gastos comunes', 'seguro', 'easy', 'sodimac', 'homecenter', 'con भी']
  },
  tarjeta: {
    label: '💳 Tarjeta/Línea',
    color: '#6366f1',
    keywords: ['pago tc', 'tarjeta', 'amortizacion', 'linea de credito', 'banco chile tc', 'visa', 'mastercard']
  },
  transferencia: {
    label: '🏦 Transferencia',
    color: '#a855f7',
    keywords: ['traspaso', 'transferencia', 'tef', 'abono', 'pago a', 'pago de']
  }
};

function categorizeMov(description) {
  if (!description) return 'otros';
  const cleanDesc = description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    for (const kw of cat.keywords) {
      if (cleanDesc.includes(kw)) {
        return key;
      }
    }
  }
  return 'otros';
}

function getCategoryMeta(key) {
  return CATEGORIES[key] || { label: '📦 Otros', color: '#6b7280' };
}
