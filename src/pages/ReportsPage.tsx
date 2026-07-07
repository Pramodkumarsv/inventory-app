import { useState, useMemo, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import * as XLSX from 'xlsx';

export function ReportsPage() {
  const { inwards, outwards, addInward, deleteOutward, deleteInward } = useStore();
  const [globalSearch, setGlobalSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<{ type: 'INWARD' | 'OUTWARD', data: any } | null>(null);

  const filteredInwards = useMemo(() => {
    const searchLower = globalSearch.toLowerCase();
    return inwards.filter(i => 
      !globalSearch.trim() || 
      i.from.toLowerCase().includes(searchLower) ||
      (i.remarks && i.remarks.toLowerCase().includes(searchLower)) ||
      (i.items || []).some(item => item.modelNo.toLowerCase().includes(searchLower))
    );
  }, [inwards, globalSearch]);

  // Calculate available qty by model no
  const availableByModel = useMemo(() => {
    const map: Record<string, { modelNo: string, availableQty: number, productType: string }> = {};
    
    inwards.forEach(i => {
      (i.items || []).forEach(item => {
        if (!map[item.modelNo]) {
          map[item.modelNo] = { modelNo: item.modelNo, availableQty: 0, productType: item.productType };
        }
        map[item.modelNo].availableQty += item.qty;
      });
    });

    outwards.forEach(o => {
      (o.items || []).forEach(item => {
        if (map[item.modelNo]) {
          map[item.modelNo].availableQty -= item.qty;
        }
      });
    });

    return Object.values(map);
  }, [inwards, outwards]);

  const totalAvailableQty = useMemo(() => {
    return availableByModel.reduce((acc, curr) => acc + curr.availableQty, 0);
  }, [availableByModel]);



  const filteredAvailable = useMemo(() => {
    const searchLower = globalSearch.toLowerCase();
    return availableByModel.filter(item => 
      !globalSearch.trim() || 
      item.modelNo.toLowerCase().includes(searchLower) || 
      item.productType.toLowerCase().includes(searchLower)
    );
  }, [availableByModel, globalSearch]);

  const exportExcel = () => {
    const data = availableByModel.map(item => ({
      'Model No': item.modelNo,
      'Product Type': item.productType,
      'Available Quantity': item.availableQty
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      // Convert rows to Inward Items
      const newItems = data.map(row => ({
        modelNo: row['Model No'] || row['modelNo'] || row['Model'],
        productType: row['Product Type'] || row['productType'] || row['Product'] || 'Imported',
        slNo: row['Serial No'] || row['slNo'] || row['Serial'] || '',
        qty: parseInt(row['Quantity'] || row['qty'] || row['Qty']) || 1
      })).filter(i => i.modelNo);

      if (newItems.length > 0) {
        addInward({
          from: 'Excel Import',
          remarks: 'Bulk imported stock from Excel',
          items: newItems
        } as any);
        alert(`Successfully imported ${newItems.length} items!`);
      } else {
        alert('No valid items found in Excel. Please ensure columns match: Model No, Product Type, Quantity');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteOutward = (id: string) => {
    if(confirm("Are you sure you want to delete this outward record?")) {
      deleteOutward(id);
    }
  };

  // Item Details Modal Data
  const getDetailsForModel = (modelNo: string) => {
    const history: any[] = [];
    inwards.forEach(i => {
      (i.items || []).forEach(item => {
        if (item.modelNo === modelNo) {
          history.push({ type: 'INWARD', date: i.date, qty: item.qty, fromTo: i.from, id: i.id });
        }
      });
    });
    outwards.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.modelNo === modelNo) {
          history.push({ type: 'OUTWARD', date: o.date, qty: item.qty, fromTo: o.customerName, id: o.id });
        }
      });
    });
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleDeleteInward = (id: string) => {
    if(confirm("Are you sure you want to delete this INWARD record? This will delete all items in it.")) {
      deleteInward(id);
      setSelectedItem(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="card" style={{ padding: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Global Search (Model No, Product Type, Customer, Project, Location)..." 
          className="form-input" 
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          style={{ fontSize: '1.125rem', padding: '1rem', width: '100%', borderColor: 'var(--primary)' }}
        />
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Dashboard Overview</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={exportExcel} className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⬇️</span> Export Excel
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary" style={{ backgroundColor: 'var(--secondary)', color: 'white', fontSize: '0.875rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⬆️</span> Import Excel
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
            {totalAvailableQty}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Available Qty</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>Available Quantity By Model No</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Click on a Model No to view its transaction history.</p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Model No</th>
                <th>Product Type</th>
                <th>Available Quantity</th>
              </tr>
            </thead>
            <tbody>
              {filteredAvailable.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No inventory matches your search.</td>
                </tr>
              ) : (
                filteredAvailable.map(item => (
                  <tr key={item.modelNo}>
                    <td>
                      <button 
                        onClick={() => setSelectedItem(item.modelNo)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {item.modelNo}
                      </button>
                    </td>
                    <td>{item.productType}</td>
                    <td>{item.availableQty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>Recent Inward Records</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>From (Vendor)</th>
                <th>Total Items</th>
                <th>Remarks</th>
                <th>Document</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInwards.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No inward records found.</td>
                </tr>
              ) : (
                filteredInwards.map(i => (
                  <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({ type: 'INWARD', data: i })}>
                    <td>{new Date(i.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '500' }}>{i.from}</td>
                    <td>{(i.items || []).reduce((acc, curr) => acc + curr.qty, 0)}</td>
                    <td>{i.remarks || '-'}</td>
                    <td>
                      {i.documentData ? (
                        <a 
                          href={i.documentData} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()} // Prevent opening the row modal when clicking the link
                          style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: '500' }}
                        >
                          📎 View
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteInward(i.id); }} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Recent Outward Records</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Project</th>
                <th>Total Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outwards.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No outward records found.</td>
                </tr>
              ) : (
                outwards.filter(o => 
                  !globalSearch.trim() || 
                  o.customerName.toLowerCase().includes(globalSearch.toLowerCase()) || 
                  (o.projectName && o.projectName.toLowerCase().includes(globalSearch.toLowerCase()))
                ).map(o => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({ type: 'OUTWARD', data: o })}>
                    <td>{new Date(o.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '500' }}>{o.customerName}</td>
                    <td>{o.projectName || '-'}</td>
                    <td>{(o.items || []).reduce((acc, curr) => acc + curr.qty, 0)}</td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteOutward(o.id); }} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>History: {selectedItem}</h2>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Location / Customer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDetailsForModel(selectedItem).map((entry, idx) => (
                    <tr key={idx}>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td style={{ color: entry.type === 'INWARD' ? 'var(--secondary)' : 'var(--danger)', fontWeight: 'bold' }}>{entry.type}</td>
                      <td>{entry.qty}</td>
                      <td>{entry.fromTo}</td>
                      <td>
                        <button 
                          onClick={() => entry.type === 'INWARD' ? handleDeleteInward(entry.id) : handleDeleteOutward(entry.id)} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                        >
                          Delete Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Full Details Modal for Inward/Outward Records */}
      {selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {selectedRecord.type === 'INWARD' ? 'Inward Receipt Details' : 'Outward Invoice Details'}
              </h2>
              <button onClick={() => setSelectedRecord(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            
            <div className="grid grid-cols-2" style={{ marginBottom: '2rem', gap: '1rem' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Date</p>
                <p style={{ fontWeight: '500' }}>{new Date(selectedRecord.data.date).toLocaleDateString()}</p>
              </div>
              {selectedRecord.type === 'INWARD' ? (
                <>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>From (Vendor)</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.from}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Remarks</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.remarks || '-'}</p>
                  </div>
                  {selectedRecord.data.documentData && (
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Captured Photo / Document</p>
                      <a href={selectedRecord.data.documentData} target="_blank" rel="noreferrer">
                        <img src={selectedRecord.data.documentData} alt="Document" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Customer Name</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.customerName}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Contact No</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.contactNo}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Project Name</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.projectName || '-'}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Dispatched From</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.from}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Address</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.address}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Remarks</p>
                    <p style={{ fontWeight: '500' }}>{selectedRecord.data.remarks || '-'}</p>
                  </div>
                </>
              )}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Items Scanned</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Model No</th>
                    <th>Product Type</th>
                    <th>Serial No</th>
                    <th>Qty</th>
                    <th>Unit Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRecord.data.items || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '500' }}>{item.modelNo}</td>
                      <td>{item.productType}</td>
                      <td>{item.slNo || '-'}</td>
                      <td>{item.qty}</td>
                      <td>{item.unitValue || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedRecord(null)} className="btn btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
