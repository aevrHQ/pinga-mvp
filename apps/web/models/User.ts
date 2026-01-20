import { Schema, model, models, Document, Model } from "mongoose";

export interface IUser {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // SaaS specific fields
  telegramChatId?: string; // @deprecated
  telegramBotToken?: string; // @deprecated

  // channels: moved to Channel model

  preferences: {
    aiSummary: boolean;
    allowedSources: string[];
  };

  // Auth fields
  pin?: string; // Hashed PIN for quick login

  // Chat History
  chatHistory?: {
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }[];
}

export interface UserDocument extends IUser, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },

    // Legacy fields (kept for backward compatibility)
    telegramChatId: { type: String },
    telegramBotToken: { type: String },

    // New Multi-channel System
    // Channels are now in their own model "Channel"

    // Preferences
    preferences: {
      aiSummary: { type: Boolean, default: false }, // Enable AI summary
      allowedSources: { type: [String], default: [] }, // If empty, allow all. Else only allow specific sources.
      // Future: tone, concise vs detailed, etc.
    },

    pin: { type: String },

    chatHistory: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
