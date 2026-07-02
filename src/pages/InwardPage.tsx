import { useState, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import type { InwardRecord, InwardItem } from '../types';

export function InwardPage() {
  const { addInward } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    from: '',
    remarks: '',
    documentData: ''
  });

  const [items, setItems] = useState<Omit<InwardItem, 'id'>[]>([
    { modelNo: '', productType: '', slNo: '', qty: 1 }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please upload a file smaller than 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, documentData: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const item of items) {
      if (!item.modelNo) {
        alert('Please fill out Model No for all items');
        return;
      }
    }

    const recordToSave = {
      ...formData,
      items: items as InwardItem[]
    };

    addInward(recordToSave as any);

    // Reset
    setFormData({
      from: '',
      remarks: '',
      documentData: ''
    });
    setItems([{ modelNo: '', productType: '', slNo: '', qty: 1 }]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    
    alert('Inward entry added successfully!');
  };

  return (
    <div className="card">
      <h1 className="page-title">Inward Entry</h1>
      <form onSubmit={handleSubmit}>
        
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Receipt Details</h2>
        <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">From (Vendor/Supplier)</label>
            <input required type="text" name="from" className="form-input" value={formData.from} onChange={handleFormChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Document (Upload or Photo)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => cameraInputRef.current?.click()}
                style={{ backgroundColor: 'var(--border)', color: 'white', flex: 1 }}
              >
                📷 Take Photo
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                style={{ backgroundColor: 'var(--border)', color: 'white', flex: 1 }}
              >
                📁 Upload File
              </button>
              
              <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" style={{ display: 'none' }} />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" style={{ display: 'none' }} />
            </div>
            {formData.documentData && (
              <small style={{ color: 'var(--secondary)', display: 'block', marginTop: '0.5rem' }}>Document attached successfully.</small>
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
                <input required type="text" name="modelNo" className="form-input" value={item.modelNo} onChange={(e) => handleItemChange(index, e)} />
              </div>
              <div className="form-group">
                <label className="form-label">Product Type</label>
                <input required type="text" name="productType" className="form-input" value={item.productType} onChange={(e) => handleItemChange(index, e)} />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number (Sl no)</label>
                <input type="text" name="slNo" className="form-input" value={item.slNo} onChange={(e) => handleItemChange(index, e)} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input required type="number" min="1" name="qty" className="form-input" value={item.qty} onChange={(e) => handleItemChange(index, e)} />
              </div>
            </div>
          </div>
        ))}

        <div className="form-group" style={{ marginTop: '2rem' }}>
          <label className="form-label">Remarks</label>
          <textarea name="remarks" className="form-input" rows={2} value={formData.remarks} onChange={handleFormChange}></textarea>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
          Save Inward Entry
        </button>
      </form>
    </div>
  );
}
