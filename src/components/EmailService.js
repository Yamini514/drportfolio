import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
emailjs.init({
  publicKey: 'BteJWtOh0EM3d8HljVxGO',
});

export const sendEmail = async (templateParams) => {
  try {
    const response = await emailjs.send(
      'service_l920egs',
      'template_iremp8a',
      {
        to_email: templateParams.email, // Add recipient email
        ...templateParams
      }
    );
    return { success: true, response };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
};