import axios from 'axios';
import { showAlert } from './alerts';
export const login = async (email, password) => {
  console.log(email, password);
  try {
    const res = await axios.post(
      'http://localhost:3000/api/v2003/users/login',
      {
        email: email,
        password: password,
      },
    );
    if (res.data.status === 'success') {
      showAlert('success', 'login successful');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500); // Replace '/dashboard' with your desired dashboard URL
    }

    console.log(res);
  } catch (error) {
    showAlert('error', error.response.data.message);
  }
};

export const logout = async () => {
  try {
    console.log('first');
    const res = await axios.get('http://localhost:3000/api/v2003/users/logout');
    if (res.data.status === 'success') location.reload(true); // true => reload in the server
  } catch (error) {
    console.log(error.response);
    showAlert('error', 'Error logging out! Please try again');
  }
};
