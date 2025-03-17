const { promisify } = require('util');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const Email = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign(
    { id }, // 1. تمرير بيانات المستخدم (في هذه الحالة المعرف الخاص بالمستخدم "id" وهو _id من قاعدة البيانات) كجزء من الحمولة "payload" في الرمز JWT.
    process.env.JWT_SECRET, // 2. المفتاح السري "JWT_SECRET" الذي يتم استخدامه لتوقيع الرمز JWT. يجب أن يكون هذا المفتاح قويًا ويُخزن في متغير بيئي (بيئة آمنة).
    {
      expiresIn: process.env.JWT_EXPIRES_IN, // 3. مدة انتهاء الصلاحية "expiresIn" تُحدد فترة صلاحية الرمز JWT. هذا المتغير أيضًا مخزن في البيئة لتحديد المدة (مثل "1h" لساعة أو "7d" لسبعة أيام).
    },
  );
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, // convert to milliseconds
    ),
    httpOnly: true, // الكوكي محمي من جافا سكريبت
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true; // الكوكي سيتم إرسالها فقط عبر HTTPS
  }
  //send the token as a cookie to the client
  res.cookie('jwt', token, cookieOptions);
  //Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirmation: req.body.passwordConfirmation,
    passwordChangedAt: req.body.passwordChangedAt,
    photo: req.body.photo,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  //create a new token
  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) check if the email and password are exist
  if (!email || !password) {
    return next(new AppError('The email and password are not provided ', 400));
  }
  //2) check if the user exist  and password  is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  ///3) if everthing ok , send token to client
  createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  // قم بتسجيل الكوكي الحالية للـ jwt
  console.log('cookie', req.cookies.jwt);

  res.status(200).json({ status: 'success' });
};

//protect routes
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  //without cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWit('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    // with cookies
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access.', 401),
    );
  }
  // 2)  verification  token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'the token belonging to this user does not longer exist ',
        401,
      ),
    );
  }
  //4) check if user changed password after the token was issued
  const hasChangedPassword = await currentUser.changePasswordAfter(decoded.iat);

  if (hasChangedPassword) {
    return next(
      new AppError('user recently changed password ! please log in agin', 401),
    );
  }

  // grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Middleware to restrict access based on user roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // `roles` is an array of roles allowed to access the route, e.g., ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      // If the user's role is not in the allowed roles array, send a forbidden error
      return next(
        new AppError('You do not have permission to access this route', 403),
      );
    }
    // If the user's role is in the allowed roles array, proceed to the next middleware or route handler
    next();
  };
};

//rest password functionality
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on POSTED email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }
  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Save the user document without validating the data

  //3) send it  to user's email
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v2003/users/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetUrl).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Reset password email sent. Please check your inbox.',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false }); // Save the user document without validating the data
    return next(
      new AppError('There was an error sending email. Try again later.', 500),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user  based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex'); // Get current date and time

  console.log(hashedToken);
  const user = await User.findOne({
    passwordRestToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  //2) if token has not expried, and there is user, set the new password
  if (!user) {
    return next(new AppError('token invalid or expired. Try again later', 400));
  }
  user.password = req.body.password;
  user.passwordConfirmation = req.body.passwordConfirmation;
  user.passwordRestToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();

  //3)Update changedPasswordAt propery for the user

  //4)Log the user in, send JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user form collection

  const user = await User.findById(req.user.id).select('+password');

  //2) Check if POSTED current password is correct

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Incorrect current password', 401));
  }

  //3) If so, update password

  user.password = req.body.password;
  user.passwordConfirmation = req.body.passwordConfirmation;
  await user.save();
  // don't use findByIdAndUpdate() => becuse validate not run

  //4 Log user in ,send JWT
  createAndSendToken(user, 200, res);
});

// Only for renderd page
exports.isLoggedIn = async (req, res, next) => {
  //in cookies
  if (req.cookies.jwt) {
    try {
      // 1)  verification  token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //3) check if user changed password after the token was issued
      const hasChangedPassword = await currentUser.changePasswordAfter(
        decoded.iat,
      );

      if (hasChangedPassword) {
        return next();
      }

      // htere is logged in user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
