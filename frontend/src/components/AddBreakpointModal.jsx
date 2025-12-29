import { useState } from 'react';

export default function AddBreakpointModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState('375');
  const [height, setHeight] = useState('667');

  const handleSubmit = (e) => {
    e.preventDefault();
    const widthNum = parseInt(width);
    const heightNum = parseInt(height);
    
    if (name.trim() && widthNum > 0 && heightNum > 0) {
      onAdd({
        name: name.trim(),
        width: widthNum,
        height: heightNum,
      });
      // Reset form
      setName('');
      setWidth('375');
      setHeight('667');
      onClose();
    }
  };

  const handleClose = () => {
    setName('');
    setWidth('375');
    setHeight('667');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Add Custom Breakpoint</h2>
          <button onClick={handleClose} style={styles.closeButton}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Custom Mobile, iPhone 15 Pro"
              style={styles.input}
              autoFocus
              required
            />
          </div>
          
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="375"
                style={styles.input}
                min="1"
                required
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="667"
                style={styles.input}
                min="1"
                required
              />
            </div>
          </div>
          
          <div style={styles.actions}>
            <button type="button" onClick={handleClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton}>
              Add Breakpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999999,
    backdropFilter: 'blur(4px)',
    pointerEvents: 'auto',
  },
  modal: {
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#ccc',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: '#999',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#4a9eff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

