
import React from 'react';
import '../components/styles/PopMessage.css';  // Fichier CSS pour le style

function PopMessage({ message, onClose }) {
  return (
    <div className="pop-message-overlay">
      <div className="pop-message-container">
        <label className="pop-message-label">{message}</label>
        <button className="pop-message-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

export default PopMessage;
