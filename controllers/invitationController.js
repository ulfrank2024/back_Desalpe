const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');

const createInvitation = async (req, res) => {
    // ... createInvitation function ...
};

const getStats = async (req, res) => {
    try {
        // Fetch total invitations
        const { count: totalInvitations, error: totalError } = await supabase
            .from('invitations')
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Fetch confirmed invitations (assuming a 'status' column in 'invitations' table)
        // You might need to adjust the column name and value based on your schema
        const { count: confirmedInvitations, error: confirmedError } = await supabase
            .from('invitations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'confirmed'); // Adjust 'status' and 'confirmed' as per your DB schema

        if (confirmedError) throw confirmedError;

        res.status(200).json({
            total: totalInvitations,
            confirmed: confirmedInvitations,
        });

    } catch (error) {
        console.error('Error fetching overall invitation stats:', error);
        res.status(500).json({ message: 'Failed to fetch overall invitation stats', error: error.message });
    }
};

const getStatsByDate = async (req, res) => {
    try {
        const { type, value } = req.query; // Get filter type and value from query parameters

        let query = supabase
            .from("invitations")
            .select("created_at");

        // Apply filtering based on type and value
        if (type === 'year' && value) {
            query = query.gte('created_at', `${value}-01-01T00:00:00Z`).lte('created_at', `${value}-12-31T23:59:59Z`);
        } else if (type === 'month' && value) {
            // value format: YYYY-MM
            query = query.gte('created_at', `${value}-01T00:00:00Z`).lte('created_at', `${value}-31T23:59:59Z`); // Max 31, will be adjusted by DB
        }

        query = query.order('created_at', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        const countsByPeriod = data.reduce((acc, invitation) => {
            let period;
            const dateObj = new Date(invitation.created_at);

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

        const result = Object.entries(countsByPeriod).map(([period, count]) => ({ date: period, count }));

        // --- DEBUGGING ---
        console.log(
            "--- DEBUG: Response from /api/invitations/stats/by-date ---"
        );
        console.log("Is result an array?", Array.isArray(result));
        console.log("Data being sent:", JSON.stringify(result, null, 2));
        console.log(
            "----------------------------------------------------------"
        );
        // --- END DEBUGGING ---

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching invitations by date:', error);
        res.status(500).json({ message: 'Failed to fetch invitations by date', error: error.message });
    }
};

const listAllInvitations = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('invitations')
            .select(`*`);

        if (error) throw error;

        const { data: allInvitationSessions, error: invitationSessionsError } = await supabase
            .from('invitation_sessions')
            .select('*');

        if (invitationSessionsError) throw invitationSessionsError;

        const { data: allSessions, error: sessionsError } = await supabase
            .from('sessions')
           
                .select(`
                id, title, address, start_time, end_time, language
            `)
            

        if (sessionsError) throw sessionsError;

        console.log("Backend: All Sessions fetched:", JSON.stringify(allSessions, null, 2)); // NEW LOG

        // Transform the data to a more flat structure for the frontend
        const transformedData = data.map(invitation => {
            const userInvitationSessions = allInvitationSessions.filter(invSession => invSession.invitation_id === invitation.id);
            return {
                ...invitation,
                sessions: userInvitationSessions.map(invSession => {
                    const sessionDetails = allSessions.find(s => s.id === invSession.session_id);
                    if (sessionDetails) {
                        return {
                            id: sessionDetails.id,
                            title: sessionDetails.title,
                            address: sessionDetails.address,
                            language: sessionDetails.language,
                            start_time: sessionDetails.start_time,
                            end_time: sessionDetails.end_time,
                            selected_dates: invSession.selected_dates,
                        };
                    } else {
                        return null;
                    }
                }).filter(Boolean)
            };
        });
 
        res.status(200).json(transformedData);
    } catch (error) {
        console.error('Error listing all invitations:', error);
        res.status(500).json({ message: 'Failed to list all invitations', error: error.message });
    }
};

// I need to re-paste the full createInvitation function here because I am overwriting the file.
const fullCreateInvitation = async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phoneNumber,
        countryId,
        cityId,
        sessionIds,
    } = req.body;

    console.log('Received phoneNumber in backend:', phoneNumber); // NEW LOG
    console.log('Data to be inserted into invitations table:', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phoneNumber,
        country_id: countryId,
        city_id: cityId,
        status: 'pending',
    });

    if (!firstName || !lastName || !email || !sessionIds || sessionIds.length === 0) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const { data: invitation, error: invitationError } = await supabase
            .from('invitations')
            .insert([{
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone_number: phoneNumber,
                country_id: countryId,
                city_id: cityId,
                status: 'pending',
            }])
            .select('id')
            .single();

        if (invitationError) throw invitationError;
        const invitationId = invitation.id;

        const sessionInsertPromises = sessionIds.map(sessionId => {
            return supabase.from('invitation_sessions').insert({
                invitation_id: invitationId,
                session_id: sessionId,
                selected_dates: [], // Assuming empty array if no specific dates are selected
            });
        });

        await Promise.all(sessionInsertPromises);

        const { error: historyError } = await supabase
            .from('registration_history')
            .insert([{
                invitation_id: invitationId,
                action: 'created',
                details: {
                sessionIds: sessionIds,
            },
            }]);

        if (historyError) {
            console.error('Could not log registration history:', historyError);
        }

        const { data: sessionDetails, error: sessionDetailsError } =
            await supabase
                .from("sessions")
                .select(`id, title, address, start_time, end_time, language`
                )
                .in("id", sessionIds);

        if (sessionDetailsError) {
            console.error("Error fetching session details for email:", sessionDetailsError);
        }

        const sessionsForEmail = {};
        if (sessionDetails) {
            sessionDetails.forEach(session => {
                if (!sessionsForEmail[session.id]) {
                    sessionsForEmail[session.id] = {
                        title: session.title,
                        location: session.address,
                        locationEn: session.address,
                        language: session.language,
                        details: [],
                    };
                }
                sessionsForEmail[session.id].details.push({
                    date: new Date(session.start_time).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    startTime: new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    endTime: new Date(session.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                });
            });
        }

        let emailContentEn = `
            <p>LA VERSION FRANCAISE SUIT CI-DESSOUS,</p>
            <p>Dear ${firstName},</p>
            <p>It is with immense pleasure that we acknowledge your intention to participate in our new generation entrepreneurship training.</p>
            <p>This training will certainly revolutionize your perception of entrepreneurship and offer you new perspectives for sustainable prosperity and enrichment.</p>
        `;

        Object.values(sessionsForEmail).forEach(session => {
            emailContentEn += `<p>For the session in <strong>${session.locationEn}</strong> (${session.language}), you will be warmly welcomed on the following dates:</p>`;
            emailContentEn += `<ul style="list-style-type: none; padding-left: 0;">`;
            session.details.forEach(detail => {
                emailContentEn += `<li><strong style="color: #0056b3;">${detail.date}, from ${detail.startTime} to ${detail.endTime}</strong></li>`;
            });
            emailContentEn += `</ul>`;
        });

        emailContentEn += `
            <p>We kindly ask you to arrive at the training location 10 to 5 minutes beforehand, if possible.</p>
            <p>The training lasts 3 hours and includes wonderful gift surprises.</p>
            <p>You have absolutely no obligation to pay to attend this masterclass training. If you are satisfied and convinced at the end of the training, it is your choice whether or not to pay.</p>
            <p>We look forward to welcoming you. See you soon! </p>
            <p>The Administrative Staff</p>
            <p>--</p>
            <br/>
        `;

        let emailContentFr = `
            <p>Cher ${firstName},</p>
            <p>C'est avec un immense plaisir que nous prenons note de votre intention de participer à notre formation en entrepreneuriat de nouvelle génération.</p>
            <p>Cette formation va certainement révolutionner votre perception de l'entrepreneuriat et vous offrir de nouvelles perspectives de prospérité et d'enrichissement durables.</p>
        `;

        Object.values(sessionsForEmail).forEach(session => {
            emailContentFr += `<p>Pour la session à <strong>${session.location}</strong> (${session.language}), vous serez chaleureusement accueilli aux dates suivantes :</p>`;
            emailContentFr += `<ul style="list-style-type: none; padding-left: 0;">`;
            session.details.forEach(detail => {
                emailContentFr += `<li><strong style="color: #0056b3;">${detail.date}, de ${detail.startTime} à ${detail.endTime}</strong></li>`;
            });
            emailContentFr += `</ul>`;
        });

        emailContentFr += `
            <p>Nous prions autant que cela soit possible pour vous de vous présenter au lieu de la formation 10 à 5mn avant.</p>
            <p>La formation dure 3 heures et se ponctue par de belles surprises cadeaux.</p>
            <p>Vous n'avez absolument rien à payer pour bénéficier de cette formation express master classe. Si à la fin de la formation vous êtes satisfait et convaincu, ça sera votre libre choix de faire un paiement ou pas.</p>
            <p>Nous avons hâte de vous recevoir, à bientôt ! </p>
            <p>Le Corps Administratif</p>
            <p>--</p>
        `;

        const fullHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                ${emailContentEn}
                <hr/>
                ${emailContentFr}
            </div>
        `;

        await sendEmail(email, subject, null , fullHtmlContent);

        res.status(201).json({
            message: 'Invitation created successfully!',
            invitationId: invitationId,
        });

    } catch (error) {
        console.error('Error creating invitation:', error);
        res.status(500).json({ message: 'Failed to create invitation', error: error.message });
    }
};

module.exports = {
    createInvitation: fullCreateInvitation,
    getStats,
    getStatsByDate,
    listAllInvitations,
};