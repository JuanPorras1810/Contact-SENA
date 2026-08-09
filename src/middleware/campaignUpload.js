const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../public/uploads/campaigns'),
    filename: (req, file, callback) => {
        const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        callback(null, `${Date.now()}-${safeName}`);
    }
});

const uploadCampaignPdf = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => callback(null, file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf')
});

module.exports = { uploadCampaignPdf };
