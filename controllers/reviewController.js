const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

// const APIFeatures = require('../utils/apiFeaturs');
// const catchAsync = require('../utils/catchAsync');
// const AppError = require('../utils/appError');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  // ? if not found tour with id ? return req.params.tourId => in URL
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // ? if not found user with id ? return req.user.id => in JWT
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review, { path: 'user' });

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
