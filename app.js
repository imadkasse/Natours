/* eslint-disable prettier/prettier */
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');

//Routes
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

//Errors
const AppError = require('./utils/appError');
const globalError = require('./controllers/errorController');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//add script

//Global middlewares

//Serving Static Files.
app.use(express.static(path.join(__dirname, 'public')));

//Set Security HTTPS Headers
app.use(helmet()); // من المهم وضعه في بداية التطبيق

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Limit Requests from same api
const limiter = rateLimit({
  // limit each IP to 100 requests per hour if requeste> 100 in hour => error message
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});

app.use('/api', limiter);

//Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // limit: '10kb' ??
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb', // limit: '10kb'??
  }),
);

app.use(cookieParser());

//clean data (Data Sanitization) against NoSQL query injection
app.use(mongoSanitize());

// Data Sanitization against XXS
app.use(xss());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// Routes
app.use('/', viewRouter);
app.use('/api/v2003/users', userRouter);
app.use('/api/v2003/tours', tourRouter);
app.use('/api/v2003/reviews', reviewRouter);

//Section Error Handling
// '*' => all routes can't find show this response json
app.all('*', (req, res, next) => {
  // إذا قمنا بتمرير قيمة لnext فإنه يعتبرها رسالة خطأ ويقوم بإعدام جميع البرامج الوسيطة
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
//Error Handling Middleware
app.use(globalError);

//START SERVER

module.exports = app;

//this file use to config Express app
