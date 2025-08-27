const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');

const sendUpcomingReminders = async (req, res) => {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log(`[Reminder] Checking for sessions starting between ${now.toISOString()} and ${twentyFourHoursLater.toISOString()}`);

    try {
        // 1. Find sessions starting in the next 24 hours that haven't had reminders sent yet (or sent long ago)
        const { data: upcomingSessions, error: sessionsError } = await supabase
            .from('sessions')
            .select(`
                id,
                title,
                address,
                language,
                start_time,
                end_time
            `)
            .gte('start_time', now.toISOString())
            .lte('start_time', twentyFourHoursLater.toISOString());

        if (sessionsError) {
            console.error("[Reminder] Error fetching upcoming sessions:", sessionsError);
            return res.status(500).json({ message: "Error fetching upcoming sessions." });
        }

        if (upcomingSessions.length === 0) {
            console.log("[Reminder] No upcoming sessions found for reminders.");
            return res.status(200).json({ message: "No upcoming sessions found for reminders." });
        }

        console.log(`[Reminder] Found ${upcomingSessions.length} upcoming sessions.`);

        let emailsSentCount = 0;

        for (const session of upcomingSessions) {
            // 2. Find users registered for this session
            const { data: invitationSessions, error: invSessionsError } = await supabase
                .from('invitation_sessions')
                .select(`
                    invitation_id,
                    invitations ( 
                        id,
                        first_name,
                        email,
                        reminder_sent_at 
                    )
                `)
                .eq('session_id', session.id);

            if (invSessionsError) {
                console.error(`[Reminder] Error fetching invitations for session ${session.id}:`, invSessionsError);
                continue; // Skip to next session
            }

            for (const invSession of invitationSessions) {
                const user = invSession.invitations; // Access the nested invitation object
                if (!user) continue; // Skip if invitation data is missing

                // 3. Check if reminder already sent for this session to this user
                // This logic assumes 'reminder_sent_at' is a timestamp on the 'invitations' table
                // and we only want to send once per session. A more robust solution might involve a separate reminder_log table.
                // For simplicity, let's assume we send if reminder_sent_at is null or older than 24 hours ago (to re-send if needed)
                const lastReminderSent = user.reminder_sent_at ? new Date(user.reminder_sent_at) : null;
                const shouldSendReminder = !lastReminderSent || (now.getTime() - lastReminderSent.getTime() > 24 * 60 * 60 * 1000); // Send if never sent or sent over 24h ago

                if (shouldSendReminder) {
                    // 4. Construct and send reminder email
                    const sessionStartTime = new Date(session.start_time);
                    const sessionEndTime = new Date(session.end_time);

                    const subject = `Rappel: Votre session de formation "${session.title}" commence bientôt !`;
                    const emailContent = `
                        <p>Bonjour ${user.first_name},</p>
                        <p>Ceci est un rappel amical que votre session de formation <strong>"${session.title}"</strong> est prévue pour bientôt !</p>
                        <p><strong>Détails de la session :</strong></p>
                        <ul>
                            <li><strong>Titre :</strong> ${session.title}</li>
                            <li><strong>Adresse :</strong> ${session.address}</li>
                            <li><strong>Date :</strong> ${sessionStartTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                            <li><strong>Heure :</strong> de ${sessionStartTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à ${sessionEndTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</li>
                        </ul>
                        <p>Veuillez vous assurer d'être prêt à l'heure. Nous avons hâte de vous y voir !</p>
                        <p>Cordialement,</p>
                        <p>L'équipe GraceDesalpe</p>
                    `;

                    try {
                        await sendEmail(user.email, subject, emailContent);
                        emailsSentCount++;
                        console.log(`[Reminder] Sent reminder to ${user.email} for session ${session.title}`);

                        // 5. Update reminder_sent_at timestamp for this invitation
                        // This requires 'reminder_sent_at' column on 'invitations' table
                        const { error: updateError } = await supabase
                            .from('invitations')
                            .update({ reminder_sent_at: new Date().toISOString() })
                            .eq('id', user.id);

                        if (updateError) {
                            console.error(`[Reminder] Error updating reminder_sent_at for invitation ${user.id}:`, updateError);
                        }
                    } catch (emailError) {
                        console.error(`[Reminder] Failed to send email to ${user.email}:`, emailError);
                    }
                }
            }
        }

        res.status(200).json({ message: `Reminder process completed. ${emailsSentCount} emails sent.`, sentCount: emailsSentCount });

    } catch (error) {
        console.error("[Reminder] Internal server error:", error);
        res.status(500).json({ message: "Internal server error during reminder process." });
    }
};

module.exports = {
    sendUpcomingReminders,
};