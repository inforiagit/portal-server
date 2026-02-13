const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const bcrypt = require('bcrypt')
const axios = require("axios");
const randomstring = require("randomstring")
// const { OAuth2Client } = require('google-auth-library');
// const jwksClient = require("jwks-rsa");
// const CLIENT_ID = '1092206471273-1jua47lut6kguev2qq22nuvsqs6psdgc.apps.googleusercontent.com';
// const client = new OAuth2Client(CLIENT_ID);
// Apple public keys
// const client = jwksClient({
//   jwksUri: "https://appleid.apple.com/auth/keys",
// });

router.post('/login', async (req, res) => {
    // if(res.locals.user) return res.redirect(`/dasboard?You_are_Loged_in`)
    try{
        const user = await User.findOne({
            email: req.body.email, 
            deleted: { $ne: true }
        })

        if(!user) return res.json({ error: 'No user' });
            
        if(bcrypt.compareSync(req.body.password, user.password)){
            // create access token
            const accessToken = jwt.sign({
                user_id: user._id,
                email_verified: user.email_verified || false,
                phone_number_verified: user.phone_number_verified || false,
                identity_verified: user.identity_verified || false
            }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
            // }, process.env.ACCESS_TOKEN_SECRET)

            const refreshToken = jwt.sign({
                user_id: user._id,
                email_verified: user.email_verified || false,
                phone_number_verified: user.phone_number_verified || false,
                identity_verified: user.identity_verified || false
            }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

            user.refreshToken = refreshToken
            await user.save()

            return res.json({ accessToken: accessToken, refreshToken: refreshToken });
        }else{
            return res.json({ error: 'Wrong password' });
        }
        
    }catch(e){
        console.error(e);
        return res.json({ error: 'ERROR' });
    }

})

// REGISTER
router.post('/register', async (req, res) => {
    console.log(req.body);
    if(res.locals.user) return res.json({ error: 'You are already logged in' });
    try{
        const count = await User.countDocuments({email: req.body.email})
        // email exist
        if(count > 0) return res.json({ error: 'Email already in use' });
        // CREATE USER
        const vkey = randomstring.generate(65)
        req.body.password = await bcrypt.hash(req.body.password, 10)
        req.body.verification_key = vkey
        const user = new User(req.body)

        await user.save()

        return res.json({ success: 'User created', user: { id: user._id, email: user.email, name: user.first_name + ' ' + user.last_name } });
        
    }catch(e){
        console.error(e);
        return res.json({ error: 'ERROR' });
    }

})

// // GOOGLE LOGIN
// router.get('/google', async (req, res) => {
//     const params = new URLSearchParams({
//         client_id: process.env.GOOGLE_CLIENT_ID,
//         redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//         response_type: 'code',
//         // scope: 'openid email profile https://www.googleapis.com/auth/user.phonenumbers.read',
//         scope: 'openid email profile',
//         access_type: 'offline',
//         prompt: 'consent'
//     });

//     res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);

// })

// router.get('/google/callback', async (req, res) => {
//     const code = req.query.code;
//     const error = req.query.error;

//     if(error) return res.redirect(`/?error=Google:${error}`)

//     if (!code) return res.redirect(`/?error=Google:no_code`)

//     try{
//         const { data } = await axios.post('https://oauth2.googleapis.com/token', {
//             code,
//             client_id: process.env.GOOGLE_CLIENT_ID,
//             client_secret: process.env.GOOGLE_CLIENT_SECRET,
//             redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//             grant_type: 'authorization_code',
//         });

//         const id_token = data.id_token;

//         // TOKEN FOR PHONE NUMBER 
//         // const access_token = data.access_token;
//         // console.log('ttookkeennn', access_token);

//         // const peopleRes = await axios.get('https://people.googleapis.com/v1/people/me?personFields=phoneNumbers', {
//         //     headers: {
//         //         Authorization: `Bearer ${access_token}`,
//         //     },
//         // });
//         // const phoneNumbers = peopleRes.data.phoneNumbers;
//         // console.log(phoneNumbers)

//         const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
//         const ticket = await client.verifyIdToken({
//             idToken: id_token,
//             audience: process.env.GOOGLE_CLIENT_ID,
//         });
//         const payload = ticket.getPayload();
//         const { email, name, picture, given_name, family_name, email_verified } = payload;
//         const user = await User.findOne({email: email})

//         // USER EXIST
//         if(user){
//             const accessToken = jwt.sign({
//                 user_id: user._id,
//                 email_verified: user.email_verified || false,
//                 phone_number_verified: user.phone_number_verified || false,
//                 identity_verified: user.identity_verified || false
//             // }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
//             }, process.env.ACCESS_TOKEN_SECRET)

//             const refreshToken = jwt.sign({
//                 user_id: user._id,
//                 email_verified: user.email_verified || false,
//                 phone_number_verified: user.phone_number_verified || false,
//                 identity_verified: user.identity_verified || false
//             }, process.env.REFRESH_TOKEN_SECRET)

//             user.refreshToken = refreshToken
//             await user.save()

//             // console.log("Access Token0: " + accessToken)
//             // console.log("Refresh Token0: " + refreshToken)

//             res.cookie('accessToken', accessToken)
//             res.cookie('refreshToken', refreshToken)

//             return res.redirect(`/`);
//         }
        
//         // REGISTER NEW USER 
//         const new_user = new User({
//             email: email,
//             first_name: given_name,
//             last_name: family_name,
//             email_verified: email_verified,
//             register_date: new Date(),
//             birth_date: null,
//         })

//         const accessToken = jwt.sign({
//             user_id: new_user._id,
//             email_verified: email_verified || true,
//             phone_number_verified: false,
//             identity_verified: false
//         // }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
//         }, process.env.ACCESS_TOKEN_SECRET)

//         const refreshToken = jwt.sign({
//             user_id: new_user._id,
//             email_verified: email_verified || true,
//             phone_number_verified: false,
//             identity_verified: false
//         }, process.env.REFRESH_TOKEN_SECRET)

//         new_user.refreshToken = refreshToken
//         await new_user.save()

//         res.cookie('accessToken', accessToken)
//         res.cookie('refreshToken', refreshToken)

//         return res.redirect(`/`);
//     }catch(e){
//         console.log(`error:` + e)
//         return res.redirect(`../?errorrr=${e.message}`);
//     }

// })

// // APP GOOGLE LOGIN
// router.post("/google_app", async (req, res) => {
//   try {
//     const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
//     // 1. Verify the token   
//     const ticket = await client.verifyIdToken({
//         idToken: req.body.response?.data?.idToken || req.body.data?.idToken,
//         audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();
//     // 2. Use the payload (e.g., email, name, picture)
//     const { email, name, picture, given_name, family_name, email_verified } = payload;
//     const user = await User.findOne({email: email})

//     // USER EXIST
//     if(user){
//         const accessToken = jwt.sign({
//             user_id: user._id,
//             email_verified: user.email_verified || false,
//             phone_number_verified: user.phone_number_verified || false,
//             identity_verified: user.identity_verified || false
//         // }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
//         }, process.env.ACCESS_TOKEN_SECRET)

//         const refreshToken = jwt.sign({
//             user_id: user._id,
//             email_verified: user.email_verified || false,
//             phone_number_verified: user.phone_number_verified || false,
//             identity_verified: user.identity_verified || false
//         }, process.env.REFRESH_TOKEN_SECRET)

//         user.refreshToken = refreshToken
//         await user.save()

//         res.cookie('accessToken', accessToken)
//         res.cookie('refreshToken', refreshToken)

//         return res.json({ accessToken: accessToken, refreshToken: refreshToken });
//     }
    
//     // REGISTER NEW USER
//     const new_user = new User({
//         email: email,
//         first_name: given_name,
//         last_name: family_name,
//         verified: email_verified,
//         register_date: new Date(),
//         birth_date: null,
//     })

//     const accessToken = jwt.sign({
//         user_id: new_user._id,
//         email_verified: email_verified || false,
//         phone_number_verified: false,
//         identity_verified: false
//     // }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
//     }, process.env.ACCESS_TOKEN_SECRET)

//     const refreshToken = jwt.sign({
//         user_id: new_user._id,
//         email_verified: email_verified || false,
//         phone_number_verified: false,
//         identity_verified: false
//     }, process.env.REFRESH_TOKEN_SECRET)

//     new_user.refreshToken = refreshToken
//     await new_user.save()

//     res.cookie('accessToken', accessToken)
//     res.cookie('refreshToken', refreshToken)

//     return res.json({ accessToken: accessToken, refreshToken: refreshToken });

//   } catch (err) {
//     console.log(err.message)
//     res.send({error: err.message});
//   }
// });

// router.post('/token_login', (req, res) => {
//   const { accessToken, refreshToken } = req.body;

// //   console.log("Access Token: " + accessToken)
// //   console.log("Refresh Token: " + refreshToken)
  
//   if (!accessToken || !refreshToken) {
//     return res.redirect('/');
//   }

//   // Optionally: verify or decode JWTs here if needed
//   // jwt.verify(accessToken, ACCESS_TOKEN_SECRET)

//   // Set the cookies
//   res.cookie('accessToken', accessToken);
//   res.cookie('refreshToken', refreshToken);

//   // Redirect to dashboard or home
//   return res.redirect('/');
// });

// // APPLE LOGIN
// router.post('/apple', async (req, res) => {
//     console.log(req.body)
//     const { identityToken } = JSON.parse(req.body.response);

//     if (!identityToken) {
//         return res.status(400).json({ error: "Missing identityToken" });
//     }

//     jwt.verify(
//         identityToken,
//         getAppleKey,
//         {
//         algorithms: ["RS256"],
//         // audience: "host.exp.Exponent",
//         audience: "com.kapoios.extratzisnvts", 
//         issuer: "https://appleid.apple.com",
//         },
//         async (err, decoded) => {
//         if (err) {
//             console.error("JWT Verification Error:", err);
//             return res.status(401).json({ error: "Invalid token" });
//         }

//         // Το token είναι έγκυρο
//         console.log("Decoded Apple Token:", decoded);

//         const user = await User.findOne({sub: decoded.sub});

//         // USER EXIST
//         if(user){
//             const accessToken = jwt.sign({
//                 user_id: user._id,
//                 email_verified: user.email_verified || false,
//                 phone_number_verified: user.phone_number_verified || false,
//                 identity_verified: user.identity_verified || false
//             // }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
//             }, process.env.ACCESS_TOKEN_SECRET)

//             const refreshToken = jwt.sign({
//                 user_id: user._id,
//                 email_verified: user.email_verified || false,
//                 phone_number_verified: user.phone_number_verified || false,
//                 identity_verified: user.identity_verified || false
//             }, process.env.REFRESH_TOKEN_SECRET)

//             user.refreshToken = refreshToken
//             await user.save()

//             res.cookie('accessToken', accessToken)
//             res.cookie('refreshToken', refreshToken)

//             return res.json({ accessToken: accessToken, refreshToken: refreshToken });
//         }
        
//         // REGISTER NEW USER
//         const new_user = new User({
//             sub: decoded.sub,
//             first_name: "User",
//             register_date: new Date(),
//             birth_date: null,
//         })

//         const accessToken = jwt.sign({
//             user_id: new_user._id,
//             email_verified: false,
//             phone_number_verified: false,
//             identity_verified: false
//         // }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
//         }, process.env.ACCESS_TOKEN_SECRET)

//         const refreshToken = jwt.sign({
//             user_id: new_user._id,
//             email_verified: false,
//             phone_number_verified: false,
//             identity_verified: false
//         }, process.env.REFRESH_TOKEN_SECRET)

//         new_user.refreshToken = refreshToken
//         await new_user.save()

//         res.cookie('accessToken', accessToken)
//         res.cookie('refreshToken', refreshToken)

//         return res.json({ accessToken: accessToken, refreshToken: refreshToken });

//     });

// })

// // Βρες το σωστό public key με βάση το kid του token
// function getAppleKey(header, callback) {
//   client.getSigningKey(header.kid, function (err, key) {
//     if (err) {
//       return callback(err);
//     }
//     const signingKey = key.getPublicKey();
//     callback(null, signingKey);
//   });
// }

// GET USER INFO
router.get('/me', async (req, res) => {
    try {
        if (!req.user) return res.json({ error: 'Not authenticated' });
        
        const user = await User.findById(req.user.user_id).select('-password -refreshToken');
        if (!user) return res.json({ error: 'User not found' });
        
        const response = { 
            user: { 
                id: user._id, 
                email: user.email, 
                name: user.first_name + ' ' + user.last_name || user.username || 'User' 
            } 
        };

        // If token was refreshed, include new access token
        if (res.locals.newAccessToken) {
            response.newAccessToken = res.locals.newAccessToken;
        }

        return res.json(response);
    } catch(e) {
        console.error(e);
        return res.json({ error: 'ERROR' });
    }
});

module.exports = router

