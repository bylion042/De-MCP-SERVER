require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const session = require('express-session'); // Import session middleware

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Session middleware setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use environment variable for secret
  resave: false, // Don't resave session if not modified
  saveUninitialized: true, // Save session even if not modified
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Routes
const apiRoutes = require('./routes/api');
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');

app.use('/api', apiRoutes);
app.use('/', mainRoutes);
app.use('/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.render('index', { title: 'DeMCP Server' });
});


// Home page: prompt form
app.get('/bonus', (req, res) => {
  res.render('bonus');
});



app.post('/recommend', async (req, res) => {
  const prompt = req.body.prompt;
  const keywords = prompt.trim().split(/\s+/).join('+');

  const polyPizzaLink = `https://poly.pizza/search?q=${keywords}`;
  const sketchfabLink = `https://sketchfab.com/search?type=models&sort_by=-relevance&q=${keywords}`;

  const suggestions = [
    {
      name: "Search on Poly Pizza",
      url: polyPizzaLink
    },
    {
      name: "Search on Sketchfab",
      url: sketchfabLink
    }
  ];

  res.render('recommendations', { prompt, suggestions });
});



// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
