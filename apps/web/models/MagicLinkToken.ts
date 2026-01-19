import { Schema, model, models, Document, Model } from "mongoose";

export interface IMagicLinkToken {
  email: string;
  tokenHash: string;
  expires: Date;
  used: boolean;
  keepSignedIn: boolean;
  createdAt: Date;
}

export interface MagicLinkTokenDocument extends IMagicLinkToken, Document {}

const MagicLinkTokenSchema = new Schema<MagicLinkTokenDocument>({
  email: { type: String, required: true },
  tokenHash: { type: String, required: true },
  expires: { type: Date, required: true },
  used: { type: Boolean, default: false },
  keepSignedIn: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 900 }, // Auto-delete after 15 mins (if not used/checked)
});

const MagicLinkToken =
  (models.MagicLinkToken as Model<MagicLinkTokenDocument>) ||
  model<MagicLinkTokenDocument>("MagicLinkToken", MagicLinkTokenSchema);

export default MagicLinkToken;
