const express = require('express');
const router = express.Router();
const moment = require('moment');
const Example = require('../models/Example');

// Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// Register Page
router.get('/register', (req, res) => {
  res.render('register');  
});

// Forgot-password Page
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password');  
});

// Dashboard Page
router.get('/dashboard', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const portfolio = await Portfolio.findOne({ userId: req.session.user._id });
    res.render('dashboard', {
      user: req.session.user,
      savedPortfolio: portfolio?.holdings || []
    });
  } catch (err) {
    console.error('Error loading portfolio:', err);
    res.render('dashboard', {
      user: req.session.user,
      savedPortfolio: [],
      error: 'Failed to load saved portfolio'
    });
  }
});




module.exports = router;
