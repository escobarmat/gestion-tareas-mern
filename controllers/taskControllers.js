const { response } = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const mongoose = require('mongoose');
const { isUserAuthorized } = require('../helpers/authorization');
const { resolveCommentAuthors } = require('../helpers/resolvedComments');
const Project = require('../models/Project');

const getTaskForProjectId = async (req, res = response) => {
    
    const projectIds = req.body.projectIds.split(',');
    


    try {
        if(projectIds.length === 0){
            return res.status(200).json({
                ok: false,
                msj: 'No hay proyectos'
            })
        }

        const objectProjectIds = projectIds.map(id => new mongoose.Types.ObjectId(id));



        // Buscar tareas que pertenezcan a cualquiera de esos proyectos
        const tasks = await Task.find({ projectId: { $in: objectProjectIds } })
            .populate('createdBy', 'username  ')
            .populate('modifiedBy', 'username  ')
            .populate('projectId', 'name')
            .populate('comments', 'text')
            .populate('comments.createdBy', 'username');
        
        if(tasks.length === 0){
            return res.status(200).json({
                ok: true,
                msj: 'No hay tareas'
            })
        }

        const taskReturn = tasks.map(task => {
            return {
                id: task._id,
                name: task.name,
                status: task.status,
                createdBy: task.createdBy.username,
                modifiedBy: task.modifiedBy?.username ?? 'no-modified',
                projectId: task.projectId.id,
                comments: task.comments.map(comment => ({
                    id: comment._id,
                    text: comment.text,
                    createdBy: comment.createdBy.username
                }))
            };
        });

        return res.status(200).json({
            ok: true,
            tasks: taskReturn,
        });

    } catch (error) {
        console.error('Error al obtener tareas:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al obtener tareas'
        });
    }
};

const createTask = async (req, res = response) => {
    const { projectId, createdBy, name, status, comments } = req.body;
    const uid = req.uid;

    try {
        // Verificar autorización
        const { authorized, reason, project } = await isUserAuthorized(projectId, uid);

        if (!authorized) {
            return res.status(reason === 'Proyecto no encontrado' ? 400 : 403).json({
                ok: false,
                msg: reason,
            });
        }

        // Buscar al usuario creador por username
        const user = await User.findOne({ username: createdBy });
            if (!user) {
            return res.status(400).json({
                ok: false,
                msg: 'El usuario no existe',
            });
        }

        // Convertir los usernames de los comentarios en ObjectIds
        const { resolved, errors } = await resolveCommentAuthors(comments);
        if (errors.length > 0) {
            return res.status(400).json({ ok: false, errors });
        }

        // Crear la tarea
        const taskData = {
            name,
            status,
            comments: resolved,
            projectId: project._id,
            createdBy: user._id,
            modifiedBy: null,
        };

        const newTask = await Task.create(taskData);

        // Popular los campos deseados
        const populatedTask = await Task.findById(newTask._id)
        .populate('createdBy', 'username')
        .populate('modifiedBy', 'username')
        .populate('projectId')
        .populate('comments.createdBy', 'username');

        const cleanTask = {
            id: populatedTask._id,
            name: populatedTask.name,
            status: populatedTask.status,
            comments: populatedTask.comments,
            createdBy: populatedTask.createdBy.username,
            modifiedBy: populatedTask.modifiedBy?.username ?? 'no-modified',
            project: populatedTask.projectId,
        };

        return res.status(200).json({
            ok: true,
            task: cleanTask,
            msg: 'Tarea creada correctamente',
        });

    } catch (error) {
        console.error('Error al crear la tarea:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Ocurrió un error, hable con el administrador',
        });
    }
};


const updatedTask = async (req, res = response) => {
    const { projectId, createdBy, comments, modifiedBy } = req.body;
    
    const uid = req.uid;
    const id = req.params.id;

    try {
        // Verificar autorización
        const { authorized, reason } = await isUserAuthorized(projectId, uid);

        if (!authorized) {
            return res.status(reason === 'Proyecto no encontrado' ? 404 : 403).json({
                ok: false,
                msg: reason,
            });
        }

        // Buscar al creador por username
        const creator = await User.findOne({ username: createdBy });
        if (!creator) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario creador no encontrado',
            });
        }

        const modifier = await User.findById(uid);
        if (!modifier) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario modificador no encontrado',
            });
        }


        
        // Convertir los usernames de los comentarios en ObjectIds
        const { resolved, errors } = await resolveCommentAuthors(comments);
        if (errors.length > 0) {
            return res.status(400).json({ ok: false, errors });
        }


        const newTask = {
            ...req.body,
            comments: resolved,
            createdBy: creator._id,
            modifiedBy: modifier._id,
        };

        const taskUpdated = await Task.findByIdAndUpdate(id, newTask, {
        new: true,
        }).populate('createdBy', 'username')
        .populate('modifiedBy', 'username')
        .populate('comments.createdBy', 'username');
        const sendTask ={
            id: taskUpdated.id,
            name: taskUpdated.name,
            status: taskUpdated.status,
            createdBy: taskUpdated.createdBy.username,
            modifiedBy: taskUpdated.modifiedBy?.username ?? 'no-modified',
            projectId: taskUpdated.projectId,
            comments: taskUpdated.comments.map((c) => {
                return{
                    id: c.id,
                    text: c.text,
                    createdBy: c.createdBy.username
                }
            })
        }

        return res.status(200).json({
            ok: true,
            task: sendTask,
        });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Ocurrió un error, hable con el administrador',
        });
    }
};

