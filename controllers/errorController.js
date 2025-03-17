const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateErrorDB = (err) => {
  const value = err.keyValue.name;

  const message = `Duplicate field value :${value}  please use another value`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  console.log(errors);
  const message = `Invalid input data: ${errors.join('.   ')} please use another values`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401);
};

const sendErrorDev = (err, req, res) => {
  // in API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      errors: err,
      message: err.message,
      stack: err.stack,
    });
    //in View
  }
  return res.status(err.statusCode).render('error', {
    title: 'semthing went wrong!',
    msg: err.message,
  });
};

const sendErrorUser = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (req.originalUrl.startsWith('/api')) {
    // in API
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      // Programming or other unknown error: don't leak error details
    }
    // 1) Log error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
  //in view
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'semthing went wrong!',
      msg: err.message,
    });

    // Programming or other unknown error: don't leak error details
  }
  // 1) Log error
  console.error('ERROR 💥', err);

  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'semthing went wrong!',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
  
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateErrorDB(error);
    if (error._message === 'Validation failed')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);

    sendErrorUser(error, req, res);
  }
};
