const multer = require('multer')

const allowedFileTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip']

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, cb) => {
        if (allowedFileTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Only images, PDF, text and zip files are allowed'))
        }
    }
})

// returns a clean 400 message instead of crashing on upload errors
const uploadAttachments = (req, res, next) => {
    upload.array('attachments', 5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message })
        }
        next()
    })
}

module.exports = uploadAttachments