import { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import type { InwardItem } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Camera, 
  UploadCloud, 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  Package,
  XCircle
} from 'lucide-react';

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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inward Entry</h1>
          <p className="page-subtitle">Log incoming inventory and capture delivery receipts.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} autoComplete="off">
          
          <div className="form-section">
            <h2 className="form-section-title"><FileText size={20} className="upload-icon" style={{ marginBottom: 0 }} /> Receipt Details</h2>
            
            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">From (Vendor/Supplier)</label>
                <input required type="text" name="from" className="form-input" placeholder="e.g. Acme Corp" value={formData.from} onChange={handleFormChange} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Document Proof</label>
                
                {!isCameraOpen ? (
                  <div className="upload-zone" onClick={() => !selectedFile && fileInputRef.current?.click()}>
                    {selectedFile ? (
                      <>
                        <FileText size={32} className="upload-icon" />
                        <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Click to change file</span>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-secondary" 
                          style={{ marginTop: '0.5rem' }}
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={32} className="upload-icon" />
                        <span style={{ fontWeight: 500 }}>Click to upload document</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>or take a photo</span>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button 
                            type="button" 
                            className="btn btn-sm btn-secondary" 
                            onClick={(e) => { e.stopPropagation(); startCamera(); }}
                            disabled={isSubmitting}
                          >
                            <Camera size={16} /> Use Camera
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', background: '#000' }}></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    
                    <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                      <button 
                        type="button" 
                        onClick={takeSnapshot}
                        className="btn btn-primary"
                        style={{ borderRadius: '9999px', boxShadow: 'var(--shadow-lg)' }}
                      >
                        <Camera size={18} /> Snap Photo
                      </button>
                      <button 
                        type="button" 
                        onClick={stopCamera}
                        className="btn btn-danger"
                        style={{ borderRadius: '9999px', background: 'var(--bg-card)' }}
                      >
                        <XCircle size={18} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" style={{ display: 'none' }} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 className="form-section-title" style={{ marginBottom: 0 }}><Package size={20} className="upload-icon" style={{ marginBottom: 0 }} /> Items List</h2>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>
                <Plus size={16} /> Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, index) => (
                <div key={index} style={{ padding: '1.5rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '0.75rem', position: 'relative' }}>
                  {items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)} 
                      style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                      title="Remove Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <div className="grid grid-cols-4">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Model No</label>
                      <input required type="text" name="modelNo" className="form-input" placeholder="e.g. SN-100" value={item.modelNo} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Product Type</label>
                      <input required type="text" name="productType" className="form-input" placeholder="e.g. Switch" value={item.productType} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Serial Number</label>
                      <input type="text" name="slNo" className="form-input" placeholder="Optional" value={item.slNo} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quantity</label>
                      <input required type="number" min="1" name="qty" className="form-input" value={item.qty} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Additional Remarks</label>
              <textarea name="remarks" className="form-input" rows={3} placeholder="Any additional notes about this delivery..." value={formData.remarks} onChange={handleFormChange}></textarea>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }} disabled={isSubmitting}>
                {isSubmitting ? (
                  'Uploading & Saving...'
                ) : (
                  <><Save size={20} /> Save Inward Entry</>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
