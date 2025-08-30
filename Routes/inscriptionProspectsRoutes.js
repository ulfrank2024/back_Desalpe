const express = require('express');
const router = express.Router();
const inscriptionProspectsController = require('../controllers/inscriptionProspectsController');
const { isAdmin } = require('../authMiddleware');

// Route to add a new prospect from the contact form
router.post('/', inscriptionProspectsController.addProspect);

// Route to get all prospects
router.get('/', isAdmin, inscriptionProspectsController.getAllProspects);

module.exports = router;