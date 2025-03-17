const Tour = require('./../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeaturs');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const multer = require('multer');
const sharp = require('sharp');

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

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover && req.files.images) return next();

  //1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({
      quality: 90,
    })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  console.log(req.body);
  // 2) images
  req.body.images = []; // reset the array for new images

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );
  console.log(req.body);
  next();
});

//MIDDLEWARE FOR PARAMS

//use Aliasing
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price';
  req.query.fields = 'name,price,summary';
  next();
};

//ROUTE HANDLERS
exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    {
      $group: {
        // _id: '$price',
        _id: { $toUpper: '$difficulty' }, //text  Upper case
        numTours: { $sum: 1 }, //هنا تلاحظ إستخدام رقم واحد وهذا لانه في كل  doc يضيف واحد
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      // هنا لايمكن إستخدام أسماء الحقول القديمة وإنما الجديدة مثل (maxPrice,avgPrice)
      $sort: { minPrice: 1 },
    },
    // { يمكن إضافته عادي
    //   $match:{ _id:{$ne:"EASY"}}
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats: stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // تجميع المستندات حسب الشهر من حقل startDates
        numTourStarts: { $sum: 1 }, // حساب عدد الجولات التي بدأت في كل شهر
        tours: { $push: '$name' }, // تجميع أسماء الجولات في مصفوفة لكل شهر
      },
    },
    {
      $addFields: { month: '$_id' }, // إضافة حقل جديد يسمى month يحتوي على قيمة _id (الشهر)
    },
    {
      $project: {
        _id: 0, // إخفاء حقل _id من النتائج
      },
    },
    {
      $sort: { numTourStarts: -1 }, // فرز النتائج بحيث تكون الشهور التي تحتوي على أكبر عدد من الجولات في البداية
    },
    // {
    //   $limit:6 // 6 outPut
    // }
  ]);

  res.status(200).json({
    status: 'success',
    resalut: plan.length,
    data: {
      plan: plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.669008896214386, 3.2493952479226946/unit/mi

exports.getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // Radius in kilometers

  // if wrong lng or lat
  if (!lat || !lng) {
    next(
      new AppError(
        'please provide latitur and longitude in the format lng,lat ',
        400,
      ),
    );
    return;
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    resalut: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  // if wrong lng or lat
  if (!lat || !lng) {
    next(
      new AppError(
        'please provide latitur and longitude in the format lng,lat ',
        400,
      ),
    );
    return;
  }
  const distances = await Tour.aggregate([
    // يجب أن يكون  $geoNear هو الأول في piplines
    {
      $geoNear: {
        near: {
          tpye: 'Point',
          coordinates: [lng * 1, lat * 1], // to convert lat and lng to number type
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // Radius in kilometers
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
