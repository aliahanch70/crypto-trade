// src/apiService.ts

// --- Helper Functions ---

const findCoinGeckoIdsBySymbols = (symbols: string[], coinList: any[]): string[] => {
  // Priority map for major coins to avoid symbol collision
  const priorityMap: { [symbol: string]: string } = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'bnb': 'binancecoin',
    'sol': 'solana',
    'xrp': 'ripple',
    'ada': 'cardano',
    'doge': 'dogecoin',
    'usdt': 'tether',
    'usdc': 'usd-coin',
  };

  const foundIds = new Set<string>();
  const lowercasedSymbols = symbols.map(s => s.toLowerCase());

  for (const symbol of lowercasedSymbols) {
    // 1. Check the priority map first for guaranteed results
    if (priorityMap[symbol]) {
      foundIds.add(priorityMap[symbol]);
      continue;
    }
  }

  // 2. For other symbols, perform a more precise search
  for (const coin of coinList) {
    const symbolLower = coin.symbol.toLowerCase();
    if (lowercasedSymbols.includes(symbolLower)) {
      // Prefer exact matches of id or name with the symbol
      if (coin.id === symbolLower || coin.name.toLowerCase() === symbolLower) {
        foundIds.add(coin.id);
      }
    }
  }
  
  // If still not found, do a broader search (less accurate, but better than nothing)
  if (foundIds.size < symbols.length) {
      for (const symbol of lowercasedSymbols) {
          const coin = coinList.find(c => c.symbol === symbol);
          if (coin) {
              foundIds.add(coin.id);
          }
      }
  }

  return Array.from(foundIds);
};




// --- API Providers ---

