const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Gmail and app password (App Password generated in Google Account settings)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yaminibangaru1@gmail.com',
    pass: 'czxizksbidttzevf'  // ✅ Gmail App Password
  }
});

exports.sendEmailOnFormSubmit = functions.firestore
  .document('contacts/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { fullName, email } = data;

    if (!email || !fullName) {
      console.warn('Missing email or name in the contact form data.');
      return null;
    }

    const mailOptions = {
      from: 'yaminibangaru1@gmail.com',  // ✅ must match the authenticated user
      to: email,
      subject: 'Thank You for Contacting Us!',
      text: `Hi ${fullName},\n\nThank you for reaching out to us. We have received your message and will get back to you shortly.\n\nBest regards,\nYour Team`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
    }

    return null;
  });
