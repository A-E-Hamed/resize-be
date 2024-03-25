const express = require("express");
const fileUpload = require("express-fileupload");
const { resizeMedia } = require("./controllers/resizeController");
const app = express();
const port = 4800;
// Middleware to handle file uploads
app.use(
  fileUpload({
    createParentPath: true,
  })
);
// Manual CORS Headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allows all origins
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

// Route to upload and resize media
app.post("/api/upload", async (req, res) => {
  try {
    await resizeMedia(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error occurred.");
  }
});
app.listen(port, () => console.log(`Server running on port ${port}`));
