const supabase = require('../db/supabase');

const getCurrentLink = async (req, res) => {
    try {
        // 1. Récupérer l'état actuel de la rotation (dernier lien servi)
        const { data: currentState, error: stateError } = await supabase
            .from('etat_rotation')
            .select('valeur_id, date_mise_a_jour')
            .eq('cle', 'lien_actuel_id')
            .single();

        if (stateError && stateError.code !== 'PGRST116') { // Ignorer l'erreur si aucune ligne n'est trouvée
            throw stateError;
        }

        const now = new Date();

        let linkToServe = null;

        // 2. Récupérer TOUS les liens marketing actifs et non supprimés
        let { data: allActiveLinks, error: linksError } = await supabase
            .from('liens_marketing')
            .select('id, url_destination')
            .eq('est_supprime', false)
            .eq('est_actif', true)
            .order('date_creation', { ascending: true }); // Ou par ID pour une rotation stable

        if (linksError) throw linksError;

        if (!allActiveLinks || allActiveLinks.length === 0) {
            // Aucun lien disponible, renvoyer une URL de secours
            return res.status(404).json({ destinationUrl: 'https://gracedesalpes.com/fallback' });
        }

        // 3. Déterminer le prochain lien dans la séquence
        const lastLinkId = currentState ? currentState.valeur_id : null;
        let nextIndex = 0; // Par défaut, le premier lien

        if (lastLinkId) {
            const lastIndex = allActiveLinks.findIndex(link => link.id === lastLinkId);
            if (lastIndex !== -1) {
                nextIndex = (lastIndex + 1) % allActiveLinks.length;
            }
        }
        linkToServe = allActiveLinks[nextIndex];

        // 4. Mettre à jour l'état de la rotation avec le nouveau lien servi
        const { error: updateStateError } = await supabase
            .from('etat_rotation')
            .upsert(
                { cle: 'lien_actuel_id', valeur_id: linkToServe.id, date_mise_a_jour: now.toISOString() },
                { onConflict: 'cle' }
            );

        if (updateStateError) throw updateStateError;

        // 5. Renvoyer l'URL de destination et l'ID du lien
        res.status(200).json({ 
            destinationUrl: linkToServe.url_destination,
            lien_id: linkToServe.id
        });

        // 6. Asynchronously track the click event (if needed, this is handled by frontend now)
        await supabase.rpc('increment_click_count', { link_id_to_update: linkToServe.id });

    } catch (error) {
        console.error('Error getting current link:', error);
        res.status(500).json({ message: 'Failed to get current link', error: error.message });
    }
};

module.exports = {
    getCurrentLink,
};