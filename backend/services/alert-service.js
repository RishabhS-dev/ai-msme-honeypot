// services/alert-service.js

const nodemailer = require('nodemailer');
const twilio = require('twilio');

class AlertService {
  constructor(io, config) {
    this.io = io;

    // Email configuration
    this.emailTransporter = nodemailer.createTransport({
      service: config.email.service || 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });

    // Twilio configuration
    this.twilioClient = twilio(config.sms.accountSid, config.sms.authToken);
    this.twilioFromNumber = config.sms.fromNumber;

    this.isReady = true;
  }

  async sendEmailAlert(to, subject, message) {
    try {
      const mailOptions = {
        from: `AI Honeypot <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: `<h3>${subject}</h3><p>${message}</p>`
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email alert sent to ${to}: ${info.response}`);
    } catch (error) {
      console.error('Error sending email alert:', error.message);
    }
  }

  async sendSMSAlert(to, message) {
    try {
      const msg = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioFromNumber,
        to
      });
      console.log(`SMS alert sent to ${to}: SID=${msg.sid}`);
    } catch (error) {
      console.error('Error sending SMS alert:', error.message);
    }
  }

  async sendAlert(threat) {
    const alertMessage = `CRITICAL THREAT DETECTED\n\nType: ${threat.attack_type}\nSource IP: ${threat.src_ip}\nSeverity: ${threat.severity}\nConfidence: ${threat.confidence}\nTime: ${threat.timestamp}`;

    // Example recipients
    const emailRecipients = ['security_team@example.com'];
    const smsRecipients = ['+919876543210'];

    // Send Email Alerts
    for (const email of emailRecipients) {
      await this.sendEmailAlert(email, 'Critical Threat Alert', alertMessage);
    }

    // Send SMS Alerts
    for (const phone of smsRecipients) {
      await this.sendSMSAlert(phone, alertMessage);
    }

    // Emit real-time alert to dashboard via Socket.IO
    if (this.io) {
      this.io.emit('new_alert', threat);
      console.log('Real-time alert emitted to dashboard.');
    }
  }
}

module.exports = AlertService;
