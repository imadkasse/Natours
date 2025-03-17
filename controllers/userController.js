const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

//upload file and image and resize
const multer = require('multer');
const sharp = require('sharp');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1]; //? mimetype: 'image/jpeg',
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); // ? example : user-sd1231213sd131-123123123123.jpeg
//   },
// });
const multerStorage = multer.memoryStorage(); // storage file as buffer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an imag please uplaod only image ', 400), false);
  }
}; // ! the gole of this filter is only upload img don't file or video or any think

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('photo');

//resize image
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({
      quality: 90,
    })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const fileterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

//ROUTE HANDLERS

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirmation) {
    return next(
      new AppError(
        'This route does not allow password updates, Please use /updateMyPassword',
        400,
      ),
    );
  }
  //2) filter users
  const filteredBody = fileterObj(req.body, 'name', 'email');

  if (req.file) filteredBody.photo = req.file.filename;

  //3) Update user document in the database
  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: updateUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });
  res.status(204).json({
    status: 'success',
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = factory.getAll(User);
exports.createUser = factory.createOne(User);
exports.getUser = factory.getOne(User);
// do NOT update password
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
