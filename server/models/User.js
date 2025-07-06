import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String }, // for manual login
  email: { type: String }, // optional
  googleId: { type: String }, // for google login
});

export default mongoose.model("User", userSchema);
