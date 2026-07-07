import { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import type { InwardItem } from '../types';
import { supabase } from '../lib/supabase';

export function InwardPage() {
  const { addInward } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [formData, setFormData] = useState({
    from: '',
    remarks: '',
  });

  const [items, setItems] = useState<Omit<InwardItem, 'id'>[]>([
    { modelNo: '', productType: '', slNo: '', qty: 1 }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large! Please upload a file smaller than 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      alert("Could not access camera. Please allow camera permissions.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    setStream(null);
  };

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [name]: name === 'qty' ? parseFloat(value) || 0 : value
    };
    setItems(newItems);
  };

  const addItem = () => {
    setItems(prev => [...prev, { modelNo: '', productType: '', slNo: '', qty: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    for (const item of items) {
      if (!item.modelNo) {
        alert('Please fill out Model No for all items');
        return;
      }
    }

    setIsSubmitting(true);
    let documentUrl = '';

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inventory')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('inventory')
          .getPublicUrl(filePath);
          
        documentUrl = publicUrlData.publicUrl;
      }

      const recordToSave = {
        ...formData,
        documentData: documentUrl,
        items: items as InwardItem[]
      };

      await addInward(recordToSave as any);

      // Reset
      setFormData({
        from: '',
        remarks: '',
      });
      setSelectedFile(null);
      setItems([{ modelNo: '', productType: '', slNo: '', qty: 1 }]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      alert('Inward entry added successfully!');
    } catch (error: any) {
      alert(`Error uploading file: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h1 className="page-title">Inward Entry</h1>
      <form onSubmit={handleSubmit} autoComplete="off">
        
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Receipt Details</h2>
        <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">From (Vendor/Supplier)</label>
            <input required type="text" name="from" className="form-input" value={formData.from} onChange={handleFormChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Document (Upload or Photo)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {!isCameraOpen ? (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={startCamera}
                    style={{ backgroundColor: 'var(--border)', color: 'white', flex: 1 }}
                    disabled={isSubmitting}
                  >
                    📷 Take Photo
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ backgroundColor: 'var(--border)', color: 'white', flex: 1 }}
                    disabled={isSubmitting}
                  >
                    📁 Upload File
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={stopCamera}
                  style={{ backgroundColor: 'var(--danger)', color: 'white', flex: 1 }}
                >
                  Cancel Camera
                </button>
              )}
              
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" style={{ display: 'none' }} />
            </div>

            {isCameraOpen && (
              <div style={{ marginTop: '1rem', position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }}></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                <button 
                  type="button" 
                  onClick={takeSnapshot}
                  style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                >
                  📸 Snap Picture
                </button>
              </div>
            )}

            {selectedFile && !isCameraOpen && (
              <small style={{ color: 'var(--secondary)', display: 'block', marginTop: '0.5rem' }}>Selected: {selectedFile.name}</small>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>Items List</h2>
          <button type="button" className="btn btn-primary" onClick={addItem} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            + Add Item
          </button>
        </div>

        {items.map((item, index) => (
          <div key={index} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', marginBottom: '1rem', position: 'relative' }}>
            {items.length > 1 && (
              <button 
                type="button" 
                onClick={() => removeItem(index)} 
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                X Remove
              </button>
            )}
            <div className="grid grid-cols-2" style={{ marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Model No</label>
                <input required type="text" name="modelNo" className="form-input" value={item.modelNo} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
              </div>
              <div className="form-group">
                <label className="form-label">Product Type</label>
                <input required type="text" name="productType" className="form-input" value={item.productType} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number (Sl no)</label>
                <input type="text" name="slNo" className="form-input" value={item.slNo} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input required type="number" min="1" name="qty" className="form-input" value={item.qty} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
              </div>
            </div>
          </div>
        ))}

        <div className="form-group" style={{ marginTop: '2rem' }}>
          <label className="form-label">Remarks</label>
          <textarea name="remarks" className="form-input" rows={2} value={formData.remarks} onChange={handleFormChange}></textarea>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }} disabled={isSubmitting}>
          {isSubmitting ? 'Uploading & Saving...' : 'Save Inward Entry'}
        </button>
      </form>
    </div>
  );
}
