import { useEffect, useRef } from 'react';
import { Modal } from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const BootstrapModal = ({ 
  show,
  onHide,
  title, 
  children, 
  footer,
  size = '',
  centered = false
}) => {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const preventDoubleHide = useRef(false);

  useEffect(() => {
    const modalElement = modalRef.current;
    
    // Initialize modal
    modalInstanceRef.current = new Modal(modalElement, {
      backdrop: 'static',
      keyboard: true
    });

    // When Bootstrap starts hiding the modal
    const handleHide = (e) => {
      // Prevent the event loop
      preventDoubleHide.current = true;
    };

    // When Bootstrap finishes hiding the modal, call onHide
    const handleHidden = () => {
      preventDoubleHide.current = false;
      if (onHide) onHide();
    };

    modalElement.addEventListener('hide.bs.modal', handleHide);
    modalElement.addEventListener('hidden.bs.modal', handleHidden);
    
    return () => {
      modalElement.removeEventListener('hide.bs.modal', handleHide);
      modalElement.removeEventListener('hidden.bs.modal', handleHidden);
      if (modalInstanceRef.current) {
        modalInstanceRef.current.dispose();
      }
    };
  }, [onHide]);

  // Control modal visibility based on show prop
  useEffect(() => {
    const modalInstance = modalInstanceRef.current;
    const modalElement = modalRef.current;
    if (!modalInstance || !modalElement) return;

    // Check if modal is currently shown
    const isCurrentlyShown = modalElement.classList.contains('show');

    if (show && !isCurrentlyShown) {
      preventDoubleHide.current = false;
      modalInstance.show();
    } else if (!show && isCurrentlyShown && !preventDoubleHide.current) {
      modalInstance.hide();
    }
  }, [show]);

  return (
    <div className="modal fade" ref={modalRef} tabIndex="-1">
      <div className={`modal-dialog ${size ? `modal-${size}` : ''} ${centered ? 'modal-dialog-centered' : ''}`}>
        <div className="modal-content">
          {title && (
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button 
                type="button" 
                className="btn-close" 
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
          )}
          
          <div className="modal-body">
            {children}
          </div>
          
          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BootstrapModal;