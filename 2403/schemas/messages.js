const mongoose = require("mongoose");

// Định nghĩa cấu trúc cho một tin nhắn trong cơ sở dữ liệu
const messageSchema = new mongoose.Schema(
  {
    // ID người gửi (tham chiếu đến collection 'user')
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    // ID người nhận (tham chiếu đến collection 'user')
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    // Nội dung chi tiết của tin nhắn
    messageContent: {
      // Loại tin nhắn: chỉ chấp nhận 'file' hoặc 'text'
      type: {
        type: String,
        enum: ["file", "text"],
        required: true
      },
      // Nếu type='text' thì đây là nội dung văn bản
      // Nếu type='file' thì đây là đường dẫn đến file (ví dụ: uploads/abc.jpg)
      text: {
        type: String,
        required: true
      }
    }
  },
  {
    // Tự động tạo trường createdAt (ngày tạo) và updatedAt (ngày cập nhật)
    timestamps: true
  }
);

// Xuất model 'message' để sử dụng trong các router
module.exports = mongoose.model("message", messageSchema);
