const express = require('express');
const fileUpload = require('express-fileupload');
const { resizeMedia } = require('./controllers/resizeController');

const app = express();
const port = 4800;

// Middleware to handle file uploads
app.use(fileUpload({
    createParentPath: true
}));

// Route to upload and resize media
app.post('/api/upload', async (req, res) => {
    try {
        await resizeMedia(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error occurred.');
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
