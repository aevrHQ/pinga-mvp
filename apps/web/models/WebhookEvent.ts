import { Schema, model, models, Document, Model } from "mongoose";

export interface IWebhookEvent {
  source: string;
  event: string;
  payload: any;
  status: "pending" | "processed" | "failed" | "ignored";
  error?: string;
  createdAt: Date;
}

export interface WebhookEventDocument extends IWebhookEvent, Document {}

const WebhookEventSchema = new Schema<WebhookEventDocument>(
  {
    source: { type: String, required: true },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["pending", "processed", "failed", "ignored"],
      default: "pending",
    },
    error: { type: String },
  },
  {
    timestamps: true,
    expireAfterSeconds: 60 * 60 * 24 * 7, // Auto-delete after 7 days
  },
);

const WebhookEvent =
  (models.WebhookEvent as Model<WebhookEventDocument>) ||
  model<WebhookEventDocument>("WebhookEvent", WebhookEventSchema);

export default WebhookEvent;
