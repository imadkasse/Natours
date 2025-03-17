const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator'); // library for validating

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      //validators
      maxlength: [40, 'The maximum'],
      minlength: [10, 'The minimum'],
      // validate: [validator.isAlpha, 'must be a valid alpha'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a durations'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //validators
      enum: {
        //حصر الخيارت في هذه الثلاثة
        values: ['easy', 'medium', 'difficult'],
        message:
          '{VALUE} is not a valid difficulty. Choose from: esay, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //validators
      min: [1, 'Rating must be above 1'],
      max: [5, 'Rating must be below 5'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value) {
          //dont work in update mode and this is work only in create doc
          return value < this.price;
        },
        message: 'Price discount {VALUE} should be less than price ',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  //تستخدم هذه لأظهار البيانات الإفتراضية virtual
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// tourSchema.index({price:1})
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//virtual تستخدم لأضافة خاصية لانحتاجها كثيرا قصد التوفير من مساحة قاعدة البيانات
//لايمكن إستخدام هذه في الإستعلامات
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//DOUCEMENT MIDDLEWARE : runs before .save() and .create() on datdbase
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
//DOUCEMENT MIDDLEWARE : runs after .create() using finsh tour doc
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });
//ملاحظة :DOUCEMENT MIDDLEWARE تشتغل فقط في حالة  .save() and .create()

//الحصول على معلومات المرشد قبل حفظ id فقط
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
//QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  // The populate('guides') function replaces the 'guides' field,
  // which contains IDs of other documents, with the actual guide data
  // from the related collection. It fetches the full details of the guides.
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  }); //populate => خلف الكواليس تنشأ إستعلام وهذا قد يؤثر في الأداء إذا كان التطبيق كبير
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

//DOCUMENT MIDDLEWARE AGGREGATION
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
