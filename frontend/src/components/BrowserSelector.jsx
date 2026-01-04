import { useState, useRef, useEffect } from 'react';

const BROWSERS = [
  { id: 'chromium', name: 'Chrome', icon: '🌐' },
  { id: 'firefox', name: 'Firefox', icon: '🦊' },
  { id: 'webkit', name: 'Safari', icon: '🧭' },
  { id: 'edge', name: 'Edge', icon: '🔷' },
];

export default function BrowserSelector({ 
  selectedBrowser = 'chromium', 
  onBrowserChange,
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedBrowserData = BROWSERS.find(b => b.id === selectedBrowser) || BROWSERS[0];

  const handleSelect = (browserId) => {
    if (onBrowserChange) {
      onBrowserChange(browserId);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={styles.container}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          ...styles.button,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        disabled={disabled}
        title={`Browser: ${selectedBrowserData.name}`}
      >
        <span style={styles.icon}>{selectedBrowserData.icon}</span>
        <span style={styles.label}>{selectedBrowserData.name}</span>
        <span style={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div style={styles.dropdown}>
          {BROWSERS.map((browser) => (
            <button
              key={browser.id}
              onClick={() => handleSelect(browser.id)}
              style={{
                ...styles.option,
                ...(selectedBrowser === browser.id && styles.optionSelected),
              }}
            >
              <span style={styles.optionIcon}>{browser.icon}</span>
              <span>{browser.name}</span>
              {selectedBrowser === browser.id && (
                <span style={styles.checkmark}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    backgroundColor: 'rgba(58, 58, 58, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '80px',
  },
  icon: {
    fontSize: '12px',
  },
  label: {
    fontSize: '11px',
  },
  arrow: {
    fontSize: '8px',
    marginLeft: 'auto',
    opacity: 0.6,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#2a2a2a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    minWidth: '140px',
    overflow: 'hidden',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    textAlign: 'left',
  },
  optionSelected: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  optionIcon: {
    fontSize: '14px',
  },
  checkmark: {
    marginLeft: 'auto',
    color: '#4a9eff',
    fontWeight: 'bold',
  },
};

