const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    // Define allowed file types
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    }
});

// Middleware to handle authentication (optional)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // For demo purposes, we'll skip authentication
        // In production, you should validate the token
        return next();
    }

    // Validate token here
    // jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    //     if (err) return res.sendStatus(403);
    //     req.user = user;
    //     next();
    // });
    
    next();
};

// POST route for form upload
router.post('/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
    try {
        const { url, title } = req.body;
        const files = req.files;

        // Validate required fields
        if (!url || !title) {
            return res.status(400).json({
                success: false,
                message: 'URL and title are required fields'
            });
        }

        // Validate URL format
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlRegex.test(url)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid URL'
            });
        }

        // Process uploaded files
        const uploadedFiles = files ? files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: `/uploads/${file.filename}`
        })) : [];

        // Create form data object
        const formData = {
            id: uuidv4(),
            url: url.trim(),
            title: title.trim(),
            files: uploadedFiles,
            createdAt: new Date().toISOString(),
            // userId: req.user?.id || null // If authentication is enabled
        };

        // Here you would typically save to database
        // Example with MongoDB:
        // const savedForm = await FormModel.create(formData);
        
        // For demo purposes, we'll just log and return success
        console.log('Form submitted:', formData);

        // Save to a JSON file for demonstration
        const formsFile = path.join(__dirname, '../data/forms.json');
        let existingForms = [];
        
        try {
            if (fs.existsSync(formsFile)) {
                const data = fs.readFileSync(formsFile, 'utf8');
                existingForms = JSON.parse(data);
            }
        } catch (err) {
            console.error('Error reading forms file:', err);
        }

        existingForms.push(formData);
        
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(formsFile, JSON.stringify(existingForms, null, 2));

        res.status(201).json({
            success: true,
            message: 'Form submitted successfully',
            data: {
                id: formData.id,
                url: formData.url,
                title: formData.title,
                filesCount: uploadedFiles.length,
                createdAt: formData.createdAt
            }
        });

    } catch (error) {
        console.error('Form submission error:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error cleaning up file:', err);
                }
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET route to retrieve all forms
router.get('/', authenticateToken, (req, res) => {
    try {
        const formsFile = path.join(__dirname, '../data/forms.json');
        
        if (!fs.existsSync(formsFile)) {
            return res.json({
                success: true,
                data: [],
                message: 'No forms found'
            });
        }

        const data = fs.readFileSync(formsFile, 'utf8');
        const forms = JSON.parse(data);

        res.json({
            success: true,
            data: forms,
            count: forms.length
        });

    } catch (error) {
        console.error('Error fetching forms:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching forms',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET route to retrieve a specific form by ID
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const formsFile = path.join(__dirname, '../data/forms.json');
        
        if (!fs.existsSync(formsFile)) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        const data = fs.readFileSync(formsFile, 'utf8');
        const forms = JSON.parse(data);
        const form = forms.find(f => f.id === id);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        res.json({
            success: true,
            data: form
        });

    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching form',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE route to remove a form
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const formsFile = path.join(__dirname, '../data/forms.json');
        
        if (!fs.existsSync(formsFile)) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        const data = fs.readFileSync(formsFile, 'utf8');
        const forms = JSON.parse(data);
        const formIndex = forms.findIndex(f => f.id === id);

        if (formIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        const form = forms[formIndex];
        
        // Delete associated files
        if (form.files && form.files.length > 0) {
            form.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            });
        }

        // Remove form from array
        forms.splice(formIndex, 1);
        
        // Save updated forms
        fs.writeFileSync(formsFile, JSON.stringify(forms, null, 2));

        res.json({
            success: true,
            message: 'Form deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting form',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 10MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 10 files.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + error.message
        });
    }
    
    if (error.message.includes('File type')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next(error);
});

module.exports = router;