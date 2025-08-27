const supabase = require('../db/supabase'); // Client global pour les routes publiques

/**
 * Ajoute un nouvel enregistrement de participant (Public).
 */
const addRegistration = async (req, res) => {
    const { firstName, lastName, email, phoneNumber, countryId, cityId, sessionIds } = req.body;

    // Validation basique
    if (!firstName || !lastName || !email || !countryId || !cityId || !sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({ message: 'Tous les champs requis (prénom, nom, email, pays, ville, sessions) sont nécessaires.' });
    }

    try {
        const { data, error } = await supabase // Utiliser le client global
            .from('registrations')
            .insert([
                {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone_number: phoneNumber,
                    country_id: countryId,
                    city_id: cityId,
                    session_ids: sessionIds
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase error during registration:', error);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Enregistrement réussi.', registration: data });

    } catch (error) {
        console.error("Erreur dans addRegistration:", error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'enregistrement.', error: error.message });
    }
};

/**
 * Récupère tous les enregistrements (Admin).
 */
const getAllRegistrations = async (req, res) => {
    const supabase_authed = req.supabase_authed; // Utiliser le client authentifié
    try {
        const { data, error } = await supabase_authed
            .from('registrations')
            .select('*');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Erreur dans getAllRegistrations:", error);
        res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
    }
};

module.exports = {
    addRegistration,
    getAllRegistrations,
};
