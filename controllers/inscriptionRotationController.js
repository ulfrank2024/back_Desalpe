const supabase = require('../db/supabase');

const getCurrentLink = async (req, res) => {
    const ROTATION_MINUTES = 10;

    try {
        // 1. Get the current rotation state
        const { data: currentState, error: stateError } = await supabase
            .from('etat_rotation')
            .select('valeur_id, date_mise_a_jour')
            .eq('cle', 'lien_actuel_id')
            .single();

        if (stateError && stateError.code !== 'PGRST116') { // Ignore error if no rows are found
            throw stateError;
        }

        const now = new Date();
        const lastUpdate = currentState ? new Date(currentState.date_mise_a_jour) : new Date(0);
        const minutesSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / 60000;

        let linkToServe = null;

        // 2. Check if it's time to rotate
        if (!currentState || !currentState.valeur_id || minutesSinceLastUpdate > ROTATION_MINUTES) {
            // TIME TO ROTATE
            // a. Look for active custom links
            let { data: activeLinks, error: linksError } = await supabase
                .from('liens_marketing')
                .select('id, url_destination')
                .eq('type_lien', 'personnalise')
                .eq('est_supprime', false)
                .eq('est_actif', true)
                .gt('valide_jusqu_a', now.toISOString())
                .order('date_creation', { ascending: true });

            if (linksError) throw linksError;

            // b. If no active custom links, look for active default links
            if (!activeLinks || activeLinks.length === 0) {
                const { data: defaultLinks, error: defaultLinksError } = await supabase
                    .from('liens_marketing')
                    .select('id, url_destination')
                    .eq('type_lien', 'defaut')
                    .eq('est_supprime', false)
                    .eq('est_actif', true)
                    .order('date_creation', { ascending: true });
                
                if (defaultLinksError) throw defaultLinksError;
                activeLinks = defaultLinks || [];
            }

            // c. Determine the next link in the sequence
            if (activeLinks.length > 0) {
                const lastLinkId = currentState ? currentState.valeur_id : null;
                const lastIndex = activeLinks.findIndex(link => link.id === lastLinkId);
                const nextIndex = (lastIndex + 1) % activeLinks.length;
                linkToServe = activeLinks[nextIndex];

                // d. Update the rotation state
                const { error: updateStateError } = await supabase
                    .from('etat_rotation')
                    .update({ valeur_id: linkToServe.id, date_mise_a_jour: now.toISOString() })
                    .eq('cle', 'lien_actuel_id');

                if (updateStateError) throw updateStateError;
            }

        } else {
            // NOT TIME TO ROTATE
            // Fetch the link that is currently supposed to be served
            const { data: currentLink, error: currentLinkError } = await supabase
                .from('liens_marketing')
                .select('id, url_destination')
                .eq('id', currentState.valeur_id)
                .single();
            
            if (currentLinkError) throw currentLinkError;
            linkToServe = currentLink;
        }

        // 3. Return the destination URL
        if (linkToServe && linkToServe.url_destination) {
            res.status(200).json({ destinationUrl: linkToServe.url_destination });

            // 4. Asynchronously track the click event
            await supabase.from('evenements_tracking').insert([{ type_evenement: 'clic_lien', lien_id: linkToServe.id }]);
            await supabase.rpc('increment_click_count', { link_id_to_update: linkToServe.id }); // Assuming a stored procedure for performance

        } else {
            // Fallback URL if no links are configured
            res.status(404).json({ destinationUrl: 'https://gracedesalpes.com/fallback' });
        }

    } catch (error) {
        console.error('Error getting current link:', error);
        res.status(500).json({ message: 'Failed to get current link', error: error.message });
    }
};

module.exports = {
    getCurrentLink,
};