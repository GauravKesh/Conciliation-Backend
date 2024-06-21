const nodemailer = require("nodemailer");

module.exports = async (email, subject, text) => {
  try {
    // Creating an SMTP transporter object
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: Number(process.env.EMAIL_PORT),
      secure: Boolean(process.env.SECURE),
      auth: {
        user: process.env.USER_ID,
        pass: process.env.PASS,
      },
    });


    const message = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #e0f7fa;
            padding: 20px;
            margin: 0;
          }
          .container {
            background-color: rgb(16, 24, 39);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            margin: 40px auto;
            border: 2px solid #00796b;
          }
          h1 {
            color: #00796b;
            text-align: center;
          }
          p {
            font-size: 16px;
            color: #cccccc;
            line-height: 1.5;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #999999;
          }
          .red {
            color: red;
          }
          .logo {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo img {
            max-width: 100px;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            font-size: 16px;
            color: #a2eee7;
            background-color: #374151;
            border-radius: 5px;
            text-decoration: none;
            text-align: center;
            margin-top: 20px;
            display: block;
            max-width: 200px;
            margin: 20px auto;
          }

        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://drive.google.com/uc?export=view&id=1o_hYbrmyMxWHFL5FBZVrDr2llMlotRzR" alt="Logo" />
          </div>
          <h1>Important: Password Change Request</h1>
          <p>Hi there,</p>
          <p>We received a request to reset your password. If you did not make this request, you can safely ignore this email. Rest assured, your account is safe.</p>
          <p>If you did request a password change, click the button below to reset your password. This link is valid for the next 2 minutes.</p>
          <a href="${text}" style="color:#a2eee7" class="button">Reset Password</a>
          <p class="red">Please do not share this link with anyone. If you have any questions, feel free to contact our support team.</p>
          <div class="footer">
            <p>Best regards,<br>Conciliation Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: "Conciliation <hacekd7@gmail.com>",
      to: email,
      subject: subject,
      html: message,
    });

    console.log("Email sent successfully");
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.log("Email not sent!");
    console.log(error);
    return {
      success: false,
      message: "Error sending Password Reset link!",
      error: error,
    };
  }
};
