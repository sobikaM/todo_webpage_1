import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  status: { type: String, enum: ["todo", "inProgress", "done"], default: "todo" },
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

export default mongoose.model("Task", taskSchema);
