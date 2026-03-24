let userModel = require("../schemas/users");
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
let fs = require('fs')

module.exports = {
    CreateAnUser: async function (username, password, email, role, session, fullName, avatarUrl, status, loginCount) {
        let newItem = new userModel({
            username: username,
            password: password,
            email: email,
            fullName: fullName,
            avatarUrl: avatarUrl,
            status: status,
            role: role,
            loginCount: loginCount
        });
        await newItem.save({ session });
        return newItem;
    },
    GetAllUser: async function () {
        return await userModel
            .find({ isDeleted: false })
    },
    GetUserById: async function (id) {
        try {
            return await userModel
                .findOne({
                    isDeleted: false,
                    _id: id
                }).populate('role')
        } catch (error) {
            return false;
        }
    },
    GetUserByEmail: async function (email) {
        try {
            return await userModel
                .findOne({
                    isDeleted: false,
                    email: email
                })
        } catch (error) {
            return false;
        }
    },
    GetUserByToken: async function (token) {
        try {
            let user = await userModel
                .findOne({
                    isDeleted: false,
                    forgotPasswordToken: token
                })
            if (user.forgotPasswordTokenExp > Date.now()) {
                return user;
            }
            return false;
        } catch (error) {
            return false;
        }
    },
    QueryLogin: async function (username, password) {
        if (!username || !password) {
            return false;
        }
        let user = await userModel.findOne({
            username: username,
            isDeleted: false
        })
        if (user) {
            if (user.lockTime && user.lockTime > Date.now()) {
                return false;
            } else {
                if (bcrypt.compareSync(password, user.password)) {
                    user.loginCount = 0;
                    await user.save();
                    let token = jwt.sign({
                        id: user.id
                    }, 'secret', {
                        expiresIn: '1d'
                    })
                    return token;
                } else {
                    //sai pass
                    user.loginCount++;
                    if (user.loginCount == 3) {
                        user.loginCount = 0;
                        user.lockTime = Date.now() + 3_600_000;
                    }
                    await user.save();
                    return false;
                }
            }
        } else {
            return false;
        }
    },
    ChangePassword: async function (user, oldPassword, newPassword) {
        if (bcrypt.compareSync(oldPassword, user.password)) {
            user.password = newPassword;
            await user.save();
            return true;
        } else {
            return false;
        }
    },
    ImportUsers: async function (pathFile) {
        const exceljs = require('exceljs');
        const roleModel = require('../schemas/roles');
        const { sendMailPassword } = require('../utils/sendMail');
        
        let workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(pathFile);
        let worksheet = workbook.worksheets[0];
        
        // Find user role, create if it doesn't exist
        let userRole = await roleModel.findOne({ name: { $regex: /^user$/i } });
        if (!userRole) {
            userRole = new roleModel({ name: 'USER', description: 'Regular user' });
            await userRole.save();
        }

        let result = [];
        // Loop from row 2 upwards skip header
        for (let index = 2; index <= worksheet.rowCount; index++) {
            const row = worksheet.getRow(index);
            let username = row.getCell(1).value;
            let email = row.getCell(2).value;

            // Xử lý value lấy text hoặc result nếu là công thức Excel
            if (username && typeof username === 'object') {
                username = username.text || username.result || username.hyperlink || username;
            }
            if (email && typeof email === 'object') {
                email = email.text || email.result || email.hyperlink || email;
            }

            // skip empty rows if any
            if (!username || !email) continue;
            
            // random chuỗi dài 16 kí tự (letters and numbers)
            let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < 16; i++) {
                password += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            let existingUser = await userModel.findOne({ $or: [{ username }, { email }] });
            if (!existingUser) {
                let newUser = new userModel({
                    username: username.toString().trim(),
                    email: email.toString().trim(),
                    password: password,
                    role: userRole._id
                });
                await newUser.save();
                
                // gửi email password cho user
                try {
                    await sendMailPassword(newUser.email, password);
                } catch (error) {
                    console.log("Error sending email to: ", newUser.email, error);
                }
                
                result.push({ username: newUser.username, email: newUser.email, success: true });
            } else {
                result.push({ username, email, success: false, reason: "username or email already exists" });
            }
        }
        return result;
    }
}