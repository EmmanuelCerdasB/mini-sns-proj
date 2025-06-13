const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const feedSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      default: uuidv4,
      unique: true, // Unique identifier for each feed
    },
    content: {
      type: String,
      required: true, // Feed content (required)
    },
    author: {
      type: String,
      required: true, // Author name (required)
    },
    likes: [{ type: String }],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
    collection: "feeds", // Explicitly specify the collection name
  }
);

module.exports = mongoose.model("Feed", feedSchema);
