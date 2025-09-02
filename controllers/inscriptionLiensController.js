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

    // Convert empty string to null for valide_jusqu_a
    const final_valide_jusqu_a = (valide_jusqu_a === '') ? null : valide_jusqu_a;

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
                valide_jusqu_a: final_valide_jusqu_a // Use the processed value
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
            .update({ est_supprime: true, date_suppression: new Date().toISOString(), est_actif: false })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Link not found' });

        res.status(200).json({ message: 'Link deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete link', error: error.message });
    }
};

const restoreLink = async (req, res) => {
    const { id } = req.params;
    const { valide_jusqu_a } = req.body; // For custom links

    try {
        let updateData = {
            est_supprime: false,
            est_actif: true,
            date_suppression: null // Clear deletion date
        };

        // If valide_jusqu_a is provided, it's a custom link restoration
        if (valide_jusqu_a !== undefined && valide_jusqu_a !== null) {
            updateData.valide_jusqu_a = new Date(valide_jusqu_a).toISOString();
        }

        const { data, error } = await supabase
            .from('liens_marketing')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Link not found' });

        res.status(200).json({ message: 'Link restored successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to restore link', error: error.message });
    }
};

module.exports = {
    getAllLinks,
    createLink,
    updateLink,
    deleteLink,
    restoreLink,
};