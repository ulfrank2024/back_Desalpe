require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Importation et utilisation des routes
const authRoutes = require("./Routes/authRoutes"); // Chemin corrigé
app.use("/api/auth", authRoutes);

const countryRoutes = require("./Routes/countryRoutes"); // Chemin corrigé
app.use("/api/countries", countryRoutes);

const cityRoutes = require("./Routes/cityRoutes"); // Chemin corrigé
app.use("/api/cities", cityRoutes);

const sessionRoutes = require("./Routes/sessionRoutes"); // Chemin corrigé
app.use("/api/sessions", sessionRoutes);

const anonymousClickRoutes = require("./Routes/anonymousClickRoutes"); // Chemin corrigé
app.use("/api/anonymous-clicks", anonymousClickRoutes);

const invitationRoutes = require("./Routes/invitationRoutes"); // Chemin corrigé
app.use("/api/invitations", invitationRoutes);

const registrationRoutes = require("./Routes/registrationRoutes"); // Chemin corrigé
app.use("/api/registrations", registrationRoutes);

const emailRoutes = require("./Routes/emailRoutes"); // Déjà correct
app.use("/api/email", emailRoutes);

const reminderRoutes = require("./Routes/reminderRoutes"); // Déjà correct
app.use("/api/reminders", reminderRoutes);

// --- Routes pour la section Inscription ---
const inscriptionProspectsRoutes = require("./Routes/inscriptionProspectsRoutes");
app.use("/api/inscription/prospects", inscriptionProspectsRoutes);

const inscriptionLiensRoutes = require("./Routes/inscriptionLiensRoutes");
app.use("/api/inscription/liens", inscriptionLiensRoutes);

const inscriptionEventsRoutes = require("./Routes/inscriptionEventsRoutes");
app.use("/api/inscription/events", inscriptionEventsRoutes);

const inscriptionRotationRoutes = require("./Routes/inscriptionRotationRoutes");
app.use("/api/inscription", inscriptionRotationRoutes);

app.get("/", (req, res) => {
    res.send("Serveur GraceDesalpe avec Supabase est en marche !");
});

app.listen(port, () => {});
