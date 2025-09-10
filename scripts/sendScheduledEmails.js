const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');
require('dotenv').config();

const sendScheduledEmails = async () => {
    console.log('Démarrage de l\'envoi des e-mails planifiés...');

    try {
        // 1. Récupérer les e-mails planifiés dont la date d'envoi est passée et le statut est PENDING
        const { data: emailsToSend, error: fetchError } = await supabase
            .from('scheduled_emails')
            .select(`
                id,
                prospect_id,
                send_at,
                email_type,
                prospects ( 
                    prenom,
                    email
                )
            `)
            .eq('status', 'PENDING')
            .lte('send_at', new Date().toISOString());

        if (fetchError) throw fetchError;

        if (emailsToSend.length === 0) {
            console.log('Aucun e-mail planifié à envoyer pour le moment.');
            return;
        }

        console.log(`${emailsToSend.length} e-mail(s) planifié(s) trouvé(s) à envoyer.`);

        // 2. Envoyer chaque e-mail
        for (const emailEntry of emailsToSend) {
            const { id: emailEntryId, prospect_id, email_type, prospects } = emailEntry;

            if (!prospects || !prospects.email) {
                console.error(`E-mail planifié ${emailEntryId}: Prospect introuvable ou email manquant.`);
                await supabase.from('scheduled_emails').update({ status: 'FAILED', error_message: 'Prospect introuvable ou email manquant' }).eq('id', emailEntryId);
                continue;
            }

            const { prenom: firstName, email: recipientEmail } = prospects;

            let subject = '';
            let emailContentEn = '';
            let emailContentFr = '';
            let linktreeUrl ="https://www.gracedesalpesinvite.ca/ClientStatusPage"; // Lien fourni par l'utilisateur

            switch (email_type) {
                case 'FOLLOW_UP_3_DAYS':
                    subject = 'Your Progress with DesAlpes / Votre Progrès avec DesAlpes';
                    emailContentEn = `
                        <p>Dear ${firstName},</p>
                        <p>This is an automated follow-up email to learn how far you've progressed in your choice of prosperity with the DesAlpes worldwide business community.</p>
                        <p>Click here, then select the option that best suits your situation:</p>
                        <p><a href="${linktreeUrl}">Click here to choose your option</a></p>
                        <p>(3 choices on the Linktree page)</p>
                        <ul>
                            <li>Yes, I registered and made my one-time payment.</li>
                            <li>I registered, but haven't made a payment yet.</li>
                            <li>No, I'm no longer interested.</li>
                        </ul>
                        <p>We respect your choice, thank you.</p>
                        <p>If you would like to receive more information or specific support, please write to us at info@gracedesalpes.ca</p>
                        <p>Our sincere sympathy.</p>
                    `;
                    emailContentFr = `
                        <p>Très cher(e) ${firstName},</p>
                        <p>Ceci est un courriel automatisé de suivi, dans le but de savoir jusqu'où vous vous êtes avancé dans votre choix de prospérité avec la communauté mondiale d'affaires DesAlpes.</p>
                        <p>Cliquez ici, puis sélectionnez l'option qui correspond le mieux à votre situation:</p>
                        <p><a href="${linktreeUrl}">Cliquez ici pour choisir votre option</a></p>
                        <p>(3 choix dans la page linktree)</p>
                        <ul>
                            <li>Oui, je me suis inscrit et j'ai fait mon paiement unique.</li>
                            <li>Je me suis inscrit, mais sans faire de paiement encore.</li>
                            <li>Non, je ne suis plus intéressé.</li>
                        </ul>
                        <p>Nous respectons votre choix et vous remercions.</p>
                        <p>Si vous souhaitez recevoir plus d'informations ou un accompagnement particulier, prière de nous écrire à info@gracedesalpes.ca</p>
                        <p>Toute notre sympathie.</p>
                    `;
                    break;
                default:
                    console.warn(`E-mail planifié ${emailEntryId}: Type d'e-mail inconnu ${email_type}.`);
                    await supabase.from('scheduled_emails').update({ status: 'FAILED', error_message: `Type d'e-mail inconnu: ${email_type}` }).eq('id', emailEntryId);
                    continue;
            }

            const fullHtmlContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Follow-up / Suivi</h1>
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

            try {
                await sendEmail(recipientEmail, subject, null, fullHtmlContent);
                await supabase.from('scheduled_emails').update({ status: 'SENT', sent_at: new Date().toISOString() }).eq('id', emailEntryId);
                console.log(`E-mail de suivi envoyé à ${recipientEmail} (ID: ${emailEntryId}).`);
            } catch (emailError) {
                console.error(`Échec de l'envoi de l'e-mail de suivi à ${recipientEmail} (ID: ${emailEntryId}):`, emailError);
                await supabase.from('scheduled_emails').update({ status: 'FAILED', error_message: emailError.message }).eq('id', emailEntryId);
            }
        }

        console.log('Envoi des e-mails planifiés terminé.');
    } catch (error) {
        console.error('Erreur lors de l\'envoi des e-mails planifiés:', error);
    }

    process.exit(0);
};

sendScheduledEmails();
