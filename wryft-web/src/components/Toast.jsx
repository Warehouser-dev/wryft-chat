import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, Warning } from 'phosphor-react';

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} weight="fill" />,
    error: <XCircle size={20} weight="fill" />,
    info: <Info size={20} weight="fill" />,
    warning: <Warning size={20} weight="fill" />,
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{icons[type]}</div>
      <span className="toast-message">{message}</span>
    </div>
  );
}

export default Toast;
