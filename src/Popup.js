import React from 'react';

function Popup({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          minWidth: 320,
          maxWidth: 500,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        {title && (
          <h3
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}

export default Popup;
