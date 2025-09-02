/*
    Rutas de Usuarios/ auth
    host + /api/auth
*/
const { Router} = require('express');
const { check } = require('express-validator');
const { loginGoogle, createUsername, isValidUsername, registerUser, loginUser, updatedToken, searchUsersForUsername } = require('../controllers/authControllers');
const { isTokenValid } = require('../middlewares/isTokenValid');
const { validateField } = require('../middlewares/validateField');
// const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.post('/'
    ,
    [
        check('email','El email es obligatorio').isEmail(),
        check('password','El password debe de ser de 6 caracteres').isLength({min:6}),
        validateField,
    ], 
    loginUser 
);

router.post(
    '/new', 
    [//middlewares
        check('name','El nombre es obligatorio').not().isEmpty(),
        check('email','El email es obligatorio').isEmail(),
        check('password','El password debe de ser de 6 caracteres').isLength({min:6}),
        check('username','El nombre de usuario es obligatorio').not().isEmpty(),
        validateField,
    ], 
    registerUser
);


router.post('/google',
    loginGoogle
);

router.post('/google/create-username',
    [
        check('username', 'El nombre de usuario es obligatorio').not().isEmpty(),
        validateField,
    ],
    createUsername    
)

router.post('/is-valid-username',
    isValidUsername
)

router.get('/renew', 
    isTokenValid,
    updatedToken
);

router.get('/search-users',
    searchUsersForUsername
)

module.exports = router;