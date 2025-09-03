const express = require('express');
const router = express.Router();
const clickEventsController = require('../controllers/clickEventsController');

// Route pour enregistrer un événement de clic
// POST /api/click-events
router.post('/', clickEventsController.recordClick);

module.exports = router;
