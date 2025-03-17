export const hideAlert = () => {
  const alert = document.querySelector('.alert');
  if (alert) alert.remove();
};

// type => "success" or "error"
export const showAlert = (type, mes) => {
  hideAlert();
  const alert = document.createElement('div');
  alert.className = `alert alert--${type}`;
  alert.textContent = mes;
  document.body.appendChild(alert);

  window.setTimeout(hideAlert, 5000);
};
