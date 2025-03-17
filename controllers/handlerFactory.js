const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('../utils/apiFeaturs');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('document not found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    console.log(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        date: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (popOptions) {
      query = query.populate(popOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError('document not found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //تعليقات مهمة
    // //في هذه المرحلة أردنا حذف sort ,limit ,... لكي نستعملها في أشياء أخرى
    // //1)FILTERING #####################################################################################
    // const qureyObj = { ...req.query };
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // excludedFields.forEach((element) => {
    //   delete qureyObj[element];
    // });
    // //1)ADVENCED FILTERING #####################################################################################
    // let queryStr = JSON.stringify(qureyObj);
    // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    //FILTER ONE
    // let query = Tour.find(JSON.parse(queryStr));

    // //2)SORTING #####################################################################################

    // //notic: http://localhost:3000/api/v2003/tours?sort=duration =>من الادنى الى الاكبر
    // //notic: http://localhost:3000/api/v2003/tours?sort=-duration =>من الاكبر الى الادنى

    // if (req.query.sort) {
    //   //أضفنا خاصية في حالة تساوي فأنه يذهب لتصفية البيانات حسب القيمة الثانية =>(http://localhost:3000/api/v2003/tours?sort=price,duration,http://localhost:3000/api/v2003/tours?sort=price,-duration)
    //   const sortBy = req.query.sort.split(',').join(' ');
    //   query = query.sort(sortBy);
    // } else {
    //   // هنا عملنا sort حسب الأحدث وهذا في حالة عدم وجود أي query
    //   query = query.sort('-createdAt');
    // }

    // //3) filed limiting #####################################################################################
    // if (req.query.fields) {
    //   const filedsBy = req.query.fields.split(',').join(' ');
    //   query = query.select(filedsBy);
    // } else {
    //   query = query.select('-__v');
    // }

    // //4) pagination
    // const page = req.query.page * 1 || 1; //التحويل الى نوع number او أخذ قيمة 1
    // const limit = req.query.limit * 1 || 100;
    // const skip = (page - 1) * limit;

    // query = query.skip(skip).limit(limit); //=> طريقة عمل الترقيم
    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments();
    //   if (skip >= numTours) throw new Error('this page is not  found'); //هنا تلاحظ أنه إستخدم throw وهذا للميزة التي يقدمها وهي أن ينقلنا مباشرة الى عرض رسالة الخطأ التي في سطر 69
    // }

    // to allow nested routes
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // const doc = await features.query.explain();
    const doc = await features.query;

    //SEND RESPONSE
    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
