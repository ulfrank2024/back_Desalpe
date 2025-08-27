const supabase = require('../db/supabase');

/**
 * Contrôleur pour gérer la connexion des utilisateurs (admins).
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe sont requis.' });
    }

    try {
        // Tenter de se connecter avec Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        // Vérifier le rôle de l'utilisateur dans la table 'profiles'
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();

        if (profileError || !profileData) {
            // Si le profil n'est pas trouvé ou erreur, cela peut indiquer un problème
            // ou que l'utilisateur n'a pas de rôle défini.
            return res.status(403).json({ error: 'Profil utilisateur introuvable ou rôle non défini.' });
        }

        if (profileData.role !== 'admin') {
            // Si l'utilisateur n'est pas un admin, refuser l'accès
            return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas un administrateur.' });
        }

        // Connexion réussie et l'utilisateur est un admin
        res.status(200).json({ message: 'Connexion administrateur réussie.', user: data.user, token: data.session.access_token, role: profileData.role });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion.' });
    }
};

module.exports = {
    login,
};
