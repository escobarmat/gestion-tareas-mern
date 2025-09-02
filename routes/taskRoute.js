const { Router} = require('express');
const { getTaskForProjectId, createTask, updatedTask, deleteTask, updateTaskStatus, editCommentForId, deleteCommentForId, addCommentforTask } = require('../controllers/taskControllers');
const { isTokenValid } = require('../middlewares/isTokenValid');
const { check } = require('express-validator');
const { validateField } = require('../middlewares/validateField');
const router = Router();

router.use(isTokenValid);

router.post('/',
    getTaskForProjectId
)

router.post('/new',
    [
        check('name')
            .notEmpty().withMessage('El nombre de la tarea es obligatorio'),
        check('status')
            .isIn(['no-seleccion', 'in-progress', 'done', 'review'])
            .withMessage('El estado no es válido'),
        check('createdBy')
            .notEmpty().withMessage('El nombre de usuario del creador es obligatorio'),
        check('projectId')
            .isMongoId().withMessage('El ID del proyecto no es válido'),
        check('comments')
            .optional()
            .isArray().withMessage('Los comentarios deben estar en un array'),
        check('comments.*.text')
            .notEmpty().withMessage('Cada comentario debe tener texto'),
        check('comments.*.createdBy')
            .notEmpty().withMessage('El creador de cada comentario es obligatorio'),
            validateField
    ],
    createTask
)

router.put('/:id',[
        [
        check('name')
            .notEmpty().withMessage('El nombre de la tarea es obligatorio'),
        check('createdBy')
            .notEmpty().withMessage('El nombre de usuario del creador es obligatorio'),
        check('projectId')
            .isMongoId().withMessage('El ID del proyecto no es válido'),
        check('comments')
            .optional()
            .isArray().withMessage('Los comentarios deben estar en un array'),
        check('comments.*.text')
            .notEmpty().withMessage('Cada comentario debe tener texto'),
        check('comments.*.createdBy')
            .notEmpty().withMessage('El creador de cada comentario es obligatorio'),
            validateField
    ],
],
    updatedTask
)

router.patch('/:id/status',[
        [
        check('status')
            .isIn(['no-seleccion', 'in-progress', 'done', 'review'])
            .withMessage('El estado no es válido'),
        validateField
    ],
],
    updateTaskStatus
)

router.delete('/:id',
    deleteTask
)

router.patch('/comments/:id/edit',[
    check('commentText')
        .isLength({ min: 4 })
        .withMessage('El comentario debe tener al menos 4 letras'),
    check('commentId')
        .isMongoId()
        .withMessage('El ID del comentario no es válido')],
        validateField,
    editCommentForId
)

router.patch('/comments/:id/new',[
    check('commentText')
        .isLength({ min: 4 })
        .withMessage('El comentario debe tener al menos 4 letras')],
        validateField,
    addCommentforTask
)
router.delete('/comments/:id/delete',
    deleteCommentForId
)


module.exports = router;