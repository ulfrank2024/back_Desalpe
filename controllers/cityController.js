const supabase = require('../db/supabase'); // Client global pour les routes publiques

/**
 * Contrôleur pour créer une nouvelle ville (Admin).
 */
const addCity = async (req, res) => {
    const { countryId, name } = req.body;
    const supabase_authed = req.supabase_authed;

    if (!countryId || !name || !name.fr || !name.en) {
        return res.status(400).json({ error: 'L\'ID du pays (countryId) et un objet \'name\' avec les propriétés \'fr\' et \'en\' sont requis.' });
    }

    try {
        const { data, error } = await supabase_authed
            .from('cities')
            .insert([{ name_fr: name.fr, name_en: name.en, country_id: countryId }])
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Ville ajoutée avec succès.', city: data });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour récupérer les villes d\'un pays spécifique (Public).
 */
const getCitiesForCountry = async (req, res) => {
    const { countryId } = req.params;

    if (!countryId) {
        return res.status(400).json({ error: "L\'ID du pays est requis." });
    }

    try {
        const { data, error } = await supabase // Utiliser le client global
            .from('cities')
            .select('*')
            .eq('country_id', countryId)
            .order('name_fr', { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour supprimer une ville (Admin).
 */
const deleteCity = async (req, res) => {
    const { id } = req.params;
    const supabase_authed = req.supabase_authed; // Utiliser le client authentifié

    if (!id) {
        return res.status(400).json({ error: "L\'ID de la ville est requis." });
    }

    try {
        const { error } = await supabase_authed
            .from('cities')
            .delete()
            .eq('id', id);
            if (error) {
            if (error.code === '23503') { // PostgreSQL foreign key violation
                return res.status(400).json({ message: 'Impossible de supprimer cette ville car elle est liée à des sessions existantes. Veuillez supprimer les sessions associées d\'abord.' });
            }
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ message: `Ville avec l\'id ${id} supprimée avec succès.` });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour récupérer toutes les villes (Admin).
 */
const listAllCities = async (req, res) => {
    const supabase_authed = req.supabase_authed; // Utiliser le client authentifié
    try {
        const { data, error } = await supabase_authed
            .from('cities')
            .select('*')
            .order('name_fr', { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

module.exports = {
    addCity,
    getCitiesForCountry,
    deleteCity,
    listAllCities,
};