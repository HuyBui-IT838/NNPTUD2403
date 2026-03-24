const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "92a2bccaeb9daa",
        pass: "9599ce5e5f1502",
    },
});

module.exports = {
    sendMail: async function (to, url) {
        await transporter.sendMail({
            from: 'admin@haha.com',
            to: to,
            subject: "reset password email",
            text: "click vao day de doi pass", // Plain-text version of the message
            html: "click vao <a href=" + url+ ">day</a> de doi pass", // HTML version of the message
        })
    },
    sendMailPassword: async function (to, password) {
        await transporter.sendMail({
            from: 'admin@haha.com',
            to: to,
            subject: "Your New Account Password",
            text: "Your password is: " + password, // Plain-text version
            html: "Your password is: <b>" + password + "</b>", // HTML version
        })
    }
}
