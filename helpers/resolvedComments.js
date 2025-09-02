const User = require("../models/User");

const resolveCommentAuthors = async (comments = []) => {
    const resolved = [];
    const errors = [];

    for (const comment of comments) {
        const user = await User.findOne({ username: comment.createdBy });
        if (!user) {
        errors.push(`Usuario ${comment.createdBy} no encontrado para el comentario "${comment.text}"`);
        } else {
        resolved.push({
            text: comment.text,
            createdBy: user._id,
        });
        }
    }

    return { resolved, errors };
};

module.exports = { resolveCommentAuthors };
