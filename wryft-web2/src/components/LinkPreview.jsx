import { useState, useEffect } from 'react';
import { Globe, Image as ImageIcon } from 'phosphor-react';

function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        // Use a CORS proxy or your own backend endpoint
        // For now, we'll extract basic info from the URL
        const urlObj = new URL(url);
        
        // Check if it's an image
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(urlObj.pathname)) {
          setPreview({
            type: 'image',
            url: url,
            title: urlObj.pathname.split('/').pop(),
            domain: urlObj.hostname,
          });
          setLoading(false);
          return;
        }

        // For other URLs, show basic preview
        setPreview({
          type: 'link',
          url: url,
          title: urlObj.hostname,
          domain: urlObj.hostname,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to parse URL:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading || error || !preview) return null;

  if (preview.type === 'image') {
    return (
      <div className="link-preview image-preview">
        <img
          src={preview.url}
          alt={preview.title}
          className="link-preview-image"
          onClick={() => window.open(preview.url, '_blank')}
        />
      </div>
    );
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview"
    >
      <div className="link-preview-icon">
        <Globe size={20} />
      </div>
      <div className="link-preview-content">
        <div className="link-preview-title">{preview.title}</div>
        <div className="link-preview-domain">{preview.domain}</div>
      </div>
    </a>
  );
}

export default LinkPreview;
