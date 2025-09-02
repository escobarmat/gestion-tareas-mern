const { Router} = require('express');
const { getProjectForUser, createProject, updatedProject, deletedProject, removeCollaboratorFromProject } = require('../controllers/projectControllers');
const { isTokenValid } = require('../middlewares/isTokenValid');
const { validateField } = require('../middlewares/validateField');
const { check } = require('express-validator');
const router = Router();

router.use(isTokenValid);

router.get('/',
    getProjectForUser
)

router.post('/new',
    [
        check('name', 'El nombre es obligatorio').not().isEmpty(),
        check('name', 'El nombre debe tener al menos 3 caracteres').isLength({ min: 3 }),
        check('createdBy')
        .notEmpty().withMessage('El nombre de usuario del creador es obligatorio'),
        check('collaborators')
        .optional()
        .isArray().withMessage('Los colaboradores deben estar en un array'),
        check('collaborators')
        .custom((collaborators, { req }) => {
        if (!Array.isArray(collaborators)) return true;

        const hasDuplicates = new Set(collaborators).size !== collaborators.length;
        if (hasDuplicates) {
            throw new Error('No se permiten IDs duplicados en colaboradores');
        }

        if (collaborators.includes(req.body.createdBy)) {
            throw new Error('El creador no puede ser colaborador');
        }

        return true;
        }),
        validateField,
    ],
    createProject
)

router.put('/:id',
    [
        check('name', 'El nombre es obligatorio').not().isEmpty(),
        check('name', 'El nombre debe tener al menos 3 caracteres').isLength({ min: 3 }),
        check('createdBy')
        .notEmpty().withMessage('El nombre de usuario del creador es obligatorio'),
        check('collaborators')
        .optional()
        .isArray().withMessage('Los colaboradores deben estar en un array'),
        check('collaborators')
        .custom((collaborators, { req }) => {
        if (!Array.isArray(collaborators)) return true;

        const hasDuplicates = new Set(collaborators).size !== collaborators.length;
        if (hasDuplicates) {
            throw new Error('No se permiten IDs duplicados en colaboradores');
        }

        if (collaborators.includes(req.body.createdBy)) {
            throw new Error('El creador no puede ser colaborador');
        }

        return true;
        }),
        validateField,
    ],
    updatedProject
)

router.delete('/:id',
    deletedProject
)

router.delete('/:id/collaborator', removeCollaboratorFromProject);


module.exports = router;