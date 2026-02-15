const express = require('express')
const router = express.Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const App = require('../models/app');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;

        // Determine folder based on route or fieldname
        if (req.path.includes('/profile') || file.fieldname === 'profile_photo') {
            uploadDir = path.join(__dirname, '../uploads/profile');
        } else {
            uploadDir = path.join(__dirname, '../uploads/icons');
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = file.fieldname === 'profile_photo' ? 'profile-' : 'icon-';
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

router.get('/apps', async (req, res) => {
    try {
        const apps = await App.find();
        return res.json(apps);
    } catch (err) {
        return res.json({ error: 'Failed to fetch apps' });
    }
});

// GET USERS
router.get('/users', async (req, res) => {
    try {
        // Fetch all non-deleted users, excluding sensitive fields
        const users = await User.find({ deleted: false })
            .select('-password -refreshToken -otp -verification_key -expoToken -adminExpoToken -id_files -iban -afm -amka -ama -id_number -tk')
            .sort({ register_date: -1 })
            .limit(100); // Limit to 100 users for performance

        return res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET USER BY ID
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch user by ID, excluding sensitive fields
        const user = await User.findOne({ _id: userId, deleted: false })
            .select('-password -refreshToken -otp -verification_key -expoToken -adminExpoToken -id_files -iban -afm -amka -ama -id_number -tk');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// CREATE APP
router.post('/apps', upload.single('icon'), async (req, res) => {
    console.log('=== CREATE APP REQUEST ===');
    console.log('User:', res.locals.user);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    console.log('========================');

    if (!res.locals.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { title, url, description } = req.body;

        // Validation
        if (!title || !url) {
            console.log('Validation failed: missing title or url');
            return res.status(400).json({ error: 'Title and URL are required' });
        }

        if (!req.file) {
            console.log('Validation failed: no file uploaded');
            return res.status(400).json({ error: 'Icon image is required' });
        }

        // Create app
        const app = new App({
            creator_id: res.locals.user.user_id,
            title: title,
            url: url,
            icon: `/uploads/icons/${req.file.filename}`,
            description: description || ''
        });

        await app.save();

        console.log('App created successfully:', app._id);

        return res.json({
            success: true,
            message: 'App created successfully',
            app: app
        });
    } catch (err) {
        console.error('Error creating app:', err);
        // Delete uploaded file if app creation fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: 'Failed to create app' });
    }
});

// LOAD PROFILE
router.get('/profile', async (req, res) => {
    if (!res.locals.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = await User.findById(res.locals.user.user_id);
        return res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Failed to fetch apps' });
    }
});

// UPDATE PROFILE
router.put('/profile', upload.single('profile_photo'), async (req, res) => {
    if (!res.locals.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userId = res.locals.user.user_id;
        const updateData = {};

        // Extract allowed fields from request body
        const allowedFields = ['username', 'email', 'first_name', 'last_name',
                               'phone_number', 'description', 'city', 'address',
                               'birth_date', 'gender'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Handle profile photo upload
        if (req.file) {
            updateData.profile_photo = `/uploads/profile/${req.file.filename}`;
        }

        // Email validation if email is being updated
        if (updateData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updateData.email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Check if email already exists (excluding current user)
            const existingUser = await User.findOne({
                email: updateData.email,
                _id: { $ne: userId }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Username validation if username is being updated
        if (updateData.username) {
            const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
            if (!usernameRegex.test(updateData.username)) {
                return res.status(400).json({
                    error: 'Username must be 3-30 characters (letters, numbers, underscores only)'
                });
            }

            // Check if username already exists (excluding current user)
            const existingUser = await User.findOne({
                username: updateData.username,
                _id: { $ne: userId }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password -refreshToken -otp -verification_key');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        if (req.file) {
            fs.unlinkSync(req.file.path); // Clean up uploaded file on error
        }
        return res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET CURRENT USER'S APPS
router.get('/profile/apps', async (req, res) => {
    if (!res.locals.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const apps = await App.find({ creator_id: res.locals.user.user_id })
            .sort({ createdAt: -1 });
        return res.json(apps);
    } catch (err) {
        console.error('Error fetching user apps:', err);
        return res.status(500).json({ error: 'Failed to fetch apps' });
    }
});

// GET APPS BY USER ID
router.get('/users/:userId/apps', async (req, res) => {
    try {
        const { userId } = req.params;
        const apps = await App.find({ creator_id: userId })
            .sort({ createdAt: -1 })
            .limit(100);
        return res.json(apps);
    } catch (err) {
        console.error('Error fetching user apps:', err);
        return res.status(500).json({ error: 'Failed to fetch apps' });
    }
});


module.exports = router