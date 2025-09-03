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

module.exports = {
    recordClick,
};
