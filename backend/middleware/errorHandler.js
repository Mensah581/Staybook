// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.message === 'Invalid file type. Only JPG, PNG, and WebP are allowed.') {
    return res.status(400).json({ success: false, error: err.message });
  }
  
  if (err.message.includes('File too large')) {
    return res.status(400).json({ success: false, error: 'File size exceeds 5MB limit' });
  }
  
  res.status(500).json({ success: false, error: 'An error occurred. Please try again.' });
};

module.exports = errorHandler;
