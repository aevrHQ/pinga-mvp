const crypto = require("crypto");
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Mock Schema since we are running standalone
const MagicLinkTokenSchema = new Schema({
  email: String,
  otpHash: String,
  used: Boolean,
  expires: Date,
});
const MagicLinkToken = mongoose.model("MagicLinkToken", MagicLinkTokenSchema);

async function testOtpVerification() {
  // 1. Setup
  const otp = "121794";
  const otpInputWithSpace = " 121794 ";

  // Hash the CLEAN otp
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  // Hash the DIRTY otp (what happens if we don't trim)
  const otpDirtyHash = crypto
    .createHash("sha256")
    .update(otpInputWithSpace)
    .digest("hex");

  console.log(`Original OTP: "${otp}"`);
  console.log(`Input OTP:    "${otpInputWithSpace}"`);
  console.log(`Hash (Clean): ${otpHash}`);
  console.log(`Hash (Dirty): ${otpDirtyHash}`);

  if (otpHash !== otpDirtyHash) {
    console.log("❌ Hashes DO NOT match! Spaces cause verification failure.");
  } else {
    console.log("✅ Hashes match (unexpected).");
  }
}

testOtpVerification();
