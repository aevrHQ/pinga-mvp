import { Schema, model, models, Document, Model, Types } from "mongoose";

export interface IInstallation {
  installationId: number;
  userId?: Types.ObjectId; // Optional until claimed
  accountLogin: string;
  accountId: number;
  accountType: string; // "User" or "Organization"
  repositorySelection: string; // "selected" or "all"
}

export interface InstallationDocument extends IInstallation, Document {}

const InstallationSchema = new Schema<InstallationDocument>(
  {
    installationId: { type: Number, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // Not required initially
    accountLogin: { type: String, required: true },
    accountId: { type: Number, required: true },
    accountType: { type: String },
    repositorySelection: { type: String },
  },
  {
    timestamps: true,
  },
);

const Installation =
  (models.Installation as Model<InstallationDocument>) ||
  model<InstallationDocument>("Installation", InstallationSchema);

export default Installation;
