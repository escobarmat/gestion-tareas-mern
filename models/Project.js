const { Schema, model } = require('mongoose');

const projectSchema = new Schema({
    name: { type: String, required: true },

    // Referencia al usuario creador del proyecto
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Array de referencias a usuarios colaboradores
    collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    
}, {
    timestamps: true // createdAt y updatedAt automáticos
});

projectSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

module.exports = model('Project', projectSchema);

