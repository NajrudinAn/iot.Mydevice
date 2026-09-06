import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function AdminHostedFrontend() {
  const { applicationId } = useParams();
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [jsContent, setJsContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [appSlug, setAppSlug] = useState('');

  useEffect(() => {
    fetchFrontend();
    fetchAppDetails();
  }, [applicationId]);

  const fetchAppDetails = async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAppSlug(data.application?.slug || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFrontend = async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/frontend`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok && data.frontend) {
        setHtmlContent(data.frontend.html_content || '');
        setCssContent(data.frontend.css_content || '');
        setJsContent(data.frontend.js_content || '');
      }
    } catch (err) {
      setError('Failed to fetch frontend code');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/frontend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          html_content: htmlContent,
          css_content: cssContent,
          js_content: jsContent
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save frontend');
      }
      alert('Frontend saved and published successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-[var(--color-text-secondary)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Custom Hosted Frontend</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Write custom HTML, CSS, and JS to host a specific portal for your devices.
          </p>
        </div>
        <div className="flex space-x-4 items-center">
          {appSlug && (
            <a 
              href={`/hosted/${appSlug}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              View Live Site
            </a>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">HTML</h3>
            <textarea
              className="w-full h-64 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[var(--color-text)] font-mono text-sm"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<!-- Insert HTML here -->&#10;<div id='app'></div>"
            />
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">CSS</h3>
            <textarea
              className="w-full h-64 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[var(--color-text)] font-mono text-sm"
              value={cssContent}
              onChange={(e) => setCssContent(e.target.value)}
              placeholder="/* Insert CSS here */&#10;body { font-family: sans-serif; }"
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">JavaScript</h3>
            <textarea
              className="w-full h-64 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[var(--color-text)] font-mono text-sm"
              value={jsContent}
              onChange={(e) => setJsContent(e.target.value)}
              placeholder="// Insert JS here&#10;console.log('App Loaded', window.MYDEVICE_APP_ID);"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
