const supabase = require('../db/supabase');

/**
 * Contrôleur pour enregistrer un clic anonyme.
 */
const recordInvitationConfirmationClick = async (req, res) => {
    try {
        const { error } = await supabase
            .from('anonymous_clicks')
            .insert([
                { action_name: 'invitation_confirmation' }
            ]);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Clic de confirmation d\'invitation enregistré.' });

    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du clic.', error: error.message });
    }
};

/**
 * Contrôleur pour récupérer le nombre total de clics de confirmation d'invitation.
 */
const getInvitationConfirmationClickCount = async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('anonymous_clicks')
            .select('*', { count: 'exact', head: true }) // Compte le nombre de lignes
            .eq('action_name', 'invitation_confirmation');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ count: count });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de la récupération du nombre de clics.', error: error.message });
    }
};

/**
 * Contrôleur pour récupérer le nombre de clics de confirmation d'invitation par date.
 */
const getAnonymousClicksByDate = async (req, res) => {
    try {
        const { type, value } = req.query; // Get filter type and value from query parameters

        let query = supabase
            .from('anonymous_clicks')
            .select('created_at')
            .eq('action_name', 'invitation_confirmation');

        // Apply filtering based on type and value
        if (type === 'year' && value) {
            query = query.gte('created_at', `${value}-01-01T00:00:00Z`).lte('created_at', `${value}-12-31T23:59:59Z`);
        } else if (type === 'month' && value) {
            // value format: YYYY-MM
            query = query.gte('created_at', `${value}-01T00:00:00Z`).lte('created_at', `${value}-31T23:59:59Z`); // Max 31, will be adjusted by DB
        }

        query = query.order('created_at', { ascending: true });

        const { data, error } = await query;

        if (error) {
            console.error("Backend getAnonymousClicksByDate - Error fetching clicks:", error);
            return res.status(400).json({ error: error.message });
        }

        const countsByPeriod = data.reduce((acc, click) => {
            let period;
            const dateObj = new Date(click.created_at);

            if (type === 'year') {
                period = dateObj.getFullYear().toString();
            } else if (type === 'month') {
                period = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
            } else {
                period = dateObj.toISOString().split('T')[0]; // Default to YYYY-MM-DD
            }
            
            acc[period] = (acc[period] || 0) + 1;
            return acc;
        }, {});

        const result = Object.entries(countsByPeriod).map(([period, count]) => ({ date: period, count })); // Renamed 'date' to 'period' for clarity

        res.status(200).json(result);

    } catch (error) {
        console.error("Erreur dans getAnonymousClicksByDate:", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des clics par date.', error: error.message });
    }
};

module.exports = {
    recordInvitationConfirmationClick,
    getInvitationConfirmationClickCount,
    getAnonymousClicksByDate,
};