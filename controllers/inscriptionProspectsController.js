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

        // Step 2: Record the form submission event
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

        // Step 3: Send the welcome email
        const subject = 'Bienvenue / Welcome';
        const designatedEmail = process.env.EMAIL_USER;

        const emailContentEn = `
            <p>Dear ${firstName},</p>
            <p>I welcome you to the DesAlpes global business community. I am the designated person and I am fully available to assist you, support you, and facilitate your enrichment process as much as possible.</p>
            <p>I leave you my email address, not my phone number. Feel free to contact me for anything at any time: ${designatedEmail}</p>
            <p>Thank you.</p>
        `;

        const emailContentFr = `
            <p>Cher(e) ${firstName},</p>
            <p>je vous souhaite la bienvenue dans la communauté mondiale d'affaires DesAlpes. Je suis la personne désignée et je me rend totalement disponible pour vous assister, vous accompagner et faciliter au maximum votre processus d'enrichissement.</p>
            <p>Je vous laisse mon courriel et non numéro de téléphone. Sentez-vous libre de me contacter pour quoi que ce soit à tout moment : ${designatedEmail}</p>
            <p>Merci.</p>
        `;

        const fullHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Bienvenue / Welcome</h1>
                </div>
                <div style="padding: 30px;">
                    <p>ENGLISH VERSION BELOW,</p>
                    <br/>
                    ${emailContentFr}
                    <hr style="margin: 30px 0;"/>
                    ${emailContentEn}
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

module.exports = {
    addProspect,
};