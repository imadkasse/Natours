const mongoose = require('mongoose');
const validator = require('validator'); // library for validating
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const moment = require('moment');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'the name is required'],
  },
  email: {
    type: String,
    required: [true, 'the email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please enter a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'the password is required'],
    minlength: [8, 'the password must be at least 8 characters long'],
    select: false, // not showing password
  },
  passwordConfirmation: {
    type: String,
    // required: [true, 'the password confirmation is required'],
    minlength: [8, 'the password must be at least 8 characters long'],
    validate: {
      // هنا قمنا يعمل وظيفة للعمل على التحقق من تطابق كل من  password و passwordConfirmation
      //This only Work in CREATE and SAVE !!
      validator: function (value) {
        return value === this.password;
      },
      message: 'Passwords do not match',
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordRestToken: String,
  passwordResetTokenExpires: Date, //ex : 10min for reset the password
  active: {
    type: Boolean,
    default: true,
    select: false, // not showing active
  },
});

// تشفير كلمة المرور قبل حفظها في قاعدة البيانات
userSchema.pre('save', async function (next) {
  // this line run  Only if the password was actually modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  // delete the passwordConfirmation
  // تم استخدامه فقط للتحقق من تطابق كلمة المرور أثناء التسجيل أو التحديث.
  this.passwordConfirmation = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//this is query middleware run before find ,findOne and findById ...
//delete the user from api ( user is not deleted from database)
userSchema.pre(/^find/, async function (next) {
  //this points to the current qurey
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//save passwordChangedAt to  the database as a Date Type
userSchema.pre('save', function (next) {
  // تحقق مما إذا كانت passwordChangedAt موجودة و ليست null أو undefined
  if (this.isModified('password') && this.passwordChangedAt) {
    // تحويل القيمة إلى كائن Date
    this.passwordChangedAt = new Date(this.passwordChangedAt);
  }
  next();
});

userSchema.methods.changePasswordAfter = async function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // Generate a random 32-byte token and convert it to a hexadecimal string
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the reset token using SHA-256 and store it in the passwordRestToken field
  this.passwordRestToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordRestToken);

  // Set the password reset token expiration time to 10 minutes from now
  this.passwordResetTokenExpires = Date.now() + 600000;

  // Return the original (non-hashed) reset token
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
