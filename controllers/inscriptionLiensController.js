const supabase = require('../db/supabase');

const getAllLinks = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .select('*')
            .order('date_creation', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch links', error: error.message });
    }
};

const createCustomLink = async (req, res) => {
    const {
        url_destination,
        code_court,
        ambassadeur_prenom,
        ambassadeur_nom,
        ambassadeur_email,
        valide_jusqu_a
    } = req.body;

    if (!url_destination || !code_court) {
        return res.status(400).json({ message: 'Destination URL and short code are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .insert([{
                type_lien: 'personnalise',
                url_destination,
                code_court,
                ambassadeur_prenom,
                ambassadeur_nom,
                ambassadeur_email,
                valide_jusqu_a
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Custom link created successfully', data: data[0] });
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation for short_code
            return res.status(409).json({ message: 'This short code is already in use.' });
        }
        res.status(500).json({ message: 'Failed to create custom link', error: error.message });
    }
};

// Placeholder for future functions
const updateLink = async (req, res) => res.status(501).json({message: "Not implemented"});
const deleteLink = async (req, res) => res.status(501).json({message: "Not implemented"});

module.exports = {
    getAllLinks,
    createCustomLink,
    updateLink,
    deleteLink,
};