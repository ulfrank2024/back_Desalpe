const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');

const addProspect = async (req, res) => {
    const { firstName, name, email, pays, ville, phoneNumber } = req.body;

    if (!firstName || !name || !email) {
        return res.status(400).json({ message: 'First name, last name, and email are required.' });
    }

    try {
        // Step 1: Insert into prospects table
        const { data: prospectData, error: prospectError } = await supabase
            .from('prospects')
            .insert([{
                prenom: firstName,
                nom: name,
                email: email,
                telephone: phoneNumber,
                pays: pays,
                ville: ville,
            }])
            .select('id')
            .single();

        if (prospectError) throw prospectError;
        const prospectId = prospectData.id;

        // Step 2: Schedule the 3-day follow-up email
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const { error: scheduleError } = await supabase
            .from('scheduled_emails')
            .insert([
                {
                    prospect_id: prospectId,
                    send_at: threeDaysFromNow.toISOString(),
                    email_type: 'FOLLOW_UP_3_DAYS',
                }
            ]);

        if (scheduleError) {
            console.error('Could not schedule follow-up email:', scheduleError);
        }

        // Step 3: Record the form submission event
        const { error: eventError } = await supabase
            .from('evenements_tracking')
            .insert([{
                type_evenement: 'soumission_formulaire',
                prospect_id: prospectId,
            }]);

        if (eventError) {
            // Log the error but don't block the email from sending
            console.error('Could not log form submission event:', eventError);
        }

        // Step 4: Send the welcome email
        const subject = 'Welcome / Bienvenue';
        const designatedEmail = process.env.EMAIL_USER;

        const emailContentEn = `
            <p>Dear ${firstName},</p>
            <p>Thank you for your interest in a secure future of prosperity for you and others around you. This is our commitment to prosperity for all!</p>
            <p>We strongly encourage you to complete the entire process that will lead to your free membership as a member of the DesAlpes worldwide business community.</p>
            <p>When you choose, at your convenience, to make your one-time payment from your online member account, you become an active member, eligible to receive commissions from our business community, according to our generous compensation plan.</p>
            <p>No information from your credit or debit card used for payment is stored, as this is a one-time payment for life. Any other monthly payments will come from your member's profits, but never from your pocket.</p>
            <p>You now have your own invitation link, accessible and shareable from your online member account with your friends and family. We thank you for spreading the word about this community and contributing to the global growth of our community. You'll be amazed at the significant revenue associated with this ambassador role, when those who sign up using your invitation link, in turn, make the one-time payment.</p>
            <p><strong>Find below:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li style="margin-bottom: 15px;">&#8226; The link to the registration process if you haven't completed it (Please do not share it with others):<br/><a href="https://gracedesalpes.vercel.app/selection">https://gracedesalpes.vercel.app/selection</a></li>
                <li style="margin-bottom: 15px;">&#8226; The link to log in to your online member account with the email and password used in the last step of your membership (Preferably save it):<br/><a href="https://desalpes.world/login">https://desalpes.world/login</a></li>
                <li style="margin-bottom: 15px;">&#8226; The link to join a Telegram information group, to stay informed about solutions and new features that continually improve your income (highly recommended):<br/><a href="https://t.me/+zqiJbS7ZdgpmOTNh">https://t.me/+zqiJbS7ZdgpmOTNh</a></li>
            </ul>
            <p>Welcome to your prosperity.</p>
        `;

        const emailContentFr = `
            <p>Cher ${firstName},</p>
            <p>Nous vous remercions de l'intérêt que vous portez à un avenir certain de prospérité pour vous, ensuite pour votre entourage. C'est notre engagement de prospérité pour tous!</p>
            <p>Nous vous encourageons vivement à suivre tout le processus qui aboutira à votre adhésion gratuite comme membre de la communauté mondiale d'affaires DesAlpes.</p>
            <p>Quand vous choisissez, à votre convenance, d'effectuer votre paiement unique, à partir de votre compte en ligne de membre, vous devenez un membre actif, éligible à recevoir les commissions de notre communauté d'affaires selon notre plan généreux de rémunération.</p>
            <p>Aucune information de votre carte de credit ou débit utilisé pour le paiement n'est gardé car il s'agit d'un paiement unique à vie. Toute autre mensualité viendra de vos bénéfices reversés, mais plus jamais de vos poches.</p>
            <p>Vous possédez désormais votre propre lien d'invitation, accessible et partageable à partir de votre compte en ligne de membre à vos proches et connaissances. Nous vous remercions de faire connaître cette communauté autour de vous et de contribuer à la croissance mondiale de notre communauté. Vous allez être étonné de l'importance des revenus attachés à ce rôle d'ambassadeur, lorsque ceux qui s'inscrivent à partir de votre lien d'invitation, font à leur tour le paiement unique.</p>
            <p><strong>Trouvez ci-dessous:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li style="margin-bottom: 15px;">&#8226; Le lien du processus d'inscription si vous ne l'aviez pas complété (Ne le partager pas à d'autres svp):<br/><a href="https://gracedesalpes.vercel.app/selection">https://gracedesalpes.vercel.app/selection</a></li>
                <li style="margin-bottom: 15px;">&#8226; Le lien pour se connecter à votre compte en ligne de membre avec le courriel et le mot de passe utilisé à la dernière étape de votre adhésion (Enregistrez-le de préférence):<br/><a href="https://desalpes.world/login">https://desalpes.world/login</a></li>
                <li style="margin-bottom: 15px;">&#8226; Le lien d'intégration à un groupe telegram d'information, afin de rester informer des solutions et nouveautés qui améliorent continuellement vos revenus (très recommandé):<br/>
                    Groupe Telegram en français:<br/>
                    <a href="https://t.me/+TXJvWb87puZkYjZh">https://t.me/+TXJvWb87puZkYjZh</a><br/>
                    <a href="https://t.me/+eBhy-mjyq8IwZjc5">https://t.me/+eBhy-mjyq8IwZjc5</a>
                </li>
            </ul>
            <p>Bienvenue dans votre prospérité.</p>
        `;

        const fullHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Welcome / Bienvenue</h1>
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

        await sendEmail(email, subject, null, fullHtmlContent);

        res.status(201).json({ message: 'Prospect added and email sent successfully.', prospectId: prospectId });

    } catch (error) {
        console.error('Error in addProspect controller:', error);
        res.status(500).json({ message: 'Failed to process prospect submission.', error: error.message });
    }
};

const getAllProspects = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('prospects')
            .select('*')
            .order('date_soumission', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch prospects', error: error.message });
    }
};

const checkProspectExists = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email parameter is required.' });
    }

    try {
        const { data, error } = await supabase
            .from('prospects')
            .select('id')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            throw error;
        }

        res.status(200).json({ exists: !!data });

    } catch (error) {
        console.error('Error checking prospect existence:', error);
        res.status(500).json({ message: 'Failed to check prospect existence.', error: error.message });
    }
};

module.exports = {
    addProspect,
    getAllProspects,
    checkProspectExists,
};