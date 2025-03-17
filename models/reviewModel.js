const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have content'],
      trim: true,
      // maxlength: [1000, 'The maximum length is 1000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'The rating must be a number'],
      min: [1, 'the minimum rating '],
      max: [5, 'the max rating '],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  }, //تستخدم هذه لأظهار البيانات الإفتراضية virtual
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ! Create Indexes
reviewSchema.indexes({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // The populate('guides') function replaces the 'guides' field,
  // which contains IDs of other documents, with the actual guide data
  // from the related collection. It fetches the full details of the guides.
  this.populate({
    path: 'user',
    select: 'name photo',
  }); //populate => خلف الكواليس تنشأ إستعلام وهذا قد يؤثر في الأداء إذا كان التطبيق كبير
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //!clalc avrege rating
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //? save the avg in the tour model

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // الوصول إلى دالة `calcAverageRatings` على مستوى النموذج عبر `constructor`
  this.constructor.calcAverageRatings(this.tour);
});

// !! ملاحظة: post => مرتبط ب doc يعمل بعد الحفظ
// !! ملاحظة: pre => مرتبط ب model يعمل قبل الحفظ

// findByIdAndUpdate => findOneAndUpdate

// pre-hook: يتم تنفيذه قبل تنفيذ عمليات `findOneAnd`
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // نحفظ الوثيقة المتأثرة بالعملية في `this.r`
  this.r = await this.findOne();
  
  next();
});

// post-hook: يتم تنفيذه بعد تنفيذ عمليات `findOneAnd`
reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
