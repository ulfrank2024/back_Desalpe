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
            startDate.setDate(now.getDate() - now.getDay()); // Start of the current week (Sunday)
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // End of the current week (Saturday)
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of the month
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31); // Last day of the year
            break;
        default:
            return res.status(400).json({ message: 'Invalid timeFilter provided.' });
    }

    endDate.setHours(23, 59, 59, 999); // Set end date to end of day

    try {
        // Fetch all clicks within the period
        const { data: clicksData, error: clicksError } = await supabase
            .from('anonymous_clicks')
            .select('created_at, type_click')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (clicksError) throw clicksError;

        // Initialize stats
        let totalClicks = 0;
        let formsSubmitted = 0;
        const buttonClicks = { paid: 0, pending: 0, not_interested: 0 };
        const chartDataMap = new Map();

        // Prepare chart data structure based on timeFilter
        if (timeFilter === 'week') {
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                chartDataMap.set(date.toISOString().split('T')[0], { label: date.toLocaleDateString('fr-FR', { weekday: 'short' }), clicks: 0, forms: 0, paid: 0, pending: 0, not_interested: 0 });
            }
        } else if (timeFilter === 'month') {
            let currentWeekStart = new Date(startDate);
            let weekNum = 1;
            while (currentWeekStart <= endDate) {
                const weekEnd = new Date(currentWeekStart);
                weekEnd.setDate(currentWeekStart.getDate() + 6);
                chartDataMap.set(`Sem ${weekNum}`, { label: `Sem ${weekNum}`, clicks: 0, forms: 0, paid: 0, pending: 0, not_interested: 0 });
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                weekNum++;
            }
        } else if (timeFilter === 'year') {
            for (let i = 0; i < 12; i++) {
                const monthDate = new Date(now.getFullYear(), i, 1);
                chartDataMap.set(monthDate.getMonth().toString(), { label: monthDate.toLocaleDateString('fr-FR', { month: 'short' }), clicks: 0, forms: 0, paid: 0, pending: 0, not_interested: 0 });
            }
        }

        // Process clicks data
        clicksData.forEach(click => {
            totalClicks++;
            const clickDate = new Date(click.created_at);
            let periodKey;

            if (timeFilter === 'week') {
                periodKey = clickDate.toISOString().split('T')[0];
            } else if (timeFilter === 'month') {
                // Determine week number within the month
                const dayOfMonth = clickDate.getDate();
                const weekNumber = Math.ceil(dayOfMonth / 7);
                periodKey = `Sem ${weekNumber}`;
            } else if (timeFilter === 'year') {
                periodKey = clickDate.getMonth().toString();
            }

            const chartItem = chartDataMap.get(periodKey);
            if (chartItem) {
                chartItem.clicks++;
                if (click.type_click === 'form_submitted') {
                    formsSubmitted++;
                    chartItem.forms++;
                } else if (click.type_click === 'paid_button') {
                    buttonClicks.paid++;
                    chartItem.paid++;
                } else if (click.type_click === 'pending_button') {
                    buttonClicks.pending++;
                    chartItem.pending++;
                } else if (click.type_click === 'not_interested_button') {
                    buttonClicks.not_interested++;
                    chartItem.not_interested++;
                }
            }
        });

        const chartData = Array.from(chartDataMap.values());

        res.status(200).json({
            clicks: totalClicks,
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