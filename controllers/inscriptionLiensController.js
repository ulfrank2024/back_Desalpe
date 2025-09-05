const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');

const getAllLinks = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .select('*')
            .order('date_creation', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch links', error: error.message });
    }
};

const createLink = async (req, res) => {
    const {
        type_lien,
        url_destination,
        code_court,
        ambassadeur_prenom,
        ambassadeur_nom,
        ambassadeur_email,
        valide_jusqu_a
    } = req.body;

    if (!url_destination || !code_court || !type_lien) {
        return res.status(400).json({ message: 'Link type, destination URL and short code are required.' });
    }

    // Convert empty string to null for valide_jusqu_a
    const final_valide_jusqu_a = (valide_jusqu_a === '') ? null : valide_jusqu_a;

    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .insert([{
                type_lien,
                url_destination,
                code_court,
                ambassadeur_prenom,
                ambassadeur_nom,
                ambassadeur_email,
                valide_jusqu_a: final_valide_jusqu_a // Use the processed value
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Link created successfully', data: data[0] });
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation for short_code
            return res.status(409).json({ message: 'This short code is already in use.' });
        }
        res.status(500).json({ message: 'Failed to create link', error: error.message });
    }
};

const updateLink = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const { data, error } = await supabase
            .from('liens_marketing')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Link not found' });

        res.status(200).json({ message: 'Link updated successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update link', error: error.message });
    }
};

const deleteLink = async (req, res) => {
    const { id } = req.params;

    try {
        // Étape 1: Marquer le lien comme supprimé
        const { data: linkData, error: deleteError } = await supabase
            .from('liens_marketing')
            .update({ est_supprime: true, date_suppression: new Date().toISOString(), est_actif: false })
            .eq('id', id)
            .select()
            .single(); // .single() pour s'assurer qu'on a bien un seul objet

        if (deleteError) throw deleteError;
        if (!linkData) return res.status(404).json({ message: 'Link not found' });

        // Étape 2: Envoyer l'e-mail de rapport final
        try {
            const { ambassadeur_prenom, ambassadeur_email, nombre_clics, date_creation } = linkData;
            
            if (ambassadeur_email) { // N'envoyer que si l'email existe
                const startDate = new Date(date_creation).toLocaleDateString('fr-FR');
                const subject = " Deactivation notice / Avis de désactivation";

                const emailContentEn = `
                    <p>Dearest ${ambassadeur_prenom},</p>
                    <p>Your referral link has been deactivated. Here is the final performance report.</p>
                    <p>From ${startDate} to now, you have received ${nombre_clics || 0} clicks to join your team.</p>
                    <p>Thank you for your contribution.</p>
                `;

                const emailContentFr = `
                    <p>Très Cher(e) ${ambassadeur_prenom},</p>
                    <p>Votre lien de parrainage a été désactivé. Voici le rapport de performance final.</p>
                    <p>Du ${startDate} à maintenant, vous avez obtenu ${nombre_clics || 0} clics pour rejoindre votre équipe.</p>
                    <p>Merci pour votre contribution.</p>
                `;

                const fullHtmlContent = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                        <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">Deactivation / Désactivation</h1>
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

                await sendEmail(ambassadeur_email, subject, null, fullHtmlContent);
            }
        } catch (emailError) {
            // Ne pas bloquer la réponse même si l'email échoue. Logguer l'erreur côté serveur.
            console.error(`Échec de l'envoi de l'email de rapport pour le lien ${id}, mais le lien a bien été supprimé.`, emailError);
        }

        res.status(200).json({ message: 'Link deleted successfully and final report sent.' });

    } catch (error) {
        res.status(500).json({ message: 'Failed to delete link', error: error.message });
    }
};

const restoreLink = async (req, res) => {
    const { id } = req.params;
    const { valide_jusqu_a } = req.body; // For custom links
    console.log(`--- DEBUG: Appel de la fonction restoreLink pour l'ID: ${id} ---`); // Nouveau log

    try {
        let updateData = {
            est_supprime: false,
            est_actif: true,
            date_suppression: null // Clear deletion date
        };

        // If valide_jusqu_a is provided, it's a custom link restoration
        if (valide_jusqu_a !== undefined && valide_jusqu_a !== null) {
            updateData.valide_jusqu_a = new Date(valide_jusqu_a).toISOString();
        }

        const { data, error } = await supabase
            .from('liens_marketing')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Link not found' });

        res.status(200).json({ message: 'Link restored successfully', data: data[0] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to restore link', error: error.message });
    }
};

const sendReportEmail = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: link, error: fetchError } = await supabase
            .from('liens_marketing')
            .select('ambassadeur_prenom, ambassadeur_email, nombre_clics, date_creation')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!link) return res.status(404).json({ message: 'Link not found' });

        const { ambassadeur_prenom, ambassadeur_email, nombre_clics, date_creation } = link;
        const startDate = new Date(date_creation).toLocaleDateString('fr-FR'); // Format date for email

        const subject =
            "Your Link Performance Report / Votre Rapport de Performance de Lien";

        const emailContentFr = `
            <p>Très Cher(e) ${ambassadeur_prenom},</p>
            <p>Merci de faire confiance à notre outil d'inscription automatisé sur les réseaux sociaux. Par la même occasion vous contribuez financièrement aux opérations de croissance de notre merveilleuse équipe la Grace Team. Merci!</p>
            <p>Du ${startDate} à maintenant, vous avez obtenu ${nombre_clics} clics pour rejoindre votre équipe.</p>
            <p>Consultez régulièrement vos "direct referrals" dans votre compte DesAlpes afin d'apporter un bon accueil et un accompagnement bienveillant à toutes ces personnes qui rejoignent votre équipe.</p>
            <p>Ci-dessous une suggestion de courriel d'accueil à leur envoyer systématiquement : "Cher(e) (son prénom), je vous souhaite la bienvenue dans la communauté mondiale d'affaires DesAlpes. Je suis la personne désignée pour vous accueillir et je me rend totalement disponible pour vous assister, vous accompagner et faciliter au maximum votre processus d'enrichissement dans notre communauté. Je vous laisse mon courriel et mon numéro de téléphone. Sentez-vous libre de me contacter pour quoi que ce soit, à tout moment. Merci."
        `;

        const emailContentEn = `
            <p>Dearest ${ambassadeur_prenom},</p>
            <p>Thank you for trusting our automated social media registration tool. At the same time, you are financially contributing to the growth of our wonderful Grace Team. Thank you!</p>
            <p>From ${startDate} to now, you have received ${nombre_clics} clicks to join your team.</p>
            <p>Regularly check your "direct referrals" in your DesAlpes account to provide a warm welcome and kind support to all those who join your team.</p>
            <p>Below is a suggested welcome email to send them systematically: "Dear (first name), I welcome you to the DesAlpes global business community. I am the designated person to welcome you and I am fully available to assist you, support you, and facilitate your enrichment process in our community as much as possible. I leave you my email address and phone number. Feel free to contact me for anything, at any time. Thank you."
        `;

        const fullHtmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #254c07; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Performance Report / Rapport de Performance</h1>
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

        await sendEmail(ambassadeur_email, subject, null, fullHtmlContent);

        res.status(200).json({ message: 'Report email sent successfully' });

    } catch (error) {
        console.error('Error sending report email:', error);
        res.status(500).json({ message: 'Failed to send report email', error: error.message });
    }
};

module.exports = {
    getAllLinks,
    createLink,
    updateLink,
    deleteLink,
    restoreLink,
    sendReportEmail,
};