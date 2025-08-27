const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// Route pour déclencher l'envoi des rappels de sessions à venir
router.post('/send-upcoming', reminderController.sendUpcomingReminders);

module.exports = router;