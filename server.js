/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prettier/prettier */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Handle Error ASYNC
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');
console.log(process.env.NODE_ENV);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    dbName: 'natours',
  })
  .then(() => {
    console.log('db connection successful!');
  });

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log('app runnig on port:', port);
});

// HandleError Outside Express
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    console.log('Server is closing...');
    process.exit(1);
  });
});

