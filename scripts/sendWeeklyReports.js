const supabase = require('../db/supabase');
const { sendEmail } = require('../services/emailService');
require('dotenv').config(); // Pour s'assurer que les variables d'environnement sont chargées

const sendWeeklyReports = async () => {
    console.log('Démarrage de l\'envoi des rapports hebdomadaires...');

    try {
        // 1. Récupérer tous les liens marketing actifs (non supprimés)
        const { data: activeLinks, error: fetchError } = await supabase
            .from('liens_marketing')
            .select('id, ambassadeur_prenom, ambassadeur_email, nombre_clics, date_creation, est_actif, est_supprime')
            .eq('est_actif', true)
            .eq('est_supprime', false);

        if (fetchError) throw fetchError;

        if (activeLinks.length === 0) {
            console.log('Aucun ambassadeur actif trouvé pour l\'envoi de rapports.');
            return;
        }

        console.log(`${activeLinks.length} ambassadeurs actifs trouvés. Envoi des rapports...`);

        // 2. Envoyer un rapport pour chaque lien actif
        for (const link of activeLinks) {
            const { id, ambassadeur_prenom, ambassadeur_email, nombre_clics, date_creation } = link;

            if (!ambassadeur_email) {
                console.warn(`Lien ${id}: Pas d'email d'ambassadeur, rapport non envoyé.`);
                continue;
            }

            try {
                const startDate = new Date(date_creation).toLocaleDateString('fr-FR');
                const subject = "Your Weekly Performance Report / Votre Rapport de Performance Hebdomadaire";

                const emailContentEn = `
                    <p>Dearest ${ambassadeur_prenom},</p>
                    <p>Thank you for trusting our automated social media registration tool. At the same time, you are financially contributing to the growth of our wonderful Grace Team. Thank you!</p>
                    <p>From ${startDate} to now, you have received ${nombre_clics || 0} clicks to join your team.</p>
                    <p>Regularly check your "direct referrals" in your DesAlpes account to provide a warm welcome and kind support to all those who join your team.</p>
                    <p>Below is a suggested welcome email to send them systematically: "Dear (first name), I welcome you to the DesAlpes global business community. I am the designated person to welcome you and I am fully available to assist you, support you, and facilitate your enrichment process in our community as much as possible. I leave you my email address and phone number. Feel free to contact me for anything, at any time. Thank you."
                `;

                const emailContentFr = `
                    <p>Très Cher(e) ${ambassadeur_prenom},</p>
                    <p>Merci de faire confiance à notre outil d'inscription automatisé sur les réseaux sociaux. Par la même occasion vous contribuez financièrement aux opérations de croissance de notre merveilleuse équipe la Grace Team. Merci!</p>
                    <p>Du ${startDate} à maintenant, vous avez obtenu ${nombre_clics || 0} clics pour rejoindre votre équipe.</p>
                    <p>Consultez régulièrement vos "direct referrals" dans votre compte DesAlpes afin d'apporter un bon accueil et un accompagnement bienveillant à toutes ces personnes qui rejoignent votre équipe.</p>
                    <p>Ci-dessous une suggestion de courriel d'accueil à leur envoyer systématiquement : <<Cher(e) (son prénom), je vous souhaite la bienvenue dans la communauté mondiale d'affaires DesAlpes. Je suis la personne désignée pour vous accueillir et je me rend totalement disponible pour vous assister, vous accompagner et faciliter au maximum votre processus d'enrichissement dans notre communauté. Je vous laisse mon courriel et mon numéro de téléphone. Sentez-vous libre de me contacter pour quoi que ce soit, à tout moment. Merci.>>
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
                console.log(`Rapport envoyé à ${ambassadeur_email} pour le lien ${id}.`);
            } catch (emailError) {
                console.error(`Échec de l'envoi de l'email de rapport pour le lien ${id} (${ambassadeur_email}):`, emailError);
            }
        }

        console.log('Envoi des rapports hebdomadaires terminé.');
    } catch (error) {
        console.error('Erreur lors de l\'envoi des rapports hebdomadaires:', error);
    }

    // Terminer le processus Node.js
    process.exit(0);
};

sendWeeklyReports();
