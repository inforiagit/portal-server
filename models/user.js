const mongoose = require('mongoose')
const userschema = new mongoose.Schema({
    googleId: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    username: {
        type:String,
    },
    first_name: {
        type:String,
    },
    last_name: {
        type:String,
    },
    birth_date: {
        type:Date
    },
    gender: {
        type:String,
    },
    email: {
        type:String,
    },
    phone_number: {
        type:Number,
    },
    password: {
        type:String,
    },
    cv: {
        type:String,
        required:false,
        default: ''
    },
    profile_photo: {
        type:String,
        required:false,
        default: '/assets/avatar.svg'
    },
    register_date: {
        type:Date,
        default:new Date()
    },
    verified: {
        type:Boolean,
        default:0,
        required:false
    },
    verification_key: {
        type:String,
        required:false
    },
    conversations: {
        type: [mongoose.SchemaTypes.ObjectId],
        ref: 'users'
    },
    address: {
        type:String,
        required:false
    },
    description: {
        type:String,
        required:false
    },
    city: {
        type:String,
        required:false
    },
    street: {
        type:String,
        required:false
    },
    street_number: {
        type:String,
        required:false
    },
    tk: {
        type:String,
        required:false
    },
    id_number: {
        type:String,
        required:false
    },
    ama: {
        type:String,
        required:false
    },
    amka: {
        type:String,
        required:false
    },
    iban: {
        type:String,
        required:false
    },
    afm: {
        type:String,
        required:false
    },
    refreshToken: {
        type:String,
        default:null
    },
    expoToken: {
        type:String,
        default:null
    },
    adminExpoToken: {
        type:String,
        default:null
    },
    lastSeen: {
        type:Date,
        default: null
    },
    notifications_status: {
        type: Boolean,
        default: false
    },
    bank:{
        type:String,
        default:null
    },
    deleted: {
        type: Boolean,
        default: false
    },
    deleted_date: {
        type: Date,
        default: null
    },
    user_object:{
        type: Object,
        default: null
    },
    email_verified: {
        type: Boolean,
        default: false
    },
    phone_number_verified: {
        type: Boolean,
        default: false
    },
    identity_verified: {
        type: Boolean,
        default: false
    },
    otp:{
        type: String,
        default: null
    },
    otp_expiry: {
        type: Date,
        default: null
    },
    id_files:{
        type: Array,
        default: []
    },
    sub:{
        type: String,
        default: null
    }

})

module.exports = mongoose.model('users', userschema)