const { Schema, model } = require('mongoose');

// Subdocumento para los comentarios
const commentSchema = new Schema({
    text: { 
        type: String, required: true 
    },
    createdBy: { 
        type: Schema.Types.ObjectId, ref: 'User', required: true 
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
    });

    // Schema principal para las tareas
    const taskSchema = new Schema({
    name: { 
        type: String, required: true 
    },
    status: {
        type: String,
        enum: ['no-seleccion', 'in-progress', 'done', 'review'],
        default: 'no-seleccion',
    },
    createdBy: { 
        type: Schema.Types.ObjectId, ref: 'User', required: true 
    },
    modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },  
    projectId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Project', required: true 
    },
    comments: [commentSchema], // Embebido como array de subdocumentos
    }, {
    timestamps: true
});

commentSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

taskSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

module.exports = model('Task', taskSchema);
