import { Schema, model, models, Document, Model } from "mongoose";

export interface IUser {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // SaaS specific fields
  telegramChatId?: string;
  telegramBotToken?: string; // If they bring their own bot

  // Auth fields
  pin?: string; // Hashed PIN for quick login
}

export interface UserDocument extends IUser, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    telegramChatId: { type: String },
    telegramBotToken: { type: String },

    pin: { type: String },
  },
  {
    timestamps: true,
  },
);

// Prevent overwrite on hot reload
const User =
  (models.User as Model<UserDocument>) ||
  model<UserDocument>("User", UserSchema);

export default User;
