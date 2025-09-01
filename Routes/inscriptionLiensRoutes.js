const express = require('express');
const router = express.Router();
const inscriptionLiensController = require('../controllers/inscriptionLiensController');
const { isAdmin } = require('../authMiddleware');

// GET all marketing links
router.get('/', isAdmin, inscriptionLiensController.getAllLinks);

// POST a new custom marketing link
router.post('/', isAdmin, inscriptionLiensController.createLink);

// PUT to update a link
router.put('/:id', isAdmin, inscriptionLiensController.updateLink);

// DELETE to soft-delete a link
router.delete('/:id', isAdmin, inscriptionLiensController.deleteLink);

// PUT to restore a soft-deleted link
router.put('/:id/restore', isAdmin, inscriptionLiensController.restoreLink);

module.exports = router;