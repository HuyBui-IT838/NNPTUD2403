const ExcelJS = require('exceljs');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Users');

// Header
worksheet.addRow(['username', 'email']);

// Data
worksheet.addRow(['user01', 'user01@yopmail.com']);
worksheet.addRow(['user02', 'user02@yopmail.com']);
worksheet.addRow(['user03', 'user03@yopmail.com']);

workbook.xlsx.writeFile('test_users.xlsx').then(() => {
    console.log("File test_users.xlsx đã được tạo thành công!");
});
