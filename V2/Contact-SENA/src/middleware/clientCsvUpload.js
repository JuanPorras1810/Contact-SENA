const multer = require('multer');

const uploadClientCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => callback(null, file.originalname.toLowerCase().endsWith('.csv'))
});

module.exports = { uploadClientCsv };
