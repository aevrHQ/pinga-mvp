import connectToDatabase from "./mongodb";

/**
 * Wrapper function to connect to MongoDB
 */
export async function connectDB() {
  return await connectToDatabase();
}
