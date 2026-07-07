import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OutwardRecord, OutwardItem } from '../types';
import { FileText, Package, Plus, Trash2, FileCheck2 } from 'lucide-react';

export function OutwardPage() {
  const { addOutward, inwards, outwards } = useStore();
  
  const uniqueModels = Array.from(new Set(
    inwards.flatMap(i => (i.items || []).map(item => item.modelNo))
  ));
  
  const [formData, setFormData] = useState({
    customerName: '',
    contactNo: '',
    address: '',
    projectName: '',
    from: '',
    remarks: ''
  });

  const [items, setItems] = useState<Omit<OutwardItem, 'id'>[]>([
    { modelNo: '', productType: '', slNo: '', qty: 1, unitValue: 0 }
  ]);

  const getAvailableQty = (modelNo: string) => {
    if (!modelNo) return 0;
    
    let inwardQty = 0;
    inwards.forEach(i => {
      (i.items || []).forEach(item => {
        if (item.modelNo === modelNo) inwardQty += item.qty;
      });
    });
    
    let outwardQty = 0;
    outwards.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.modelNo === modelNo) outwardQty += item.qty;
      });
    });

    return inwardQty - outwardQty;
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
      [name]: (name === 'qty' || name === 'unitValue') ? parseFloat(value) || 0 : value
    };

    if (name === 'modelNo') {
      const existingItem = inwards.flatMap(i => i.items || []).find(i => i.modelNo === value);
      if (existingItem) {
        newItems[index].productType = existingItem.productType;
        if (existingItem.slNo) {
          newItems[index].slNo = existingItem.slNo;
        }
      }
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems(prev => [...prev, { modelNo: '', productType: '', slNo: '', qty: 1, unitValue: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const generatePDF = (record: Omit<OutwardRecord, 'id' | 'date'>) => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. Invoice - SOLUM - ESL - Not for Sale", 15, 20);
    
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(18);
    doc.text("Fragile item handle with care", 15, 30);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    doc.setFont("helvetica", "bold");
    doc.text("Shipper:", 15, 45);
    doc.setFont("helvetica", "normal");
    doc.text("SOLUM Technologies Pvt Limited", 35, 45);
    doc.text("Phoenix Asia Towers, 239/240/275, NH - 44, Bellary Road, Taluk, above Mall of", 15, 50);
    doc.text("Asia, Byatarayanapura, Yelahanka, Bengaluru, Karnataka 560092.", 15, 55);
    doc.text("Phone: +91-90303 49623 / 9886569255", 15, 60);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Consignee:", 15, 75);
    doc.text(`${record.customerName} - ${record.contactNo}`, 15, 82);
    
    doc.setFontSize(12);
    if(record.projectName) doc.text(record.projectName, 15, 89);
    
    doc.setFontSize(10);
    const addressLines = doc.splitTextToSize(record.address, 100);
    doc.text(addressLines, 15, 96);
    
    let grandTotal = 0;
    const bodyRows = record.items.map((item, index) => {
      const rowTotal = item.qty * item.unitValue;
      grandTotal += rowTotal;
      return [
        (index + 1).toString(),
        `${item.productType}\nModel No: ${item.modelNo}\nSL No: ${item.slNo || '-'}`,
        item.qty.toString(),
        item.unitValue.toString(),
        rowTotal.toString()
      ];
    });
    
    autoTable(doc, {
      startY: 110,
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
      head: [['Sl. No.', 'Description', 'Quantity', 'Unit Value (INR)', 'Total Value (INR)']],
      body: bodyRows,
      theme: 'grid',
      styles: { cellPadding: 4 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total:`, 110, finalY + 8);
    doc.text(grandTotal.toString(), 150, finalY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Value declared is for customs purpose only and has no commercial value.", 15, finalY + 25);
    
    doc.save(`Invoice_${record.customerName}_${Date.now()}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const item of items) {
      if (!item.modelNo) {
        alert('Please fill out Model No for all items');
        return;
      }
      
      const isKnownModel = uniqueModels.includes(item.modelNo);
      const avail = getAvailableQty(item.modelNo);
      const qtyInForm = items.filter(i => i.modelNo === item.modelNo).reduce((acc, curr) => acc + curr.qty, 0);
      
      if (isKnownModel && qtyInForm > avail) {
        alert(`Cannot dispatch ${qtyInForm} of ${item.modelNo}. Only ${avail} available.`);
        return;
      }
    }
    
    const recordToSave = {
      ...formData,
      items: items as OutwardItem[]
    };
    
    try {
      await addOutward(recordToSave as any);
      generatePDF(recordToSave as any);

      setFormData({
        customerName: '',
        contactNo: '',
        address: '',
        projectName: '',
        from: '',
        remarks: ''
      });
      setItems([{ modelNo: '', productType: '', slNo: '', qty: 1, unitValue: 0 }]);
      
      alert('Outward entry added successfully and PDF generated!');
    } catch (error: any) {
      alert(`Error saving outward: ${error.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outward Entry</h1>
          <p className="page-subtitle">Dispatch inventory, generate invoices, and deduct stock.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} autoComplete="off">
          
          <div className="form-section">
            <h2 className="form-section-title"><FileText size={20} className="upload-icon" style={{ marginBottom: 0 }} /> Consignee Details</h2>
            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input required type="text" name="customerName" className="form-input" placeholder="e.g. John Doe" value={formData.customerName} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact No</label>
                <input required type="text" name="contactNo" className="form-input" placeholder="e.g. +91 9876543210" value={formData.contactNo} onChange={handleFormChange} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Delivery Address</label>
                <textarea required name="address" className="form-input" rows={2} placeholder="Full delivery address..." value={formData.address} onChange={handleFormChange}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Project Name / Company</label>
                <input type="text" name="projectName" className="form-input" placeholder="Optional" value={formData.projectName} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Dispatched From (Location)</label>
                <input required type="text" name="from" className="form-input" placeholder="e.g. Warehouse 1" value={formData.from} onChange={handleFormChange} />
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
                  <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Model No</label>
                      <div style={{ position: 'relative' }}>
                        <input required list={`model-options-${index}`} type="text" name="modelNo" className="form-input" placeholder="e.g. SN-100" value={item.modelNo} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                        <datalist id={`model-options-${index}`}>
                          {uniqueModels.map(m => <option key={m} value={m} />)}
                        </datalist>
                      </div>
                      <div style={{ marginTop: '0.375rem', fontSize: '0.875rem' }}>
                        {item.modelNo && uniqueModels.includes(item.modelNo) ? (
                          <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Available Stock: {getAvailableQty(item.modelNo)}</span>
                        ) : item.modelNo ? (
                          <span style={{ color: 'var(--text-muted)' }}>New item (No stock history)</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Product Type</label>
                      <input required type="text" name="productType" className="form-input" placeholder="e.g. Switch" value={item.productType} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Serial Number</label>
                      <input type="text" name="slNo" className="form-input" placeholder="Optional" value={item.slNo} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                    </div>
                    
                    <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: 0 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Quantity</label>
                        <input required type="number" min="1" name="qty" className="form-input" value={item.qty} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Unit Value (INR)</label>
                        <input required type="number" min="0" name="unitValue" className="form-input" value={item.unitValue} onChange={(e) => handleItemChange(index, e)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Additional Remarks</label>
              <textarea name="remarks" className="form-input" rows={2} placeholder="Any delivery notes..." value={formData.remarks} onChange={handleFormChange}></textarea>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>
                <FileCheck2 size={20} /> Save & Generate PDF
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
