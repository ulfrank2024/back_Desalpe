const express = require('express');
const router = express.Router();
const inscriptionProspectsController = require('../controllers/inscriptionProspectsController');

// Route to add a new prospect from the contact form
router.post('/', inscriptionProspectsController.addProspect);

module.exports = router;