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

const getGeneralStats = async (req, res) => {
    const { timeFilter } = req.query;
    let startDate, endDate;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (timeFilter) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Lundi comme premier jour
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            return res.status(400).json({ message: 'Invalid timeFilter provided.' });
    }

    endDate.setHours(23, 59, 59, 999);

    try {
        // On lit depuis la nouvelle table `click_events`
        const { data: clicksData, error: clicksError } = await supabase
            .from('click_events')
            .select('created_at, click_type')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (clicksError) throw clicksError;

        const buttonClicks = { paid: 0, pending: 0, not_interested: 0 };
        let formsSubmitted = 0;
        let invitationClicks = 0; // Pour CLIC_INVITATION

        const chartDataMap = new Map();

        // Initialisation de la structure du graphique
        if (timeFilter === 'week') {
            const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dayKey = date.toISOString().split('T')[0];
                chartDataMap.set(dayKey, { label: weekDays[i], clicks: 0, forms: 0, paid: 0, pending: 0, not_interested: 0 });
            }
        } else if (timeFilter === 'month') {
            const weekCount = Math.ceil(endDate.getDate() / 7);
            for (let i = 1; i <= weekCount; i++) {
                chartDataMap.set(`Sem ${i}`, { label: `Sem ${i}`, clicks: 0, forms: 0, paid: 0, pending: 0, not_interested: 0 });
            }
        } else if (timeFilter === 'year') {
            const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            for (let i = 0; i < 12; i++) {
                chartDataMap.set(i.toString(), { label: monthNames[i], clicks: 0, forms: 0, paid: 0, pending: 0, not_interested: 0 });
            }
        }

        // Traitement des données récupérées
        clicksData.forEach(click => {
            const clickDate = new Date(click.created_at);
            let periodKey;

            if (timeFilter === 'week') {
                periodKey = clickDate.toISOString().split('T')[0];
            } else if (timeFilter === 'month') {
                const weekNumber = Math.ceil(clickDate.getDate() / 7);
                periodKey = `Sem ${weekNumber}`;
            } else if (timeFilter === 'year') {
                periodKey = clickDate.getMonth().toString();
            }

            const chartItem = chartDataMap.get(periodKey);

            if (chartItem) {
                // On ne compte que les clics d'invitation dans le total du graphique
                if(click.click_type === 'CLIC_INVITATION') {
                    chartItem.clicks++;
                }

                switch (click.click_type) {
                    case 'FORMULAIRE_SOUMIS':
                        formsSubmitted++;
                        chartItem.forms++;
                        break;
                    case 'PAIEMENT_EFFECTUE':
                        buttonClicks.paid++;
                        chartItem.paid++;
                        break;
                    case 'PAIEMENT_EN_ATTENTE':
                        buttonClicks.pending++;
                        chartItem.pending++;
                        break;
                    case 'NON_INTERESSE':
                        buttonClicks.not_interested++;
                        chartItem.not_interested++;
                        break;
                    case 'CLIC_INVITATION':
                        invitationClicks++;
                        // Déjà compté dans chartItem.clicks
                        break;
                }
            }
        });

        const chartData = Array.from(chartDataMap.values());

        res.status(200).json({
            clicks: invitationClicks, // Clics "Nous rejoindre"
            formsSubmitted: formsSubmitted,
            buttonClicks: buttonClicks,
            data: chartData,
        });

    } catch (error) {
        console.error("Error in getGeneralStats:", error);
        res.status(500).json({ message: 'Failed to fetch general stats', error: error.message });
    }
};

module.exports = {
    recordInvitationConfirmationClick,
    getInvitationConfirmationClickCount,
    getAnonymousClicksByDate,
    getGeneralStats,
};