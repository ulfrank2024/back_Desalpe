const supabase = require('../db/supabase');
require('dotenv').config();

const deactivateExpiredLinks = async () => {
    console.log('Démarrage de la désactivation des liens expirés...');

    try {
        const now = new Date().toISOString();

        // 1. Récupérer les liens personnalisés actifs et non supprimés dont la date de validité est passée
        const { data: expiredLinks, error: fetchError } = await supabase
            .from('liens_marketing')
            .select('id, code_court, ambassadeur_email, valide_jusqu_a')
            .eq('type_lien', 'personnalise')
            .eq('est_actif', true)
            .eq('est_supprime', false)
            .lte('valide_jusqu_a', now);

        if (fetchError) throw fetchError;

        if (expiredLinks.length === 0) {
            console.log('Aucun lien personnalisé expiré trouvé.');
            return;
        }

        console.log(`${expiredLinks.length} lien(s) personnalisé(s) expiré(s) trouvé(s). Désactivation...`);

        // 2. Mettre à jour chaque lien expiré
        for (const link of expiredLinks) {
            try {
                const { error: updateError } = await supabase
                    .from('liens_marketing')
                    .update({ est_actif: false, est_supprime: true, date_suppression: now })
                    .eq('id', link.id);

                if (updateError) throw updateError;

                console.log(`Lien ${link.code_court} (ID: ${link.id}) désactivé et marqué comme supprimé.`);

                // Envoyer un email à l'ambassadeur pour l'informer de la désactivation
                try {
                    const startDate = new Date(link.date_creation).toLocaleDateString('fr-FR');
                    const subject = "Your Final Link Performance Report / Votre Rapport de Performance Final de Lien";

                    const emailContentEn = `
                        <p>Dearest ${link.ambassadeur_prenom},</p>
                        <p>Your referral link has been deactivated. Here is the final performance report.</p>
                        <p>From ${startDate} to now, you have received ${link.nombre_clics || 0} clicks to join your team.</p>
                        <p>Thank you for your contribution.</p>
                    `;

                    const emailContentFr = `
                        <p>Très Cher(e) ${link.ambassadeur_prenom},</p>
                        <p>Votre lien de parrainage a été désactivé. Voici le rapport de performance final.</p>
                        <p>Du ${startDate} à maintenant, vous avez obtenu ${link.nombre_clics || 0} clics pour rejoindre votre équipe.</p>
                        <p>Merci pour votre contribution.</p>
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

                    if (link.ambassadeur_email) {
                        await sendEmail(link.ambassadeur_email, subject, null, fullHtmlContent);
                        console.log(`Email de désactivation envoyé à ${link.ambassadeur_email}.`);
                    } else {
                        console.warn(`Lien ${link.id}: Pas d'email d'ambassadeur, email de désactivation non envoyé.`);
                    }
                } catch (emailError) {
                    console.error(`Échec de l'envoi de l'email de désactivation pour le lien ${link.id}:`, emailError);
                }

            } catch (updateError) {
                console.error(`Échec de la désactivation du lien ${link.id}:`, updateError);
            }
        }

        console.log('Désactivation des liens expirés terminée.');

    } catch (error) {
        console.error('Erreur lors de la désactivation des liens expirés:', error);
    }

    process.exit(0);
};

deactivateExpiredLinks();
