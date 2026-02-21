import React from "react";
import "./AlertModal.css";

function AlertModal({ show, type = "info", message, onClose, confirm = false, onConfirm }) {
  if (!show) return null;

  let title = "Notice";
  let color = "var(--primary)";

  if (type === "success") {
    title = "Success";
    color = "var(--success)";
  } else if (type === "error") {
    title = "Error";
    color = "var(--danger)";
  } else if (type === "warning") {
    title = "Warning";
    color = "var(--warning)";
  }

  return (
    <div className="alert-modal-bg">
      <div className="alert-modal-card">
        <div className="alert-modal-title" style={{ color }}>
          {title}
        </div>
        <div className="alert-modal-message" style={{ whiteSpace: "pre-line" }}>
          {message}
        </div>
        {confirm ? (
          <div className="alert-modal-actions">
            <button className="alert-modal-close" onClick={onConfirm}>
              Confirm
            </button>
            <button className="alert-modal-close alert-modal-close-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="alert-modal-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default AlertModal;
