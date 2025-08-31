const express = require('express');
const router = express.Router();
const inscriptionRotationController = require('../controllers/inscriptionRotationController');

// GET the current rotating link for the home page button
router.get('/lien-actuel', inscriptionRotationController.getCurrentLink);

module.exports = router;