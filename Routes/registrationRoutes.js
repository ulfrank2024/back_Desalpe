const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { isAdmin } = require('../authMiddleware');

// Route publique pour qu'un utilisateur s'enregistre
router.post('/', registrationController.addRegistration);

// Route protégée pour que l'admin voie tous les enregistrements
router.get('/', isAdmin, registrationController.getAllRegistrations);

module.exports = router;