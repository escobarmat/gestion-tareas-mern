const Project = require("../models/Project");
const {response} = require('express');
const User = require("../models/User");



const getProjectForUser = async (req, res=response) => {
    const { username } = req.query;

    try {
        // Buscar el usuario por username
        const user = await User.findOne({ username: { $regex: username, $options: 'i' } });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Buscar proyectos creados por el usuario
        const createdProjects = await Project.find({ createdBy: user._id }).populate('createdBy collaborators');

        // Buscar proyectos donde el usuario colabora
        const collaboratorsProjects = await Project.find({ collaborators: user._id }).populate('createdBy collaborators');
        if (!createdProjects.length && !collaboratorsProjects.length) {
            return res.status(200).json({
                ok: true,
                msg: "No hay Proyectos de este usuario"
            });
        }


        return res.status(200).json({
            ok: true,
            createdProjects,
            collaboratorsProjects,
        });

    } catch (error) {
        console.error('Error al buscar proyectos para el usuario:', error);
        return res.status(500).json({ message: 'Error en la búsqueda de proyectos' });
    }
};

const createProject = async (req, res = response) => {
    const { name, createdBy, collaboratingProyectUsernames } = req.body;

    try {
        const creator = await User.findOne({ username: createdBy });
        if (!creator) {
            return res.status(400).json({
                ok: false,
                msg: 'El usuario creador no existe'
            });
        }

        const collaboratorDocs = await User.find({ username: { $in: collaboratingProyectUsernames } });

        if (collaboratorDocs.length !== collaboratingProyectUsernames.length) {
            const foundUsernames = collaboratorDocs.map(u => u.username);
            const invalidUsernames = collaboratingProyectUsernames.filter(u => !foundUsernames.includes(u));
            return res.status(400).json({
                ok: false,
                msg: 'Uno o más colaboradores no existen',
                invalidUsernames
            });
        }

        // Crear proyecto
        const newProject = await Project.create({
            name,
            createdBy: creator._id,
            collaborators: collaboratorDocs.map(c => c._id)
        });

        // Poblar los datos para mostrar en frontend
        const populatedProject = await Project.findById(newProject._id)
            .populate('createdBy', 'username') // Campos específicos
            .populate('collaborators', 'username');

            const projectCreated = {
                id: populatedProject._id,
                name: populatedProject.name,
                createdBy: {
                    id: populatedProject.createdBy._id,
                    username: populatedProject.createdBy.username
                },
                collaborators: collaboratorDocs.map(c => ({
                    id: c._id,
                    username: c.username
                }))
            }

        return res.status(200).json({
            ok: true,
            project: projectCreated,
            msg: 'Proyecto creado correctamente'
        });

    } catch (error) {
        console.error('Error al crear el proyecto:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Algo salió mal al crear el proyecto'
        });
    }
};



const updatedProject = async (req, res = response) => {
    const projectId = req.params.id;
    const uid = req.uid;
    const { name, collaboratingProyectUsernames } = req.body;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ ok: false, msg: 'Proyecto no existe por ese id' });
        }

        if (project.createdBy.toString() !== uid) {
            return res.status(401).json({ ok: false, msg: 'No tiene privilegio de editar este proyecto' });
        }

        // Validar colaboradores
        const collaboratorDocs = await User.find({ username: { $in: collaboratingProyectUsernames } });

        if (collaboratorDocs.length !== collaboratingProyectUsernames.length) {
            const foundUsernames = collaboratorDocs.map(u => u.username);
            const invalidUsernames = collaboratingProyectUsernames.filter(u => !foundUsernames.includes(u));
            return res.status(400).json({
                ok: false,
                msg: 'Uno o más colaboradores no existen',
                invalidUsernames
            });
        }

        // Armar nuevos datos
        const updatedData = {
            name,
            collaborators: collaboratorDocs.map(u => u._id)
        };

        // Actualizar y poblar
        const updatedProject = await Project.findByIdAndUpdate(projectId, updatedData, { new: true })
            .populate('createdBy', 'username')
            .populate('collaborators', 'username');

        return res.json({
            ok: true,
            projectUpdated: updatedProject,
            msg: 'Proyecto actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar el proyecto:', error);
        res.status(500).json({ ok: false, msg: 'Hable con el administrador' });
    }
};



const deletedProject = async(req, res = response) => {

        const projectId = req.params.id;
    const uid = req.uid;
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                ok: false,
                msg: 'El proyecto no existe por ese id'
            });
        }
        if (project.createdBy.toString() !== uid) {
            return res.status(401).json({
                ok: false,
                msg: 'No tiene privilegio de eliminar este proyecto'
            });
        }

        await Project.findByIdAndDelete(projectId);

        return res.status(200).json({
            ok: true,
            msg: "Proyecto eliminado correctamente",
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
        
    }
}

const removeCollaboratorFromProject = async (req, res = response) => {
    const projectId = req.params.id;
    const uid = req.uid;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                ok: false,
                msg: 'Proyecto no encontrado',
            });
        }

        // Si el usuario es el creador, no puede salir
        if (project.createdBy.toString() === uid) {
            return res.status(400).json({
                ok: false,
                msg: 'El creador no puede salir del proyecto',
            });
        }

        // Eliminar al colaborador
        project.collaborators = project.collaborators.filter(
            collaboratorId => collaboratorId.toString() !== uid
        );

        await project.save();

        return res.status(200).json({
            ok: true,
            msg: 'Has salido del proyecto exitosamente',
        });

    } catch (error) {
        console.error('Error al salir del proyecto:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Ocurrió un error, hable con el administrador',
        });
    }
};


module.exports = {
    getProjectForUser,
    createProject,
    updatedProject,
    deletedProject,
    removeCollaboratorFromProject,
}