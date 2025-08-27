const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const isAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Accès non autorisé: Token manquant.' });
    }

    try {
        const supabase_authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: userError } = await supabase_authed.auth.getUser();

        if (userError || !user) {
            return res.status(401).json({ error: 'Accès non autorisé: Token invalide.' });
        }

        const { data: profileData, error: profileError } = await supabase_authed
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profileData) {
            return res.status(403).json({ error: 'Profil utilisateur introuvable.' });
        }

        if (profileData.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé: Rôle administrateur requis.' });
        }

        req.supabase_authed = supabase_authed;
        req.user = user;
        next();

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur lors de la vérification d\'authentification.' });
    }
};

module.exports = { isAdmin };
