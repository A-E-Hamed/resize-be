const Jimp = require("jimp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const ffmpegStatic = require("ffmpeg-static");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Local directory for output
const localOutputPath = path.join(__dirname, "..", "public", "resized");

// Ensure the local directory exists
if (!fs.existsSync(localOutputPath)) {
  fs.mkdirSync(localOutputPath, { recursive: true });
}

// Helper function to save a buffer to a file
const saveBufferToFile = async (buffer, fileName) => {
  const filePath = path.join(localOutputPath, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return fileName; // Return the file name for URL construction
};

// Function to resize an image
const resizeImage = async (file, width, height) => {
  const image = await Jimp.read(file.data);
  await image.resize(parseInt(width, 10), parseInt(height, 10)); // Set quality for JPEG images
  const fileName = `resized-${file.name}`;
  const outputFilePath = path.join(localOutputPath, fileName);
  await image.writeAsync(outputFilePath);
  return fileName; // Return the file name for URL construction
};

// Function to resize a video
const resizeVideo = async (file, width, height) => {
  return new Promise(async (resolve, reject) => {
    const tempFileName = `temp-${file.name}`;
    await saveBufferToFile(file.data, tempFileName); // Save temporarily
    const inputFilePath = path.join(localOutputPath, tempFileName);
    const fileName = `resized-${file.name}`;
    const outputFilePath = path.join(localOutputPath, fileName);

    ffmpeg(inputFilePath)
      .videoFilters(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
      )
      .videoCodec("libx264")
      .addOptions(["-crf 18"])
      .on("error", (err) => {
        console.error("Error processing video:", err);
        fs.unlinkSync(inputFilePath); // Clean up temporary file
        reject(err);
      })
      .on("end", () => {
        fs.unlinkSync(inputFilePath); // Clean up temporary file
        resolve(fileName); // Return the file name for URL construction
      })
      .save(outputFilePath);
  });
};

// Main function to handle requests
const resizeMedia = async (req, res) => {
  if (!req.files || !req.files.media) {
    return res.status(400).send("No media file uploaded.");
  }

  const { media } = req.files;
  const { width, height } = req.body;

  let fileName; // The name of the saved file
  if (media.mimetype.startsWith("image/")) {
    fileName = await resizeImage(media, width, height);
  } else if (media.mimetype.startsWith("video/")) {
    fileName = await resizeVideo(media, width, height);
  } else {
    return res.status(400).send("Unsupported media type.");
  }

  // Construct the URL to access the file
  const publicUrl = `https://resize-be.onrender.com/resized/${fileName}`;
  res.send({ url: publicUrl });
};

module.exports = { resizeMedia };
