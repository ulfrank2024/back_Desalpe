const { sendEmail } = require('../services/emailService');
const { isAdmin } = require('../authMiddleware');

// Function to unescape HTML entities
function unescapeHtml(html) {
    if (typeof html !== 'string') return html; // Ensure it's a string
    // First, unescape &amp; to &
    let unescaped = html.replace(/&amp;/g, '&');
    // Then, unescape other common entities
    unescaped = unescaped.replace(/&lt;/g, '<')
                         .replace(/&gt;/g, '>')
                         .replace(/&quot;/g, '"')
                         .replace(/&#039;/g, "'");
    return unescaped;
}

// Function to fix malformed ULs (specific to the user's provided HTML)
function fixMalformedUl(html) {
    if (typeof html !== 'string') return html;
    // This regex looks for <ul>...<strong...>...</strong>...</ul>
    // and tries to wrap the <strong> in an <li>
    // This is a very specific and fragile regex, not a general HTML parser.
    return html.replace(/(<ul[^>]*>)\s*(<strong[^>]*>.*?<\/strong>\s*)(<\/ul>)/gis, '$1<li>$2<\/li>$3');
}

const sendGeneralEmail = async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ message: 'Destinataire, sujet et contenu (texte ou html) sont requis.' });
    }

    try {
        let processedHtml = unescapeHtml(html);
        processedHtml = fixMalformedUl(processedHtml); // Then fix malformed ULs
        await sendEmail(to, subject, text, processedHtml);
        res.status(200).json({ message: 'Email envoyé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email général:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'envoi de l\'email.', error: error.message });
    }
};

module.exports = {
    sendGeneralEmail,
};
