const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabase'); // Client global pour les routes publiques

/**
 * Contrôleur pour créer un nouveau pays (Admin).
 */
const addCountry = async (req, res) => {
    console.log('addCountry: TOP OF FUNCTION');
    const { name } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    console.log('addCountry: Données du pays reçues pour l\'insertion:', name); // Log pour voir les données

    if (!name || !name.fr || !name.en) {
        return res.status(400).json({ error: 'L\'objet \'name\' avec les propriétés \'fr\' et \'en\' est requis.' });
    }

    if (!token) {
        return res.status(401).json({ error: 'Accès non autorisé: Token manquant.' });
    }

    try {
        // Créer un client Supabase authentifié SPÉCIFIQUEMENT pour cette requête
        const supabase_authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        console.log('addCountry: Attempting to insert country into Supabase with a fresh authed client.');
        const { data, error } = await supabase_authed
            .from('countries')
            .insert([{ name_fr: name.fr, name_en: name.en }])
            .select()
            .single();

        if (error) {
            console.log('addCountry: Supabase insert error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('addCountry: Country added successfully:', data);
        res.status(201).json({ message: 'Pays ajouté avec succès.', country: data });

    } catch (error) {
        console.error('addCountry: Internal server error caught:', error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
    console.log('addCountry: Function finished.');
};

/**
 * Contrôleur pour récupérer tous les pays (Public).
 */
const getAllCountries = async (req, res) => {
    try {
        const { data, error } = await supabase // Utiliser le client global
            .from('countries')
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

/**
 * Contrôleur pour supprimer un pays (Admin).
 */
const deleteCountry = async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!id) {
        return res.status(400).json({ error: "L'ID du pays est requis." });
    }

    if (!token) {
        return res.status(401).json({ error: 'Accès non autorisé: Token manquant.' });
    }

    try {
        // Créer un client Supabase authentifié SPÉCIFIQUEMENT pour cette requête
        const supabase_authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { error } = await supabase_authed
            .from('countries')
            .delete()
            .eq('id', id);
            if (error) {
            if (error.code === '23503') { // PostgreSQL foreign key violation
                return res.status(400).json({ message: 'Impossible de supprimer ce pays car il est lié à des villes ou sessions existantes. Veuillez supprimer les villes et sessions associées d\'abord.' });
            }
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ message: `Pays avec l\'id ${id} supprimé avec succès.` });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};


module.exports = {
    addCountry,
    getAllCountries,
    deleteCountry,
};