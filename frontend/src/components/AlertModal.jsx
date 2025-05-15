import React from 'react';
import './AlertModal.css';

function AlertModal({ show, type = 'info', message, onClose, confirm = false, onConfirm }) {
  if (!show) return null;

  let title = '';
  let color = '';
  switch (type) {
    case 'success':
      title = '성공';
      color = '#28a745';
      break;
    case 'error':
      title = '실패';
      color = '#dc3545';
      break;
    default:
      title = '알림';
      color = '#007bff';
  }

  return (
    <div className="alert-modal-bg">
      <div className="alert-modal-card">
        <div className="alert-modal-title" style={{ color }}>{title}</div>
        <div className="alert-modal-message" style={{ whiteSpace: "pre-line" }}>{message}</div>
        {confirm ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="alert-modal-close" style={{ background: '#007bff' }} onClick={onConfirm}>확인</button>
            <button className="alert-modal-close" style={{ background: '#aaa' }} onClick={onClose}>취소</button>
          </div>
        ) : (
          <button className="alert-modal-close" onClick={onClose}>닫기</button>
        )}
      </div>
    </div>
  );
}

export default AlertModal; 