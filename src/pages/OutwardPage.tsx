import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OutwardRecord, OutwardItem } from '../types';

export function OutwardPage() {
  const { addOutward, inwards, outwards } = useStore();
  
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
    
    const inwardQty = inwards.filter(i => i.modelNo === modelNo).reduce((acc, curr) => acc + curr.qty, 0);
    
    // Count qty already dispatched in past outward records
    let outwardQty = 0;
    outwards.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.modelNo === modelNo) outwardQty += item.qty;
      });
    });

    // Also subtract qty in the current form for the same model (excluding the current item being edited? 
    // Just simple available qty from store is fine for the UI display)
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
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. Invoice - SOLUM - ESL - Not for Sale", 15, 20);
    
    // Red Text
    doc.setTextColor(239, 68, 68); // Tailwind red-500
    doc.setFontSize(18);
    doc.text("Fragile item handle with care", 15, 30);
    
    // Reset Color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Shipper
    doc.setFont("helvetica", "bold");
    doc.text("Shipper:", 15, 45);
    doc.setFont("helvetica", "normal");
    doc.text("SOLUM Technologies Pvt Limited", 35, 45);
    doc.text("Phoenix Asia Towers, 239/240/275, NH - 44, Bellary Road, Taluk, above Mall of", 15, 50);
    doc.text("Asia, Byatarayanapura, Yelahanka, Bengaluru, Karnataka 560092.", 15, 55);
    doc.text("Phone: +91-90303 49623 / 9886569255", 15, 60);
    
    // Consignee
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Consignee:", 15, 75);
    doc.text(`${record.customerName} - ${record.contactNo}`, 15, 82);
    
    doc.setFontSize(12);
    if(record.projectName) doc.text(record.projectName, 15, 89);
    
    doc.setFontSize(10);
    const addressLines = doc.splitTextToSize(record.address, 100);
    doc.text(addressLines, 15, 96);
    
    // Table
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
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total:`, 110, finalY + 8);
    doc.text(grandTotal.toString(), 150, finalY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Value declared is for customs purpose only and has no commercial value.", 15, finalY + 25);
    
    doc.save(`Invoice_${record.customerName}_${Date.now()}.pdf`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate quantities
    for (const item of items) {
      if (!item.modelNo) {
        alert('Please fill out Model No for all items');
        return;
      }
      const avail = getAvailableQty(item.modelNo);
      // Wait, we need to check if they added the same model multiple times in the form!
      const qtyInForm = items.filter(i => i.modelNo === item.modelNo).reduce((acc, curr) => acc + curr.qty, 0);
      if (qtyInForm > avail) {
        alert(`Cannot dispatch ${qtyInForm} of ${item.modelNo}. Only ${avail} available.`);
        return;
      }
    }
    
    const recordToSave = {
      ...formData,
      items: items as OutwardItem[] // ignoring ID for creation payload
    };
    
    addOutward(recordToSave as any);
    generatePDF(recordToSave as any);

    // Reset Form
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
  };

  return (
    <div className="card">
      <h1 className="page-title">Outward Entry (Multi-Item)</h1>
      <form onSubmit={handleSubmit}>
        
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Consignee Details</h2>
        <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input required type="text" name="customerName" className="form-input" value={formData.customerName} onChange={handleFormChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact No</label>
            <input required type="text" name="contactNo" className="form-input" value={formData.contactNo} onChange={handleFormChange} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <textarea required name="address" className="form-input" rows={2} value={formData.address} onChange={handleFormChange}></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Project Name / Company</label>
            <input type="text" name="projectName" className="form-input" value={formData.projectName} onChange={handleFormChange} />
          </div>
          <div className="form-group">
            <label className="form-label">From (Location)</label>
            <input required type="text" name="from" className="form-input" value={formData.from} onChange={handleFormChange} />
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
                {item.modelNo && (
                   <small style={{ color: 'var(--secondary)', marginTop: '0.25rem', display: 'block' }}>Available: {getAvailableQty(item.modelNo)}</small>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Product Type</label>
                <input required type="text" name="productType" className="form-input" value={item.productType} onChange={(e) => handleItemChange(index, e)} />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number (Sl no)</label>
                <input type="text" name="slNo" className="form-input" value={item.slNo} onChange={(e) => handleItemChange(index, e)} />
              </div>
              <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Quantity</label>
                  <input required type="number" min="1" name="qty" className="form-input" value={item.qty} onChange={(e) => handleItemChange(index, e)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Unit Value (INR)</label>
                  <input required type="number" min="0" name="unitValue" className="form-input" value={item.unitValue} onChange={(e) => handleItemChange(index, e)} />
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="form-group" style={{ marginTop: '2rem' }}>
          <label className="form-label">Remarks</label>
          <textarea name="remarks" className="form-input" rows={2} value={formData.remarks} onChange={handleFormChange}></textarea>
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
          Save & Generate PDF Invoice
        </button>
      </form>
    </div>
  );
}
