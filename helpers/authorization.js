const Project = require('../models/Project');

const isUserAuthorized = async (projectId, uid) => {
    try {
        const project = await Project.findById(projectId).populate('collaborators', '_id');

        if (!project) {
        return { authorized: false, reason: 'Proyecto no encontrado' };
        }

        const creatorId = project.createdBy.toString();
        const collaboratorIds = project.collaborators.map(c => c._id.toString());

        const validUserIds = [creatorId, ...collaboratorIds];

        const isAuthorized = validUserIds.includes(uid.toString());

        return {
        authorized: isAuthorized,
        reason: isAuthorized ? null : 'No tiene privilegios para modificar este proyecto',
        project,
        };
    } catch (error) {
        console.error('Error en isUserAuthorized:', error);
        return { authorized: false, reason: 'Error interno del servidor' };
    }
};

module.exports = { isUserAuthorized };
