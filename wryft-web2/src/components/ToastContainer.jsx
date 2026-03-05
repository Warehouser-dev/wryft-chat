import { useState, useCallback } from 'react';
import Toast from './Toast';

let toastId = 0;
let addToastFn = null;

export const showToast = (message, type = 'success', duration = 3000) => {
  if (addToastFn) {
    addToastFn(message, type, duration);
  }
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type, duration) => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Expose addToast function globally
  addToastFn = addToast;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
