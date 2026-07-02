import { useState, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import type { InwardRecord } from '../types';

export function InwardPage() {
  const { addInward } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Omit<InwardRecord, 'id' | 'date'>>({
    modelNo: '',
    productType: '',
    slNo: '',
    qty: 1,
    from: '',
    remarks: '',
    documentData: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to ~2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please upload a file smaller than 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, documentData: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInward(formData);
    setFormData({
      modelNo: '',
      productType: '',
      slNo: '',
      qty: 1,
      from: '',
      remarks: '',
      documentData: ''
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert('Inward entry added successfully!');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'qty' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="card">
      <h1 className="page-title">Inward Entry</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2">
          <div className="form-group">
            <label className="form-label">Model No</label>
            <input required type="text" name="modelNo" className="form-input" value={formData.modelNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Product Type</label>
            <input required type="text" name="productType" className="form-input" value={formData.productType} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Serial Number (Sl no)</label>
            <input type="text" name="slNo" className="form-input" value={formData.slNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input required type="number" min="1" name="qty" className="form-input" value={formData.qty} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">From (Vendor/Supplier)</label>
            <input required type="text" name="from" className="form-input" value={formData.from} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Document Upload (Max 2MB)</label>
            <input type="file" className="form-input" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea name="remarks" className="form-input" rows={3} value={formData.remarks} onChange={handleChange}></textarea>
        </div>
        <button type="submit" className="btn btn-primary">Save Inward Entry</button>
      </form>
    </div>
  );
}
