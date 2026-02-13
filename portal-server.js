require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const port = 3000
const path = require('path');
const multer = require("multer");
const cors = require('cors');
const App = require('./models/app');
const User = require('./models/user');
// IMPORT ROUTES
const apiroute = require('./routes/api')
const formsroute = require('./routes/forms')
const authRoute = require('./routes/auth')

app.use(cors());

// app.use(express.urlencoded({extended:false}))
app.use(cookieParser());
// app.use(bodyParser.urlencoded({limit: '40mb', extended: false}))
app.use(bodyParser.json());
app.use(tokenAuthentication)
app.use(visit)

// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DATABASE CONNECTION
mongoose.connect(process.env.DATABASE_URL)
const db = mongoose.connection
db.on('error', error => console.error(error.message))
db.once('open', () => console.log(`connected to ${process.env.DATABASE_URL}`))
// ------------------

// INDEX
app.use('/api', apiroute)
app.use('/forms', formsroute)
app.use('/auth', authRoute)

// Multer setup for multiple files
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });


app.post('/upload', upload.single('file'), async (req, res) => {
  console.log(req.body)
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const newApp = new App({
    creator_id: req.body.creator_id,
    title: req.body.title,
    url: req.body.url,
    icon: req.file.path, // Store the file path in the database
  });

  await newApp.save();

  return res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    path: req.file.path,
  });
});

// LOGOUT
app.get('/logout', async (req, res) => {
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    return res.json({ message: 'Logged out' });
});

// SERVER
app.listen(port, ()=>{
    console.log(`runs on port: ${port}`)
})

// FUNCTIONS
async function tokenAuthentication(req, res, next){
    
  try {
    // 1. Extract tokens
    const authHeader = req.headers["authorization"];
    const accessToken = authHeader && authHeader.split(" ")[1];
    const refreshToken = req.headers["x-refresh-token"];

    if (!accessToken) {
      console.log("No access token provided");
      res.locals.IsLoggedIn = false;
      return next(); // Proceed as unauthenticated
    }

    // 2. Verify access token
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
        res.locals.user = user;
        return next();
      }

      // 3. If expired, check refresh token
      if (err.name === "TokenExpiredError") {
        console.log("Access token expired, checking refresh token...");
        if (!refreshToken) {
          console.log("No refresh token provided");
          res.locals.IsLoggedIn = false;
          return next(); // Proceed as unauthenticated
        }

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (refreshErr, refreshPayload) => {
          if (refreshErr) {
            console.log("Invalid refresh token");
            res.locals.IsLoggedIn = false;
            res.locals.deleteTokens = true; // Indicate tokens should be deleted client-side
            return next(); // Proceed as unauthenticated
          }

          // Refresh token is valid → issue new access token
          const newAccessToken = jwt.sign(
            refreshPayload, // adjust payload fields
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1m" }
          );

          // Attach user & send new access token in response header
          req.user = refreshPayload;
          res.locals.user = refreshPayload;
          res.locals.IsLoggedIn = true;
          res.locals.refreshed = true; // Indicate token was refreshed
          res.locals.newAccessToken = newAccessToken;

          return next();
        });
      } else {
        console.log("Invalid access token");
        res.locals.IsLoggedIn = false;
        res.locals.deleteTokens = true; // Indicate tokens should be deleted client-side
        return next(); // Proceed as unauthenticated
      }
    });
  } catch (err) {
    console.error("Token authentication error:", err);
    res.locals.IsLoggedIn = false;
    res.locals.deleteTokens = true; // Indicate tokens should be deleted client-side
    return next(); // Proceed as unauthenticated
  }
 
}

function visit(req, res, next){
    res.locals.user_ip = req.headers['x-forwarded-for'] || 'No IP'
    const date = new Date()
    console.log(req.headers['x-forwarded-for'] + ' : ' + req.method + ' : ' + date.toLocaleString('el-GR', { timeZone: 'Europe/Athens',format:'DD-MM-YYYY' }) + ' : ' + req.originalUrl + ' : name='+ res.locals.user?.user_name)
    next()
}

