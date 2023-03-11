const express = require('express');
const fileUpload = require('express-fileupload');
const cloudinary = require('./config/cloudinary.config');
const config = require('./config/config');

const app = express();

app.set('view engine', 'ejs');

app.use(express.json());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/temp/',
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: 'File size too large',
  })
);

app.get('/api', (_req, res) => {
  res.status(200).render('form.ejs');
});

app.post('/api/upload', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('No fields were provided');
    }

    const { name, email, password } = req.body;

    if (!(name && email && password)) {
      throw new Error('Please provide all the details');
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      throw new Error('No files were uploaded');
    }

    let { profilePhotos } = req.files;

    if (!Array.isArray(profilePhotos)) {
      profilePhotos = [profilePhotos];
    }

    let images;

    try {
      images = await Promise.all(
        profilePhotos.map(async image => {
          const path = __dirname + '/uploads/' + image.name;

          image.mv(path, function (err) {
            if (err) {
              throw new Error('Error uploading file to the local server');
            }
          });

          const response = await cloudinary.uploader.upload(path, {
            folder: 'profilePhotos',
            public_id: Date.now(),
            resource_type: 'image',
            tags: ['users', 'images'],
          });

          return { id: response.public_id, url: response.secure_url };
        })
      );
    } catch (err) {
      throw new Error('Error uploading file on cloudinary');
    }

    res.status(200).json({
      success: true,
      message: 'Images successfully uploaded',
      data: {
        name,
        email,
        password,
        images,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

app.get('/api/fetch', async (_req, res) => {
  try {
    const response = await cloudinary.api.resources_by_tag('users', {
      resource_type: 'image',
      max_results: 100,
      tags: true,
    });

    const images = response.resources.map(resource => {
      return { id: resource.public_id, url: resource.secure_url };
    });

    res.status(200).json({
      success: true,
      message: 'Images successfully fetched',
      images,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || err.error.message,
    });
  }
});

app.get('/api/fetch/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('Please provide an id');
    }

    const publicId = 'profilePhotos/' + id;
    const response = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    const image = { id: response.public_id, url: response.secure_url };

    res.status(200).json({
      success: true,
      message: 'Image successfully fetched',
      image,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || err.error.message,
    });
  }
});

app.delete('/api/delete', async (_req, res) => {
  try {
    await cloudinary.api.delete_resources_by_tag('users', { resource_type: 'image' });

    res.status(200).json({
      success: true,
      message: 'Images successfully deleted',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || err.error.message,
    });
  }
});

app.delete('/api/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('Please provide an id');
    }

    const publicId = 'profilePhotos/' + id;
    await cloudinary.api.delete_resources([publicId], { resource_type: 'image' });

    res.status(200).json({
      success: true,
      message: 'Image successfully deleted',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || err.error.message,
    });
  }
});

app.listen(config.PORT, () => console.log(`Server is running on http://localhost:${config.PORT}`));
