const supabase = require('../db/supabase'); // Client global pour les routes publiques

/**
 * Contrôleur pour créer une nouvelle session (Admin).
 */
const addSession = async (req, res) => {
    const { title, language, address, cityId, start_time, end_time } = req.body;
    const supabase_authed = req.supabase_authed;

    if (!title || !language || !address || !cityId || !start_time || !end_time) {
        return res.status(400).json({ error: 'Les champs titre, langue, adresse, ID de ville, heure de début et heure de fin sont requis.' });
    }

    try {
        const { data: sessionData, error: sessionError } = await supabase_authed
            .from('sessions')
            .insert([
                { 
                    title, 
                    language, 
                    address, 
                    city_id: cityId,
                    start_time,
                    end_time,
                }
            ])
            .select()
            .single();

        if (sessionError) {
            return res.status(400).json({ error: sessionError.message });
        }

        res.status(201).json({ message: 'Session ajoutée avec succès.', session: sessionData });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour mettre à jour une session (Admin).
 */
const editSession = async (req, res) => {
    const { id } = req.params;
    const { title, language, address, cityId, start_time, end_time, is_terminated } = req.body; // Add is_terminated
    const supabase_authed = req.supabase_authed;

    if (!id) {
        return res.status(400).json({ error: "L'ID de la session est requis." });
    }

    // Build the object with fields to update
    const updateData = {};
    if (title) updateData.title = title;
    if (language) updateData.language = language;
    if (address) updateData.address = address;
    if (cityId) updateData.city_id = cityId;
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (is_terminated !== undefined) updateData.is_terminated = is_terminated; // Handle boolean false

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Aucun champ à mettre à jour fourni.' });
    }

    try {
        const { data: updatedSessionData, error: sessionUpdateError } = await supabase_authed
            .from('sessions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (sessionUpdateError) {
            return res.status(400).json({ error: sessionUpdateError.message });
        }

        if (!updatedSessionData) {
            return res.status(404).json({ message: 'Session non trouvée.' });
        }

        res.status(200).json({ message: `Session avec l'id ${id} mise à jour avec succès.`, session: updatedSessionData });

    } catch (error) {
        console.error("Erreur interne du serveur lors de la mise à jour de session:", error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour supprimer une session (Admin).
 */
const removeSession = async (req, res) => {
    const { id } = req.params;
    const supabase_authed = req.supabase_authed; // Utiliser le client authentifié

    if (!id) {
        return res.status(400).json({ error: "L'ID de la session est requis." });
    }

    try {
        const { error } = await supabase_authed
            .from('sessions')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ message: `Session avec l'id ${id} supprimée avec succès.` });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour lister les sessions à venir pour une ville (Public).
 */
const listSessionsForCity = async (req, res) => {
    const { cityId } = req.params;

    if (!cityId) {
        return res.status(400).json({ error: "L'ID de la ville est requis." });
    }

    try {
        const { data, error } = await supabase // Utiliser le client global
            .from("sessions")
            .select(
                `
                     id,
                     title,
                     language,
                     address,
                     start_time,
                     end_time,
                     city_id,
                     created_at
                `
            )
            .eq("city_id", cityId)
            .eq('is_terminated', false) // Do not show terminated sessions to users
            .order("title", { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const now = new Date();
        // Filter sessions to only include those with a future start_time
        const futureSessions = data.filter(session => 
            new Date(session.start_time) > now
        ); 

        res.status(200).json(futureSessions);

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

/**
 * Contrôleur pour lister toutes les sessions (Admin).
 */
const listAllSessions = async (req, res) => {
    try {
        const { data, error } = await supabase // Utiliser le client global pour les routes publiques
            .from("sessions")
            .select('*'); // Select ALL columns to ensure is_terminated is included

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        

        res.status(200).json(data);

    } catch (error) {
        console.error("listAllSessions server error:", error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

module.exports = {
    addSession,
    editSession,
    removeSession,
    listSessionsForCity,
    listAllSessions,
};