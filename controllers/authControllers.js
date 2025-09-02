const {response} = require('express');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateJWT } = require('../helpers/jwt');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const searchUsersForUsername = async (req, res = response) => {
    const { searchTerm } = req.query;

    try {
        const usersFound = await User.find({
            username: { $regex: searchTerm, $options: 'i' } // 'i' para búsqueda case-insensitive
        });

        const users = {
            users: usersFound.map(user => ({
                id: user.id,
                name: user.name,
                username: user.username,
            }))
        };

        res.status(200).json(users);
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({ msg: 'Error al buscar usuarios' });
    }
};

const isValidUsername = async (req, res = response) => {
    const { username } = req.body;

    try {
        const userMatched = await User.findOne({ username });
        console.log(username, userMatched);
        

        if (userMatched) {
        return res.status(409).json({ // 409 Conflict → username no disponible
            ok: false,
            msg: "Ya existe un usuario con ese username",
        });
        }

        return res.status(200).json({ // username disponible
        ok: true,
        msg: "El username está disponible",
        });

    } catch (error) {
        console.error("Error al verificar el username:", error);

        return res.status(500).json({ // 500 Internal Server Error
        ok: false,
        msg: "Ocurrió un error al verificar el username",
        });
    }
};


const createUsername = async (req, res = response) => {
    const { name ,email, username } = req.body;

    try {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({
                ok: false,
                msg: "Ya existe un usuario con ese username.",
            });
        }

        const userCreate = await User.create({
            name,
            email,
            username,
            password:'',
            role: 'user',
            isGoogleAuthenticated: true
        })

        if (userCreate) {

            const jwt = await generateJWT(userCreate.id, userCreate.name, userCreate.username);
            return res.status(200).json({
                ok: true,
                uid: userCreate.id,
                name: userCreate.name,
                email: userCreate.email,
                username: userCreate,username,
                role: userCreate.role,
                token: jwt,
            });
        }

    } catch (error) {
        console.error("Error al actualizar el username:", error);
        return res.status(500).json({
        ok: false,
        msg: "Ocurrió un error inesperado.",
        });
    }
};


const loginGoogle = async(req, res = response) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ ok: false, msg: 'No se recibió el código de Google' });
    }

    try {
        // INTERCAMBIO de code por tokens
        const googleTokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI, // Debe coincidir con el configurado en Google
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await googleTokenRes.json();
        const { access_token } = tokenData;
        

        // Obtener perfil del usuario desde Google
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const { email, name } = await googleRes.json();
        

        // Buscar o crear usuario en tu base de datos
        let usuario = await User.findOne({ email });

        if (!usuario) {
            console.log(usuario);
            
            return res.status(200).json(
                { 
                    ok: false, 
                    name, 
                    email 
                });
        }

        const jwt = await generateJWT(usuario.id, usuario.name, usuario.username);

        return res.status(200).json({
            ok: true,
            uid: usuario.id,
            name: usuario.name,
            email: usuario.email,
            role: usuario.role,
            isGoogleAuthenticated: usuario.isGoogleAuthenticated,
            username: usuario.username,
            token: jwt,
        });

    } catch (error) {
        console.error("Error al autenticar con Google:", error);
        return res.status(500).json({ ok: false, msg: 'Error al validar código de Google' });
    }
};



const registerUser = async(req, res = response ) => {

    const { email, username,  password } = req.body;

    try {

        let user = await User.findOne({ email });
        
        if( user ){
            return res.status(400).json({
                ok: false,
                msg: 'Un usuario existe con ese correo',
            });
        }
        let searchUsername = await User.findOne({username})
        if( searchUsername ){
            return res.status(400).json({
                ok: false,
                msg: 'El username no esta disponible',
            });
        }
        
        const newUser = new User( req.body);

        //Encriptar Contraseña
        const salt = bcrypt.genSaltSync();
        newUser.password = bcrypt.hashSync( password, salt );
    
        await newUser.save();

        //Generar JWT 
        const token = await generateJWT( newUser.id, newUser.name, newUser.username );
        
        return res.status(201).json({
            ok: true,
            uid: newUser.id,
            name: newUser.name,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role,
            isGoogleAuthenticated: newUser.isGoogleAuthenticated,
            token,
            msg: 'Usuario creado exitosamente',
        });    
        
    } catch (error) {
        console.log(error);
        
        res.status(500).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

const loginUser = async(req, res = response) => {
    
    const { email, password } = req.body;

    try {
        const userFound = await User.findOne({ email });
        
        if( !userFound ){
            return res.status(400).json({
                ok: false,
                msg: ' Credenciales incorrectas',
            });
        }

        //Confirmar contraseñas
        const validPassword = bcrypt.compareSync( password, userFound.password );

        if( !validPassword ){
            return res.status(400).json({
                ok: false,
                msg: 'Credenciales Incorrectas',
            })
        }

        // Generar JWT
        const token = await generateJWT( userFound.id, userFound.name, userFound.username );

        return res.json({
            ok: true,
            uid: userFound.id,
            name: userFound.name,
            email: userFound.email,
            username: userFound.username,
            role: userFound.role,
            isGoogleAuthenticated: userFound.isGoogleAuthenticated,
            token,
        })


    } catch (error) {
        console.log(error);
        
        res.status(500).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }  

}

const updatedToken = async(req, res = response ) => {

    const { uid, name, username } = req;
    
    try{
        //Generar JWT
        const token = await generateJWT( uid, name, username );
        const user = await User.findById(uid);
    
        res.status(200).json({
            ok: true,
            uid,
            name,
            username,
            email: user.email,
            role: user.role,
            isGoogleAuthenticated: user.isGoogleAuthenticated,
            token,
        });    

    }catch{
        res.status(400).json({
            ok: false,
            msg: 'No se pudo actualizar el token',
        });   
    }

}


module.exports = {
    searchUsersForUsername,
    loginUser,
    loginGoogle,
    createUsername,
    isValidUsername,
    registerUser,
    updatedToken,
}