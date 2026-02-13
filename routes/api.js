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

router.get('/apps', async (req, res) => {
    try {
        const apps = await App.find();
        return res.json(apps);
    } catch (err) {
        return res.json({ error: 'Failed to fetch apps' });
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
        

module.exports = router