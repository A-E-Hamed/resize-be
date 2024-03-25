const Jimp = require("jimp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");

// Set paths for FFmpeg and FFprobe binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffmpegStatic.replace('ffmpeg', 'ffprobe'));

const app = express();
const port = 3000; // or any port you prefer

// Middleware to handle file uploads
app.use(fileUpload({
  createParentPath: true
}));

// Serve static files from 'public'
app.use(express.static('public'));

// Output directory for resized files
const outputPath = path.join(__dirname, 'public', 'resized');
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

const saveBufferToFile = async (buffer, outputPath, fileName) => {
  const filePath = path.join(outputPath, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
};

const resizeImage = async (file, width, height) => {
  const image = await Jimp.read(file.data);
  await image.resize(parseInt(width, 10), parseInt(height, 10));
  const outputFilePath = path.join(outputPath, file.name);
  await image.writeAsync(outputFilePath);
  return outputFilePath.replace(__dirname, '');
};

const resizeVideo = async (file, width, height) => {
  return new Promise(async (resolve, reject) => {
    const inputFilePath = await saveBufferToFile(file.data, outputPath, `temp-${file.name}`);
    const outputFilePath = path.join(outputPath, file.name);

    ffmpeg(inputFilePath)
      .videoFilters(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`)
      .videoCodec("libx264")
      .addOptions(["-crf 18"])
      .on("error", (err) => {
        console.error("Error processing video:", err);
        fs.unlinkSync(inputFilePath); // Clean up
        reject(err);
      })
      .on("end", () => {
        fs.unlinkSync(inputFilePath); // Clean up
        resolve(outputFilePath.replace(__dirname, ''));
      })
      .save(outputFilePath);
  });
};

const resizeMedia = async (req, res) => {
  if (!req.files || !req.files.media) {
    return res.status(400).send("No media file uploaded.");
  }

  const { media } = req.files;
  const { width, height } = req.body;

  let outputFilePath;
  if (media.mimetype.startsWith("image/")) {
    outputFilePath = await resizeImage(media, width, height);
  } else if (media.mimetype.startsWith("video/")) {
    outputFilePath = await resizeVideo(media, width, height);
  } else {
    return res.status(400).send("Unsupported media type.");
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const accessibleUrl = baseUrl + outputFilePath;

  res.send({ url: accessibleUrl });
};

app.post('/resize', resizeMedia);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
