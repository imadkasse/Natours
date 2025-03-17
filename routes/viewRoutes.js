const express = require('express');
const {
  getOverview,
  getTour,
  getLoginForm,
  getMe,
  updateUserData,
} = require('../controllers/viewsController');
const { isLoggedIn, protect } = require('../controllers/authController');

const router = express.Router();

router.get('/', isLoggedIn, getOverview);
router.get('/tour/:slug', isLoggedIn, getTour);

router.get('/login', isLoggedIn, getLoginForm);

router.get('/me', protect, getMe);

router.post('/submit-user-data', protect, updateUserData);

module.exports = router;
