import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChannel {
  userId: mongoose.Types.ObjectId;
  type: "telegram" | "discord" | "whatsapp" | "slack" | "email" | "webhook";
  name?: string;
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  webhookRules?: {
    sources: {
      type: string;
      enabled: boolean;
      filters: {
        repositories: string[];
        eventTypes: string[];
        services: string[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
      };
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelDocument extends IChannel, Document {}

const ChannelSchema = new Schema<ChannelDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["telegram", "discord", "whatsapp", "slack", "email", "webhook"],
      required: true,
    },
    name: { type: String },
    enabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
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
  {
    timestamps: true,
  },
);

// Index for getting channels by user
ChannelSchema.index({ userId: 1 });

const Channel: Model<ChannelDocument> =
  mongoose.models.Channel ||
  mongoose.model<ChannelDocument>("Channel", ChannelSchema);

export default Channel;
