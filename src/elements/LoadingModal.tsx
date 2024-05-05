import React from "react";

interface LoadingModalProps {
  isOpen: boolean;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen }) => {
  return (
    <>
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="loading-message">Loading...</div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoadingModal;
