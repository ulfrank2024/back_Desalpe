const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route pour la connexion (login)
router.post('/login', authController.login);

module.exports = router;