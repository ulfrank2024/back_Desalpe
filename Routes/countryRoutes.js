console.log('countryRoutes.js: File loaded.'); // NEW LOG 1

const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const { isAdmin } = require('../authMiddleware');

// Route pour ajouter un pays (protégée)
console.log('countryRoutes.js: Registering POST / route.'); // NEW LOG 2
router.post('/', isAdmin, countryController.addCountry);

// Route pour lister tous les pays (publique)
router.get('/', countryController.getAllCountries);

// Route pour supprimer un pays par son ID (protégée)
router.delete('/:id', isAdmin, countryController.deleteCountry);

module.exports = router;