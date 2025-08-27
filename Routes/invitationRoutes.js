const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { isAdmin } = require('../authMiddleware'); // Assuming you want to protect these routes

// Route to create a new invitation (public)
router.post('/', invitationController.createInvitation);

// Route to get overall statistics
router.get('/stats', isAdmin, invitationController.getStats);

// Route to get statistics by date range
router.get('/stats/by-date', isAdmin, invitationController.getStatsByDate);


// --- The following routes are commented out because the handler functions are not defined in the controller ---
// --- This is to prevent the server from crashing. We can implement them later. ---

// // Route pour confirmer une invitation (protégée, car modifie le statut)
// router.put('/confirm/:id', isAdmin, invitationController.confirmInvitation);

router.get('/', isAdmin, invitationController.listAllInvitations);

// // Route pour supprimer une invitation (protégée)
// router.delete('/:id', isAdmin, invitationController.deleteInvitation);

module.exports = router;