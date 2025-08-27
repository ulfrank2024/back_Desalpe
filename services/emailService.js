const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Generic email sending function
const sendEmail = async (to, subject, text, html) => { // Corrected to accept both text and html
    const mailOptions = {
        from: `"GraceDesalpe" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
        ...(html ? {} : { text: text }), // Conditionally add 'text' property
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully.');
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // Re-throw the error to be caught by the controller
    }
};

module.exports = { sendEmail };