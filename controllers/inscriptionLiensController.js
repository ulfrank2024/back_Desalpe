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

const createLink = async (req, res) => {
    const {
        type_lien,
        url_destination,
        code_court,
        ambassadeur_prenom,
        ambassadeur_nom,
        ambassadeur_email,
        valide_jusqu_a
    } = req.body;

    if (!url_destination || !code_court || !type_lien) {
        return res.status(400).json({ message: 'Link type, destination URL and short code are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .insert([{
                type_lien,
                url_destination,
                code_court,
                ambassadeur_prenom,
                ambassadeur_nom,
                ambassadeur_email,
                valide_jusqu_a: type_lien === 'personnalise' ? valide_jusqu_a : null // Only set for personalized links
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Link created successfully', data: data[0] });
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation for short_code
            return res.status(409).json({ message: 'This short code is already in use.' });
        }
        res.status(500).json({ message: 'Failed to create link', error: error.message });
    }
};

const updateLink = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Link not found' });

        res.status(200).json({ message: 'Link updated successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update link', error: error.message });
    }
};

const deleteLink = async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .update({ est_supprime: true, date_suppression: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Link not found' });

        res.status(200).json({ message: 'Link deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete link', error: error.message });
    }
};

module.exports = {
    getAllLinks,
    createLink,
    updateLink,
    deleteLink,
};