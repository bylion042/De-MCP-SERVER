const express = require('express');
const axios = require('axios');
const router = express.Router();
const Example = require('../models/Example');

// GET all examples
  router.get('/examples', async (req, res) => {
  try {
    const examples = await Example.find();
    console.log('Examples fetched:', examples);  // Debugging
    res.json({ message: 'DeMCP Example APIs', data: examples });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




// POST new example
router.post('/examples', async (req, res) => {
  const { name, value, description, tags } = req.body;

  console.log('Received data:', req.body);  // Log the incoming data

  if (!name || !value || !description) {
    return res.status(400).json({ message: 'Name, value, and description are required.' });
  }

  try {
    const example = new Example({ name, value, description, tags });
    const savedExample = await example.save();
    res.status(201).json(savedExample);
  } catch (error) {
    console.error('Error saving example:', error);  // Log the error
    res.status(500).json({ message: error.message });
  }
});





// GET real-time market data (e.g., from CoinGecko)
router.get('/marketdata', async (req, res) => {
  const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

  try {
    // Fetch top 100 tokens with name, symbol, and current price in USD
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: false
        }
      }
    );

    const marketData = response.data.map(token => ({
  token: token.name,
  symbol: token.symbol.toUpperCase(),
  price: `${token.current_price} USD`,
  addedDate: token.atl_date || ''  // Use ATL date as proxy for now
}));


    // Filter by name or symbol if search query is provided
    const filteredMarketData = searchQuery
      ? marketData.filter(item =>
          item.token.toLowerCase().includes(searchQuery) ||
          item.symbol.toLowerCase().includes(searchQuery)
        )
      : marketData;

    res.json({ message: 'Market Data', data: filteredMarketData });
  } catch (error) {
    console.error('Error fetching market data:', error.message);
    res.status(500).json({ message: 'Error fetching market data' });
  }
});


// FUNCTION FOR TOKEN CHART 
router.get('/pricechart', async (req, res) => {
  const token = req.query.token || 'bitcoin';
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${token}/market_chart?vs_currency=usd&days=7`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ message: 'Failed to fetch price chart data.' });
  }
});



// POST /api/portfolio-value
router.post('/portfolio-value', async (req, res) => {
  const { portfolio } = req.body;

  if (!Array.isArray(portfolio)) {
    return res.status(400).json({ message: 'Invalid portfolio format' });
  }

  try {
    const tokenIds = portfolio
      .map(p => p.token?.toLowerCase().trim())
      .filter(Boolean)
      .join(',');

    if (!tokenIds) {
      return res.status(400).json({ message: 'No valid tokens provided' });
    }

    // Fetch current prices from CoinGecko
    const priceRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: tokenIds,
        vs_currencies: 'usd'
      }
    });

    const prices = priceRes.data;

    let totalValueUSD = 0;
    const details = [];

    portfolio.forEach(entry => {
      const token = entry.token.toLowerCase().trim();
      const amount = parseFloat(entry.amount) || 0;
      const price = prices[token]?.usd || 0;
      const value = price * amount;

      totalValueUSD += value;
      details.push({ token, amount, price, value });
    });

    res.json({ totalValueUSD, details });
  } catch (error) {
    console.error('Error fetching portfolio value:', error.message);
    res.status(500).json({ message: 'Failed to calculate portfolio value' });
  }
});



// POST /api/portfolio/save
router.post('/portfolio/save', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { portfolio } = req.body;

  if (!Array.isArray(portfolio)) {
    return res.status(400).json({ message: 'Invalid format' });
  }

  try {
    const sanitized = portfolio
      .map(p => ({
        token: p.token?.toLowerCase().trim(),
        amount: parseFloat(p.amount)
      }))
      .filter(p => p.token && !isNaN(p.amount));

    await Portfolio.findOneAndUpdate(
      { userId: req.session.user._id },
      { holdings: sanitized },
      { upsert: true, new: true }
    );

    res.json({ message: 'Portfolio saved successfully' });
  } catch (err) {
    console.error('Save error:', err.message);
    res.status(500).json({ message: 'Error saving portfolio' });
  }
});


module.exports = router;
