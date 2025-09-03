const supabase = require('../db/supabase');

/**
 * Enregistre un événement de clic anonyme dans la base de données.
 */
const recordClick = async (req, res) => {
    const { click_type } = req.body;

    // Validation que le type de clic est fourni
    if (!click_type) {
        return res.status(400).json({ message: 'Le champ click_type est requis.' });
    }

    try {
        const { error } = await supabase
            .from('click_events')
            .insert([
                { click_type: click_type }
            ]);

        if (error) {
            // Gère le cas où le click_type n'est pas l'un de ceux autorisés par la contrainte CHECK
            if (error.code === '23514') {
                 return res.status(400).json({ message: `Le type de clic '${click_type}' n'est pas valide.` });
            }
            throw error;
        }

        res.status(201).json({ message: `Événement de clic '${click_type}' enregistré avec succès.` });

    } catch (error) {
        console.error("Erreur lors de l'enregistrement du clic:", error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du clic.', error: error.message });
    }
};

const getClickHistory = async (req, res) => {
    try {
        // Jointure entre click_events et liens_marketing pour obtenir les détails
        const { data, error } = await supabase
            .from('click_events')
            .select(`
                id,
                created_at,
                click_type,
                liens_marketing (
                    url_destination,
                    type_lien,
                    ambassadeur_prenom,
                    ambassadeur_nom,
                    ambassadeur_email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transformer les données pour un format plus simple
        const history = data.map(item => ({
            id: item.id,
            date: item.created_at,
            click_type: item.click_type,
            link_url: item.liens_marketing?.url_destination,
            link_type: item.liens_marketing?.type_lien,
            ambassador_firstname: item.liens_marketing?.ambassadeur_prenom,
            ambassador_lastname: item.liens_marketing?.ambassadeur_nom,
            ambassador_email: item.liens_marketing?.ambassadeur_email,
        }));

        res.status(200).json(history);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'historique des clics:", error);
        res.status(500).json({ message: "Impossible de récupérer l'historique des clics", error: error.message });
    }
};

module.exports = {
    recordClick,
    getClickHistory,
};
