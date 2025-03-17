const express = require('express');
const {
  getAllTours,
  createTour,
  updateTour,
  getTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getTourWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages,
} = require('./../controllers/tourController');
const { protect, restrictTo } = require('../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

//use Aliasing
router.route('/top-5-small-price').get(aliasTopTours, getAllTours);

//aggregate
router.route('/tour-stats').get(getTourStats);

router
  .route('/monthly-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getTourWithin);
// /tours-within?distance=233&center=40.5&unit=mil
// /tours-within/233/center/40.5/unit/mil

router.route('/distances/:latlng/unit/:unit').get(getDistances);

// /=>هذا الراوت يعني أنا "/api/v2003/tours" هذا حل تنظيمي
router
  .route('/')
  .get(getAllTours)
  .post(protect, restrictTo('admin', 'lead-guide'), createTour);

router
  .route('/:id')
  .get(getTour)
  .patch(
    protect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  )
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour); //using protected route and  permission

// notic => ex: get(protect, getAllTours) :protect => is a middleware

// ! Nested routes ( bad using )

// router
//   .route('/:tourId/reviews')
//   .post(protect, restrictTo('user'), createReview);

// ? Nested routes  (good using ) by using mergeParams
router.use('/:tourId/reviews', reviewRouter);

module.exports = router;
