const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { isAdmin } = require('../authMiddleware');

// Route pour envoyer un email général (protégée par isAdmin)
router.post('/send', isAdmin, emailController.sendGeneralEmail);

module.exports = router;