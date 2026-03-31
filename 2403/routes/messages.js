const express = require('express');
const router = express.Router();
const messageModel = require('../schemas/messages');
const { CheckLogin } = require('../utils/authHandler');
const { uploadFile } = require('../utils/uploadHandler');
const mongoose = require('mongoose');

/**
 * Route 1: Lấy toàn bộ lịch sử tin nhắn giữa tôi và một người dùng cụ thể
 * URL: GET /api/v1/messages/:userID
 */
router.get('/:userID', CheckLogin, async (req, res) => {
    try {
        const otherUserID = req.params.userID; // ID người kia từ URL
        const currentUserID = req.user._id;    // ID của tôi (lấy từ Token qua CheckLogin)

        // Tìm tin nhắn thỏa mãn: (Tôi gửi -> Họ nhận) HOẶC (Họ gửi -> Tôi nhận)
        const messages = await messageModel.find({
            $or: [
                { from: currentUserID, to: otherUserID },
                { from: otherUserID, to: currentUserID }
            ]
        }).sort({ createdAt: 1 }); // Sắp xếp theo thời gian tăng dần (cũ đến mới)

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Route 2: Gửi tin nhắn mới (Văn bản hoặc File)
 * URL: POST /api/v1/messages
 */
router.post('/', CheckLogin, uploadFile.single('file'), async (req, res) => {
    try {
        const { to, text } = req.body; // Lấy người nhận và nội dung từ body
        const from = req.user._id;     // Người gửi là chính tôi
        
        if (!to) {
            return res.status(400).json({ message: "Người nhận (to) là bắt buộc." });
        }

        let messageContent = {};

        // Nếu người dùng có tải lên file (req.file tồn tại)
        if (req.file) {
            messageContent = {
                type: 'file',
                text: req.file.path // Lưu đường dẫn file (ví dụ: uploads/1679...jpg)
            };
        } else {
            // Nếu không có file thì coi như gửi tin nhắn văn bản bình thường
            messageContent = {
                type: 'text',
                text: text || ""
            };
        }

        const newMessage = new messageModel({
            from,
            to,
            messageContent
        });

        await newMessage.save(); // Lưu vào Database
        res.json(newMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * Route 3: Lấy danh sách tin nhắn cuối cùng với từng người (Inbox List)
 * URL: GET /api/v1/messages
 */
router.get('/', CheckLogin, async (req, res) => {
    try {
        // Chuyển ID của tôi sang kiểu ObjectId để dùng trong aggregate
        const currentUserID = new mongoose.Types.ObjectId(req.user._id);

        const lastMessages = await messageModel.aggregate([
            // 1. Lọc ra các tin nhắn có liên quan đến tôi (gửi hoặc nhận)
            {
                $match: {
                    $or: [
                      { from: currentUserID },
                      { to: currentUserID }
                    ]
                }
            },
            // 2. Sắp xếp tin nhắn mới nhất lên đầu để lấy được "tin nhắn cuối cùng"
            {
                $sort: { createdAt: -1 }
            },
            // 3. Nhóm các tin nhắn theo "người đối diện"
            {
                $group: {
                    _id: {
                        // Nếu tôi là người gửi thì lấy 'to', ngược lại lấy 'from' làm ID nhóm
                        $cond: [
                            { $eq: ["$from", currentUserID] },
                            "$to",
                            "$from"
                        ]
                    },
                    // Lấy bản ghi tin nhắn đầu tiên (chính là tin mới nhất sau khi sort)
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            // 4. Kết nối (join) với bảng 'users' để lấy thông tin người đối diện (tên, avatar...)
            {
                $lookup: {
                    from: "users", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "otherUserInfo"
                }
            },
            // 5. Giải nén mảng 'otherUserInfo' thành object duy nhất
            {
                $unwind: "$otherUserInfo"
            },
            // 6. Ẩn các trường bảo mật không nên trả về cho client
            {
                $project: {
                    "otherUserInfo.password": 0,
                    "otherUserInfo.forgotPasswordToken": 0,
                    "otherUserInfo.forgotPasswordTokenExp": 0
                }
            }
        ]);

        res.json(lastMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
