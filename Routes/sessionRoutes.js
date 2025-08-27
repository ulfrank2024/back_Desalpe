const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { isAdmin } = require('../authMiddleware');

// Route pour ajouter une session (protégée)
router.post('/', isAdmin, sessionController.addSession);

// Route pour mettre à jour une session par son ID (protégée)
router.put('/:id', isAdmin, sessionController.editSession);

// Route pour supprimer une session par son ID (protégée)
router.delete('/:id', isAdmin, sessionController.removeSession);

// Route pour lister les sessions à venir pour une ville spécifique (publique)
router.get('/city/:cityId', sessionController.listSessionsForCity);

// Route pour lister toutes les sessions (publique pour la page d'invitation)
router.get('/', sessionController.listAllSessions);

module.exports = router;