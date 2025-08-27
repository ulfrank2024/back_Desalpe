require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Utilisation de la clé de rôle de service

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans le fichier .env');
    process.exit(1);
}

// Initialiser le client Supabase avec la clé de rôle de service
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const createAdminUser = async (email, password) => {
    try {
        // 1. Créer l'utilisateur dans Supabase Auth
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Confirmer automatiquement l'email pour l'admin
        });

        if (userError) {
            console.error('Erreur lors de la création de l\'utilisateur dans Supabase Auth:', userError.message);
            return;
        }

        console.log('Utilisateur créé dans Supabase Auth:', userData.user.id);

        // 2. Mettre à jour le rôle de l'utilisateur dans la table profiles
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .upsert({ user_id: userData.user.id, role: 'admin' }, { onConflict: 'user_id' })
            .select();

        if (profileError) {
            console.error('Erreur lors de la mise à jour du rôle dans la table profiles:', profileError.message);
            return;
        }

        console.log('Rôle administrateur attribué à l\'utilisateur:', email);
        console.log('Admin créé avec succès !');

    } catch (error) {
        console.error('Une erreur inattendue est survenue:', error.message);
    }
};

// Récupérer l'email et le mot de passe des arguments de la ligne de commande
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.log('Utilisation: node createAdminUser.js <email> <password>');
    process.exit(1);
}

createAdminUser(email, password);