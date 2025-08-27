const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const { isAdmin } = require('../authMiddleware');

// Route pour ajouter une ville (protégée)
router.post('/', isAdmin, cityController.addCity);

// Route pour récupérer les villes d'un pays spécifique (publique)
router.get('/country/:countryId', cityController.getCitiesForCountry);

// Route pour supprimer une ville par son ID (protégée)
router.delete('/:id', isAdmin, cityController.deleteCity);

// Route pour lister toutes les villes (protégée)
router.get('/', isAdmin, cityController.listAllCities);

module.exports = router;