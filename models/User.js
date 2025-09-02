const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    username:  { type: String, required: true, unique: true },
    password:  { type: String }, // Optional; podría omitirse si es Google-auth
    role:      {
        type: String,
        enum: ['admin', 'user'],
        default: 'user',
    },
    isGoogleAuthenticated: {
        type: Boolean,
        default: false,
    },
    }, {
    timestamps: true
});

module.exports = model('User', userSchema);
