import mongoose, { Schema, Document } from 'mongoose';


const roles = ['admin', 'user'] as const;
type TRole = (typeof roles)[number];


export type TUser = Document & {
    firebase_uid: string;
    name: string;
    email: string;
    role: TRole;
    last_login: Date;
    created_at: Date;
    updated_at: Date;
};


const userSchema = new Schema<TUser>({
    firebase_uid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: roles, default: 'user' },
    last_login: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const User = mongoose.model<TUser>('User', userSchema);
