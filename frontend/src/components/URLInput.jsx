import { useState } from 'react';

export default function URLInput({ onLoadUrl }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      // Ensure URL has protocol
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      onLoadUrl(targetUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter website URL (e.g., https://example.com)"
        style={styles.input}
      />
      <button type="submit" style={styles.button}>
        Load
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    maxWidth: '600px',
    flex: 1,
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#4a9eff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
};

