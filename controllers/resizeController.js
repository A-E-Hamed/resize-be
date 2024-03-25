const Jimp = require("jimp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const ffmpegStatic = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffmpegStatic.replace('ffmpeg', 'ffprobe'));



const outputPath = "https://resize-be.onrender.com/resized/";
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
  await image.resize(parseInt(width, 10), parseInt(height, 10)); // Set quality for JPEG images
  const outputFilePath = path.join(outputPath, file.name);
  await image.writeAsync(outputFilePath);
  return outputFilePath;
};

const resizeVideo = async (file, width, height) => {
  return new Promise(async (resolve, reject) => {
    const inputFilePath = await saveBufferToFile(
      file.data,
      outputPath,
      `temp-${file.name}`
    );
    const outputFilePath = path.join(outputPath, file.name);

    ffmpeg(inputFilePath)
      .videoFilters(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
      )
      .videoCodec("libx264") // Use the H.264 codec
      .addOptions(["-crf 18"]) // Set the Constant Rate Factor to 18, which is roughly "visually lossless"
      .on("error", (err) => {
        console.error("Error processing video:", err);
        fs.unlinkSync(inputFilePath); // Clean up
        reject(err);
      })
      .on("end", () => {
        fs.unlinkSync(inputFilePath); // Clean up
        resolve(outputFilePath);
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

  res.send({ url: outputFilePath });
};

module.exports = { resizeMedia };
