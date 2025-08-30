const supabase = require('../db/supabase');

// Controller to get all marketing links
const getAllLinks = async (req, res) => {
    // Logic to be added
    res.status(200).send('Links controller is working');
};

module.exports = {
    getAllLinks,
};