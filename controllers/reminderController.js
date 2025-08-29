const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');

const sendUpcomingReminders = async (req, res) => {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
        const { data: upcomingSessions, error: sessionsError } = await supabase
            .from('sessions')
            .select(`id, title, address, language, start_time, end_time`)
            .gte('start_time', now.toISOString())
            .lte('start_time', twentyFourHoursLater.toISOString());

        if (sessionsError) {
            console.error("[Reminder] Error fetching upcoming sessions:", sessionsError);
            return res.status(500).json({ message: "Error fetching upcoming sessions." });
        }

        if (upcomingSessions.length === 0) {
            return res.status(200).json({ message: "No upcoming sessions found for reminders." });
        }

        let emailsSentCount = 0;

        for (const session of upcomingSessions) {
            const { data: invitationSessions, error: invSessionsError } = await supabase
                .from('invitation_sessions')
                .select(`invitation_id, invitations (id, first_name, email, reminder_sent_at)`)
                .eq('session_id', session.id);

            if (invSessionsError) {
                console.error(`[Reminder] Error fetching invitations for session ${session.id}:`, invSessionsError);
                continue;
            }

            for (const invSession of invitationSessions) {
                const user = invSession.invitations;
                if (!user) continue;

                const lastReminderSent = user.reminder_sent_at ? new Date(user.reminder_sent_at) : null;
                const shouldSendReminder = !lastReminderSent || (now.getTime() - lastReminderSent.getTime() > 24 * 60 * 60 * 1000);

                if (shouldSendReminder) {
                    const subject = `Reminder about your upcoming training / Rappel concernant votre formation imminente `;

                    // --- Date and Time Formatting ---
                    const frenchDate = new Date(session.start_time).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Montreal' });
                    const frenchStartTime = new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montreal' });
                    const frenchEndTime = new Date(session.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montreal' });

                    const englishDate = new Date(session.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Montreal' });
                    const englishStartTime = new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montreal' });
                    const englishEndTime = new Date(session.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montreal' });

                    // --- English Email Content ---
                    const reminderEn = `
                        <p>Dear ${user.first_name},</p>
                        <p>We are delighted to remind you of your New Generation Entrepreneurship Training Session.</p>
                        <p>Session Details:</p>
                        <ul style="list-style-type: none; padding-left: 0;">
                            <li>&#8226; Title: ${session.title}</li>
                            <li>&#8226; Address: ${session.address}</li>
                            <li>&#8226; Date: ${englishDate}</li>
                            <li>&#8226; Time: From ${englishStartTime} to ${englishEndTime}</li>
                            <li>&#8226; Language: ${session.language}</li>
                        </ul>
                        <p>Please arrive 5 to 10 minutes before the training begins.</p>
                        <p>We look forward to welcoming you!</p>
                        <p>The Administrative Staff</p>
                    `;

                    // --- French Email Content ---
                    const reminderFr = `
                        <p>Cher ${user.first_name},</p>
                        <p>Nous sommes ravis de vous rappeler votre session de formation en entrepreneuriat de nouvelle génération.</p>
                        <p>Détails de la session :</p>
                        <ul style="list-style-type: none; padding-left: 0;">
                            <li>&#8226; Titre : ${session.title}</li>
                            <li>&#8226; Adresse : ${session.address}</li>
                            <li>&#8226; Date : ${frenchDate}</li>
                            <li>&#8226; Heure : De ${frenchStartTime} à ${frenchEndTime}</li>
                            <li>&#8226; Langue: ${session.language}</li>
                        </ul>
                        <p>Nous vous prions de bien vouloir arriver 5 à 10 minutes avant le début de la formation.</p>
                        <p>Au plaisir de vous accueillir !</p>
                        <p>Le Corps Administratif</p>
                    `;

                    // --- Final HTML ---
                    const emailContent = `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                            <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                                <h1 style="margin: 0; font-size: 24px;"> Reminder / Rappel</h1>
                            </div>
                            <div style="padding: 30px;">
                            <p>LA VERSION FRANCAISE SUIT CI-DESSOUS,</p>
                            <br/>
                                ${reminderEn}
                                <hr style="margin: 30px 0;"/>
                                ${reminderFr}
                            </div>
                            <div style="background-color: #f4f4f4; color: #888; padding: 15px; text-align: center; font-size: 12px;">
                                <p style="margin: 0;">This is an automated email, please do not reply. / Ceci est un e-mail automatique, veuillez ne pas y répondre.</p>
                            </div>
                        </div>
                    `;

                    try {
                        await sendEmail(user.email, subject, null, emailContent);
                        emailsSentCount++;
                        
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