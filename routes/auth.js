const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Import User model
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();


// Middleware for session-based authentication
const authenticateUser = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized. Please log in." });
    }
    next();
};



// Register Route
router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, phone, terms, agreedToTerms } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.render('register', {
            message: 'Passwords do not match',
            messageType: 'error'
        });
    }

    // Ensure terms are accepted
    if (!terms && !agreedToTerms) {
        return res.render('register', {
            message: 'You must accept the Terms and Conditions.',
            messageType: 'error'
        });
    }

    try {
        // Check if user already exists by email
        let user = await User.findOne({ email });
        if (user) {
            return res.render('register', {
                message: 'User already exists with this email.',
                messageType: 'error'
            });
        }

        // Check if user already exists by phone number
        let phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            return res.render('register', {
                message: 'This phone number has been used.',
                messageType: 'error'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user without the referral code
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            termsAccepted: true,
            balance: 0
        });

        await newUser.save();

        // Store the new user in the session
        req.session.user = newUser;  
        res.redirect('/dashboard');  // Redirect to dashboard or user account page
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});





// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', {
                message: 'Invalid email or password',
                messageType: 'error'
            });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', {
                message: 'Invalid email or password',
                messageType: 'error'
            });
        }

        // Store user in session
        req.session.user = user; // Store the user details in session
        console.log('User logged in:', user); // Optional: for debugging

        // Redirect user to dashboard after successful login
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});






// <!-- FUNCTION TO CHANGE USERNAME, EMAILS AND NUMBER  -->
// POST /api/user/update-profile
router.post('/update-profile', authenticateUser, async (req, res) => {
    const { name, email, phone, password, newPassword } = req.body;
    const userId = req.session.user._id; // From session

    try {
        // If password is provided, hash and update it
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            // Update password with the new hashed value
            await User.findByIdAndUpdate(userId, {
                name,
                email,
                phone,
                password: hashedPassword
            }, { new: true });
        } else {
            // If no new password, just update the name, email, and phone
            await User.findByIdAndUpdate(userId, {
                name,
                email,
                phone
            }, { new: true });
        }

        // Fetch updated user to send back to frontend
        const updatedUser = await User.findById(userId);

        // Update session with the new user data
        req.session.user = updatedUser;

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Update failed', error });
    }
});





// ALL ABOUT FORGOTEN PASSWORD 
// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or another provider
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Rate limiter setup for sensitive routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: 'Too many requests, please try again later.'
});

// Send reset code
router.post("/send-reset-code", limiter, async (req, res) => {
  const { email } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  console.log(`Sending reset code to: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(404).json({ message: "Email not found" });
    }

    const resetCode = crypto.randomInt(1000, 9999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetCode = resetCode;
    user.resetCodeExpires = expires;
    const savedUser = await user.save();

    console.log(`Saved reset code: ${savedUser.resetCode}, Expires: ${savedUser.resetCodeExpires}`);

    await transporter.sendMail({
      from: `"Your App" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Your Password Reset Code",
      text: `Your 4-digit reset code is: ${resetCode}. It expires in 10 minutes.`
    });

    console.log(`Reset code sent to: ${email}`);
    res.json({ message: "Verification code sent to your email" });

  } catch (error) {
    console.error('Error sending reset code:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Verify reset code
router.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (!/^\d{4}$/.test(code)) {
    return res.status(400).json({ message: "Invalid code format" });
  }

  console.log(`Verifying reset code for email: ${email} with code: ${code}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(404).json({ message: "Email not found" });
    }

    if (
      String(user.resetCode) !== String(code) ||
      Date.now() > new Date(user.resetCodeExpires).getTime()
    ) {
      console.log(`Invalid or expired code for email: ${email}`);
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    console.log(`Code verified successfully for email: ${email}`);

    // Optional: clear code after verification to prevent reuse
    // user.resetCode = undefined;
    // user.resetCodeExpires = undefined;
    // await user.save();

    res.json({ message: "Verification successful" });

  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  console.log(`Resetting password for email: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(404).json({ message: "Email not found" });
    }

    if (!user.resetCode || Date.now() > new Date(user.resetCodeExpires).getTime()) {
      console.log(`Reset code expired or invalid for email: ${email}`);
      return res.status(400).json({ message: "Reset code expired or invalid" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    console.log(`Password reset successfully for email: ${email}`);
    res.json({ message: "Password reset successfully" });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
