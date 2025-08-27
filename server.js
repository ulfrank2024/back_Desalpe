require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
console.log('server.js: Request received by Express app.'); // NEW LOG

// Importation et utilisation des routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const countryRoutes = require('./routes/countryRoutes');
app.use('/api/countries', countryRoutes);

const cityRoutes = require('./routes/cityRoutes');
app.use('/api/cities', cityRoutes);

const sessionRoutes = require('./routes/sessionRoutes');
app.use('/api/sessions', sessionRoutes);

const anonymousClickRoutes = require('./routes/anonymousClickRoutes');
app.use('/api/anonymous-clicks', anonymousClickRoutes);

const invitationRoutes = require('./routes/invitationRoutes');
app.use('/api/invitations', invitationRoutes);

const registrationRoutes = require('./routes/registrationRoutes');
app.use('/api/registrations', registrationRoutes);

const emailRoutes = require('./routes/emailRoutes');
app.use('/api/email', emailRoutes);

// NEW: Reminder Routes
const reminderRoutes = require('./routes/reminderRoutes');
app.use('/api/reminders', reminderRoutes);

app.get('/', (req, res) => {
  res.send('Serveur GraceDesalpe avec Supabase est en marche !');
});

app.listen(port, () => {
});