const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');

const createInvitation = async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phoneNumber,
        countryId,
        cityId,
        sessionIds,
    } = req.body;

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
                selected_dates: [],
            });
        });

        await Promise.all(sessionInsertPromises);

        const { error: historyError } = await supabase
            .from('registration_history')
            .insert([{
                invitation_id: invitationId,
                action: 'created',
                details: { sessionIds: sessionIds },
            }]);

        if (historyError) {
            console.error('Could not log registration history:', historyError);
        }

        const { data: sessionDetails, error: sessionDetailsError } = await supabase
            .from('sessions')
            .select(`id, title, address, start_time, end_time, language`)
            .in('id', sessionIds);

        if (sessionDetailsError) {
            console.error("Error fetching session details for email:", sessionDetailsError);
            throw sessionDetailsError;
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
                    date: new Date(session.start_time).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Montreal' }),
                    startTime: new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montreal' }),
                    endTime: new Date(session.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montreal' }),
                });
            });
        }

        const subject =
            "Participation Confirmation / Confirmation de votre participation";

        let emailContentEn = `
        
        <p>Dear ${firstName},</p>
<p>We are delighted that you are participating in our New Generation Entrepreneurship Training.</p>
<p>This session will transform your vision of entrepreneurship and offer you new opportunities for lasting success.</p>`;
        Object.values(sessionsForEmail).forEach(session => {
            emailContentEn += `<p>Session Details:</p><ul style="list-style-type: none; padding-left: 0;">`;
            session.details.forEach(detail => {
                emailContentEn += `
                    <li>&#8226; Title: ${session.title}</li>
                    <li>&#8226; Address: ${session.locationEn}</li>
                    <li>&#8226; Date: ${detail.date}</li>
                    <li>&#8226; Time: From ${detail.startTime} to ${detail.endTime}</li>
                    <li>&#8226; Language: ${session.language}</li>
                `;
            });
            emailContentEn += `</ul>`;
        });
        emailContentEn += `<p>We encourage you to arrive 5 to 10 minutes before the start of the training.</p>
<p>The training lasts 3 hours and will be punctuated by wonderful surprises.</p>
<p>There is no charge to participate in this masterclass. At the end, if you are satisfied and convinced, it will be at your discretion to make a payment.</p>
<p>We look forward to welcoming you soon!</p>
<p>The Administrative Staff</p>`;

        let emailContentFr = `<p>Cher ${firstName},</p>
<p>Nous sommes ravis de votre participation à notre formation en entrepreneuriat de nouvelle génération.</p>
<p>Cette session transformera votre vision de l'entrepreneuriat et vous offrira de nouvelles opportunités de succès durable.</p>`;
        Object.values(sessionsForEmail).forEach(session => {
            emailContentFr += `<p>Détails de la session :</p><ul style="list-style-type: none; padding-left: 0;">`;
            session.details.forEach(detail => {
                emailContentFr += `
                    <li>&#8226; Title: ${session.title}</li>
                    <li>&#8226; Adresse : ${session.location}</li>
                    <li>&#8226; Date : ${detail.date}</li>
                    <li>&#8226; Heure : De ${detail.startTime} à ${detail.endTime}</li>
                    <li>&#8226; Langue: ${session.language}</li>
                `;
            });
            emailContentFr += `</ul>`;
        });
        emailContentFr += `<p>Nous vous encourageons à arriver 5 à 10 minutes avant le début de la formation.</p>
<p>La formation dure 3 heures et sera ponctuée de belles surprises.</p>
<p>Vous n'avez rien à payer pour participer à cette masterclass. À la fin, si vous êtes satisfait et convaincu, ça sera à votre discrétion de faire un paiement.</p>
<p>Nous avons hâte de vous recevoir bientôt !</p>
<p>Le Corps Administratif</p>`;

        const fullHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Registration Confirmation / Confirmation de votre inscription </h1>
                </div>
                <div style="padding: 30px;">
                    <p>LA VERSION FRANCAISE SUIT CI-DESSOUS,</p>
                    <br/>
                    ${emailContentEn}
                    <hr style="margin: 30px 0;"/>
                    ${emailContentFr}
                </div>
                <div style="background-color: #f4f4f4; color: #888; padding: 15px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">This is an automated email, please do not reply. / Ceci est un e-mail automatique, veuillez ne pas y répondre.</p>
                </div>
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

const getStats = async (req, res) => {
    try {
        const { count: totalInvitations, error: totalError } = await supabase
            .from('invitations')
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        const { count: confirmedInvitations, error: confirmedError } = await supabase
            .from('invitations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'confirmed');

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
        const { type, value } = req.query;

        let query = supabase
            .from("invitations")
            .select("created_at");

        if (type === 'year' && value) {
            query = query.gte('created_at', `${value}-01-01T00:00:00Z`).lte('created_at', `${value}-12-31T23:59:59Z`);
        } else if (type === 'month' && value) {
            query = query.gte('created_at', `${value}-01T00:00:00Z`).lte('created_at', `${value}-31T23:59:59Z`);
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
                period = dateObj.toISOString().split('T')[0];
            }
            
            acc[period] = (acc[period] || 0) + 1;
            return acc;
        }, {});

        const result = Object.entries(countsByPeriod).map(([period, count]) => ({ date: period, count }));
        
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
            .select(`id, title, address, language, start_time, end_time`);

        if (sessionsError) throw sessionsError;

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

module.exports = {
    createInvitation,
    getStats,
    getStatsByDate,
    listAllInvitations,
};
