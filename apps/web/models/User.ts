import { Schema, model, models, Document, Model } from "mongoose";

export interface IUser {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // SaaS specific fields
  telegramChatId?: string; // @deprecated
  telegramBotToken?: string; // @deprecated

  channels: {
    type: "telegram" | "discord" | "whatsapp" | "slack" | "email";
    config: unknown;
    enabled: boolean;
    name?: string;
    webhookRules?: {
      sources: {
        type: string;
        enabled: boolean;
        filters: {
          repositories?: string[];
          eventTypes?: string[];
          services?: string[];
          [key: string]: unknown;
        };
      }[];
    };
  }[];

  preferences: {
    aiSummary: boolean;
    allowedSources: string[];
  };

  // Auth fields
  pin?: string; // Hashed PIN for quick login
}

export interface UserDocument extends IUser, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },

    // Legacy fields (kept for backward compatibility)
    telegramChatId: { type: String },
    telegramBotToken: { type: String },

    // New Multi-channel System
    channels: [
      {
        type: {
          type: String,
          enum: ["telegram", "discord", "whatsapp", "slack", "email"],
          required: true,
        },
        config: { type: Schema.Types.Mixed, default: {} }, // e.g., { chatId: "...", webhookUrl: "...", isGroupChat: false }
        enabled: { type: Boolean, default: true },
        name: { type: String }, // User-defined name e.g. "My Private Channel"
        webhookRules: {
          sources: [
            {
              type: { type: String },
              enabled: { type: Boolean, default: true },
              filters: {
                repositories: { type: [String], default: [] },
                eventTypes: { type: [String], default: [] },
                services: { type: [String], default: [] },
              },
            },
          ],
        },
      },
    ],

    // Preferences
    preferences: {
      aiSummary: { type: Boolean, default: false }, // Enable AI summary
      allowedSources: { type: [String], default: [] }, // If empty, allow all. Else only allow specific sources.
      // Future: tone, concise vs detailed, etc.
    },

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