const deleteTask = async (req, res = response) => {
    const uid = req.uid;
    const id = req.params.id;
    const projectId = req.query.projectId;
    try {
        // Verificar autorización
        const { authorized, reason } = await isUserAuthorized(projectId, uid);

        if (!authorized) {
            return res.status(reason === 'Proyecto no encontrado' ? 400 : 403).json({
                ok: false,
                msg: reason,
            });
        }

        // Verificar que la tarea exista
        const taskSelected = await Task.findById(id);
        if (!taskSelected) {
            return res.status(404).json({
                ok: false,
                msg: 'La tarea no existe',
            });
        }

        // Eliminar la tarea
        await Task.findByIdAndDelete(id);

        return res.status(200).json({
            ok: true,
            msg: 'Tarea eliminada correctamente',
        });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Ocurrió un error, hable con el administrador',
        });
    }
};

const updateTaskStatus = async (req, res = response) => {
    const { status, projectId } = req.body;
    const uid = req.uid;
    const id = req.params.id;

    try {
        const { authorized, reason } = await isUserAuthorized(projectId, uid);
        if (!authorized) {
            return res.status(reason === 'Proyecto no encontrado' ? 404 : 403).json({
                ok: false,
                msg: reason,
            });
        }

        const task = await Task.findByIdAndUpdate(id, { status }, { new: true });
        if (!task) {
            return res.status(404).json({ ok: false, msg: 'Tarea no encontrada' });
        }

        return res.status(200).json({ ok: true, task });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        return res.status(500).json({ ok: false, msg: 'Error interno' });
    }
};

const editCommentForId = async (req, res = response) => {
    const taskId = req.params.id;
    const { commentId, commentText } = req.body;
    const uid = req.uid;  

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(400).json({
                ok: false,
                msg: 'La tarea no existe.',
            });
        }

        const project = await Project.findById(task.projectId);
        if (!project) {
        return res.status(400).json({ ok: false, msg: 'El proyecto no existe.' });
        }

        const isCreator = project.createdBy.toString() === uid;
        const isCollaborator = project.collaborators.includes(uid);
        console.log(isCreator, isCollaborator);
        

        if (!isCreator && !isCollaborator) {
            return res.status(403).json({ ok: false, msg: 'No tienes permisos para editar comentarios en esta tarea.'
            });
        }

        const comment = task.comments.find(c => c.id.toString() === commentId);
        if (!comment) {
        return res.status(404).json({ ok: false, msg: 'Comentario no encontrado.' });
        }

        if (comment.createdBy.toString() !== uid) {
        return res.status(403).json({ ok: false, msg: 'No tienes privilegios para editar este comentario.' });
        }

        comment.text = commentText;
        await task.save();

        return res.status(200).json({
            ok: true,
            msg: 'Comentario editado correctamente.',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
};

const deleteCommentForId = async (req, res = response) => {
    const uid = req.uid;
    const commentId  = req.query.commentId;
    const taskId = req.params.id;
    

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(400).json({
                ok: false,
                msg: 'La tarea no existe.',
            });
        }

        const project = await Project.findById(task.projectId);
        if (!project) {
            return res.status(400).json({ ok: false, msg: 'El proyecto no existe.' });
        }

        const isCreator = project.createdBy.toString() === uid;
        const isCollaborator = project.collaborators.includes(uid);

        if (!isCreator && !isCollaborator) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para eliminar comentarios en esta tarea.',
            });
        }

        const comment = task.comments.find(c =>c.id.toString() === commentId);
        
        if (!comment) {
            return res.status(404).json({ ok: false, msg: 'Comentario no encontrado.' });
        }

        if (comment.createdBy.toString() !== uid) {
            return res.status(403).json({ ok: false, msg: 'No tienes privilegios para eliminar este comentario.' });
        }

        task.comments = task.comments.filter(c => c.id.toString() !== commentId);
        await task.save();

        return res.status(200).json({
            ok: true,
            msg: 'Comentario eliminado correctamente.',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
};

const addCommentforTask = async( req, res = response) => {
        const taskId = req.params.id;
    const { commentText } = req.body;
    const uid = req.uid;  

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(400).json({
                ok: false,
                msg: 'La tarea no existe.',
            });
        }

        const project = await Project.findById(task.projectId);
        if (!project) {
        return res.status(400).json({ ok: false, msg: 'El proyecto no existe.' });
        }

        const isCreator = project.createdBy.toString() === uid;
        const isCollaborator = project.collaborators.includes(uid);
        console.log(isCreator, isCollaborator);
        

        if (!isCreator && !isCollaborator) {
            return res.status(403).json({ ok: false, msg: 'No tienes permisos para crear comentarios en esta tarea.'
            });
        }

        if (!commentText || commentText.trim().length < 6) {
            return res.status(400).json({ ok: false, msg: 'El comentario debe tener al menos 6 caracteres.' });
        }


        const newComment = {
            text: commentText,
            createdBy: uid,
        };

        task.comments.push(newComment);

        await task.save();

        const createdCommentId = task.comments[task.comments.length - 1]._id;
        
        const populatedTask = await Task.findById(taskId)
        .populate('createdBy', 'username')
        .populate('modifiedBy', 'username')
        .populate('projectId', 'name')
        .populate('comments.createdBy', 'username');
        
        const lastComment = populatedTask.comments.find(
        c => c._id.toString() === createdCommentId.toString()
        );
        
        const returnComment = {
            id: lastComment.id,
            text: lastComment.text,
            createdBy: lastComment.createdBy.username,
        }

        return res.status(200).json({
            ok: true,
            comment: returnComment,
            msg: 'Comentario agregado correctamente.',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
}


module.exports = {
    getTaskForProjectId,
    createTask,
    updatedTask,
    deleteTask,
    updateTaskStatus,
    editCommentForId,
    deleteCommentForId,
    addCommentforTask
}