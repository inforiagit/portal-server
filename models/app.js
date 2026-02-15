const mongoose = require('mongoose')
const appschema = new mongoose.Schema({
    creator_id: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'users'
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    updatedAt: {
        type:Date,
        default: () => Date.now()
    },
    title: {
        type:String,
        required:true
    },
    url: {
        type:String,
        required:true
    },
    icon: {
        type:String,
        required:true
    },
    description: {
        type:String,
        default: ''
    }
})

module.exports = mongoose.model('apps', appschema)