const fetchFromUniblock = async (symbols: string[]) => {
  console.log('Fallback 2: Attempting to fetch from UniBlock...');
  const apiKey = import.meta.env.VITE_UNIBLOCK_API_KEY;
  if (!apiKey) throw new Error("UniBlock API key is missing.");

  const apiUrl = `/api/uniblock/uni/v1/market-data/price?symbol=${symbols.join(',')}&currency=USD`;

  const response = await fetch(apiUrl, {
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`UniBlock request failed with status: ${response.status}`);

  // UniBlock یک آرایه از نتایج برمی‌گرداند
  const result = await response.json();
  const prices: { [symbol: string]: number } = {};

  for (const asset of result) {
    if (asset.price) {
      prices[asset.symbol.toUpperCase()] = parseFloat(asset.price);
    }
  }

  if (Object.keys(prices).length === 0) throw new Error("No prices returned from UniBlock");

  console.log('Successfully fetched from UniBlock');
  return prices;
};


const fetchFromCoinApi = async (symbols: string[]) => {
  console.log('Fallback 1: Attempting to fetch from CoinAPI...');
  const apiKey = import.meta.env.VITE_COINAPI_KEY;
  if (!apiKey) throw new Error("CoinAPI key is missing.");

  const apiUrl = `/api/coinapi/v1/assets?filter_asset_id=${symbols.join(',')}`;

  const response = await fetch(apiUrl, {
    headers: {
      'X-CoinAPI-Key': apiKey,
    },
  });

  if (!response.ok) throw new Error(`CoinAPI request failed with status: ${response.status}`);

  const result = await response.json();
  const prices: { [symbol: string]: number } = {};

  for (const asset of result) {
    if (asset.price_usd) {
      prices[asset.asset_id.toUpperCase()] = asset.price_usd;
    }
  }

  if (Object.keys(prices).length === 0) throw new Error("No prices returned from CoinAPI");

  console.log('Successfully fetched from CoinAPI');
  return prices;
};

// 1. CoinMarketCap (Primary)
const fetchFromCoinMarketCap = async (symbols: string[]) => {
  console.log('Attempting to fetch from CoinMarketCap...');
  const apiKey = import.meta.env.VITE_COINMARKETCAP_API_KEY;
  if (!apiKey) throw new Error("CoinMarketCap API key is missing.");

  // Using a local proxy is the recommended way for production
  const apiUrl = `/api/cmc/v2/cryptocurrency/quotes/latest?symbol=${symbols.join(',')}`;

  const response = await fetch(apiUrl, {
    headers: {
      'X-CMC_PRO_API_KEY': apiKey,
    },
  });

  if (!response.ok) throw new Error(`CoinMarketCap request failed with status: ${response.status}`);
  
  const result = await response.json();
  const prices: { [symbol: string]: number } = {};
  
  for (const symbol of symbols) {
    const data = result.data[symbol.toUpperCase()];
    if (data && data[0]) {
      prices[symbol.toUpperCase()] = data[0].quote.USD.price;
    }
  }
  if (Object.keys(prices).length === 0) throw new Error("No prices returned from CoinMarketCap");
  
  console.log('Successfully fetched from CoinMarketCap');
  return prices;
};

const fetchFromBinance = async (symbols: string[]) => {
  console.log('Fallback 1: Attempting to fetch from Binance...');
  
  // Binance از جفت‌ارزها مثل BTCUSDT استفاده می‌کند
  const response = await fetch('https://api.binance.com/api/v3/ticker/price');
  
  if (!response.ok) throw new Error('Binance request failed');
  
  // The rest of the function remains the same
  const allTickers = await response.json();
  const prices: { [symbol: string]: number } = {};
  
  const requiredPairs = new Set(symbols.map(s => `${s.toUpperCase()}USDT`));

  for (const ticker of allTickers) {
    if (requiredPairs.has(ticker.symbol)) {
      const originalSymbol = ticker.symbol.replace('USDT', '');
      prices[originalSymbol.toUpperCase()] = parseFloat(ticker.price);
    }
  }

  if (Object.keys(prices).length === 0) throw new Error("No prices found on Binance for the given symbols");
  
  console.log('Successfully fetched from Binance');
  return prices;
};


// 2. CoinCap (Secondary Fallback)
const fetchFromCoinCap = async (symbols: string[]) => {
  console.log('Fallback 1: Attempting to fetch from CoinCap...');
  
  // CoinCap needs asset IDs, which we can try to guess from symbols.
  // This is less reliable but works for major coins.
  const response = await fetch(`https://rest.coincap.io/v3/assets`);
  if (!response.ok) throw new Error('CoinCap assets list request failed');
  const { data: allAssets } = await response.json();

  const prices: { [symbol: string]: number } = {};
  const lowercasedSymbols = symbols.map(s => s.toLowerCase());

  for (const asset of allAssets) {
    if (lowercasedSymbols.includes(asset.symbol.toLowerCase())) {
        prices[asset.symbol.toUpperCase()] = parseFloat(asset.priceUsd);
    }
  }

  if (Object.keys(prices).length === 0) throw new Error("No prices found on CoinCap for the given symbols");
  
  console.log('Successfully fetched from CoinCap');
  return prices;
};


// 3. CoinGecko (Final Fallback)
const fetchFromCoinGecko = async (symbols: string[], coinList: any[]) => {
  console.log('Fallback 2: Attempting to fetch from CoinGecko...');
  
  // Uses the new, smarter find function
  const coinIds = findCoinGeckoIdsBySymbols(symbols, coinList);
  if (coinIds.length === 0) throw new Error("Could not find CoinGecko IDs for symbols");

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`);
  if (!response.ok) throw new Error('CoinGecko request failed');

  const result = await response.json();
  const prices: { [symbol: string]: number } = {};
  
  for (const id in result) {
    const coin = coinList.find(c => c.id === id);
    if (coin) {
      prices[coin.symbol.toUpperCase()] = result[id].usd;
    }
  }
  
  if (Object.keys(prices).length === 0) throw new Error("No prices returned from CoinGecko");

  console.log('Successfully fetched from CoinGecko');
  return prices;
};



// --- Smart Fetching Service ---

export const getLivePrices = async (symbols: string[], coinList: any[]) => {
  if (symbols.length === 0) return {};
  
  // --- Chain of API calls ---

    try { return await fetchFromUniblock(symbols); }
  catch (error) { console.warn('UniBlock failed:', error); }

    // 2. Try CoinAPI
  try { return await fetchFromCoinApi(symbols); }
  catch (error) { console.warn('CoinAPI failed:', error); }

  try { return await fetchFromCoinGecko(symbols, coinList); } 
  catch (error) { console.error('All price providers failed:', error); }

    // 2. Try Binance
  try { return await fetchFromBinance(symbols); } 
  catch (error) { console.warn('Binance failed:', error); }
  
  // 1. Try CoinMarketCap first
  try { return await fetchFromCoinMarketCap(symbols); } 
  catch (error) { console.warn('CoinMarketCap failed:', error); }

  // 3. Try CoinCap
  try { return await fetchFromCoinCap(symbols); } 
  catch (error) { console.warn('CoinCap failed:', error); }


  return {}; // Return empty object if all fail
};