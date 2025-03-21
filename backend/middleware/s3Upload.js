const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// Configure AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure multer to use S3 for storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'private',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = `contest_questions/${Date.now()}-${path.basename(file.originalname)}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Define allowed file types with proper mime type mapping
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'application/pdf', 
      'text/plain',  // For .txt files
      'application/msword',  // For .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // For .docx
      'text/markdown' // For .md
    ];
    
    // Check file extension as backup
    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|txt|doc|docx|md)$/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    // Log file information for debugging
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
      mimetypeValid: mimetype,
      extnameValid: extname
    });
    
    // Accept if either mimetype or extension is valid
    if (mimetype || extname) {
      return cb(null, true);
    }

    // Return a more specific error message
    cb(new Error(`File upload rejected. Allowed MIME types: ${allowedMimeTypes.join(', ')}. Received: ${file.mimetype}`));
  }
});

module.exports = upload;
