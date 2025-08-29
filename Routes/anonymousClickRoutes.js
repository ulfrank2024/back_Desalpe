const express = require('express');
const router = express.Router();
const anonymousClickController = require('../controllers/anonymousClickController');

// Route pour enregistrer un clic de confirmation d'invitation
router.get('/invitation-confirmation', anonymousClickController.recordInvitationConfirmationClick);

// Route pour récupérer le nombre de clics de confirmation d'invitation
router.get('/invitation-confirmation/count', anonymousClickController.getInvitationConfirmationClickCount);

// Route pour récupérer le nombre de clics de confirmation d'invitation par date
router.get('/invitation-confirmation/by-date', anonymousClickController.getAnonymousClicksByDate);

module.exports = router;