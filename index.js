const express = require('express');
const fileUpload = require('express-fileupload');
const config = require('./config/config');

const app = express();

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp',
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: 'File size too large',
  })
);

app.get('/', (_req, res) => {
  res.status(200).render('form.ejs');
});

app.post('/upload', (req, res) => {
  try {
    console.log(req.body, req.files);

    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Request body not found');
    }

    const { name, email } = req.body;

    if (!name) {
      throw new Error('Please provide a name');
    }

    if (!email) {
      throw new Error('Please provide an email');
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      throw new Error('No files were uploaded');
    }

    const profileImage = req.files.profileImage;

    if (Array.isArray(profileImage)) {
      profileImage.forEach(image => {
        const path = __dirname + '/uploads/' + image.name;

        image.mv(path, function (err) {
          if (err) {
            throw new Error('Error uploading file to the server');
          }
        });
      });
    } else {
      const path = __dirname + '/uploads/' + profileImage.name;

      profileImage.mv(path, function (err) {
        if (err) {
          throw new Error('Error uploading file to the server');
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name,
        email,
        profileImage,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

app.listen(config.PORT, () => console.log(`Server is running on http://localhost:${config.PORT}`));
