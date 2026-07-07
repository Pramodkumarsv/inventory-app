import { useState, useMemo, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Eye, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  History,
  X
} from 'lucide-react';

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

  const totalInwardRecords = inwards.length;
  const totalOutwardRecords = outwards.length;

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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Track and manage your inventory operations in real-time.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={exportExcel} className="btn btn-secondary">
            <Download size={18} /> Export Data
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
            <Upload size={18} /> Import Excel
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card card-hover">
          <div className="stat-icon"><Package size={24} /></div>
          <div>
            <div className="stat-value">{totalAvailableQty}</div>
            <div className="stat-label">Total Available Units</div>
          </div>
        </div>
        <div className="card stat-card card-hover">
          <div className="stat-icon success"><ArrowDownToLine size={24} /></div>
          <div>
            <div className="stat-value">{totalInwardRecords}</div>
            <div className="stat-label">Total Inward Logs</div>
          </div>
        </div>
        <div className="card stat-card card-hover">
          <div className="stat-icon warning"><ArrowUpFromLine size={24} /></div>
          <div>
            <div className="stat-value">{totalOutwardRecords}</div>
            <div className="stat-label">Total Outward Logs</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Global Search (Model No, Product Type, Customer, Project, Location)..." 
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-main)', 
              fontSize: '1.125rem',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div className="grid">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Available Inventory</h3>
            <p className="page-subtitle">Current stock levels by Model No.</p>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none', borderTop: 'none', maxHeight: '400px' }}>
            <table>
              <thead>
                <tr>
                  <th>Model No</th>
                  <th>Product Type</th>
                  <th>Available Qty</th>
                </tr>
              </thead>
              <tbody>
                {filteredAvailable.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No inventory matches your search.</td>
                  </tr>
                ) : (
                  filteredAvailable.map(item => (
                    <tr key={item.modelNo}>
                      <td>
                        <button 
                          onClick={() => setSelectedItem(item.modelNo)}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--primary)', 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <History size={16} />
                          {item.modelNo}
                        </button>
                      </td>
                      <td>{item.productType}</td>
                      <td><span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{item.availableQty}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Recent Activity</h3>
            <p className="page-subtitle">Latest inward & outward logs.</p>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none', borderTop: 'none', maxHeight: '400px' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Source / Dest</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredInwards.slice(0, 5).map(i => (
                  <tr key={`in-${i.id}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({ type: 'INWARD', data: i })}>
                    <td>{new Date(i.date).toLocaleDateString()}</td>
                    <td><span className="badge badge-inward">INWARD</span></td>
                    <td style={{ fontWeight: 500 }}>{i.from}</td>
                    <td><Eye size={18} color="var(--text-muted)" /></td>
                  </tr>
                ))}
                {outwards.slice(0, 5).map(o => (
                  <tr key={`out-${o.id}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({ type: 'OUTWARD', data: o })}>
                    <td>{new Date(o.date).toLocaleDateString()}</td>
                    <td><span className="badge badge-outward">OUTWARD</span></td>
                    <td style={{ fontWeight: 500 }}>{o.customerName}</td>
                    <td><Eye size={18} color="var(--text-muted)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>All Inward Records</h3>
        </div>
        <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>From (Vendor)</th>
                <th>Total Items</th>
                <th>Remarks</th>
                <th>Document</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInwards.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No inward records found.</td>
                </tr>
              ) : (
                filteredInwards.map(i => (
                  <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({ type: 'INWARD', data: i })}>
                    <td>{new Date(i.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{i.from}</td>
                    <td>{(i.items || []).reduce((acc, curr) => acc + curr.qty, 0)} Units</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.remarks || '-'}</td>
                    <td>
                      {i.documentData ? (
                        <a 
                          href={i.documentData} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Eye size={16} /> View
                        </a>
                      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteInward(i.id); }} 
                        className="btn btn-sm btn-danger"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>All Outward Records</h3>
        </div>
        <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Project</th>
                <th>Total Items</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outwards.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No outward records found.</td>
                </tr>
              ) : (
                outwards.filter(o => 
                  !globalSearch.trim() || 
                  o.customerName.toLowerCase().includes(globalSearch.toLowerCase()) || 
                  (o.projectName && o.projectName.toLowerCase().includes(globalSearch.toLowerCase()))
                ).map(o => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord({ type: 'OUTWARD', data: o })}>
                    <td>{new Date(o.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{o.customerName}</td>
                    <td>{o.projectName || '-'}</td>
                    <td>{(o.items || []).reduce((acc, curr) => acc + curr.qty, 0)} Units</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteOutward(o.id); }} 
                        className="btn btn-sm btn-danger"
                      >
                        <Trash2 size={16} /> Delete
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Model History</h2>
                <p className="page-subtitle" style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedItem}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Location / Customer</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getDetailsForModel(selectedItem).map((entry, idx) => (
                    <tr key={idx}>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${entry.type === 'INWARD' ? 'badge-inward' : 'badge-outward'}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{entry.qty}</td>
                      <td>{entry.fromTo}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => entry.type === 'INWARD' ? handleDeleteInward(entry.id) : handleDeleteOutward(entry.id)} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          <Trash2 size={16} />
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedRecord.type === 'INWARD' ? 'Inward Receipt' : 'Outward Invoice'} Details
                </h2>
                <p className="page-subtitle">ID: {selectedRecord.data.id}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div className="grid grid-cols-2" style={{ marginBottom: '2.5rem', gap: '1.5rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Date</p>
                  <p style={{ fontWeight: 500, fontSize: '1.125rem' }}>{new Date(selectedRecord.data.date).toLocaleDateString()}</p>
                </div>
                {selectedRecord.type === 'INWARD' ? (
                  <>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>From (Vendor)</p>
                      <p style={{ fontWeight: 500, fontSize: '1.125rem' }}>{selectedRecord.data.from}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Remarks</p>
                      <p style={{ fontWeight: 500, background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.5rem' }}>{selectedRecord.data.remarks || '-'}</p>
                    </div>
                    {selectedRecord.data.documentData && (
                      <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Captured Photo / Document</p>
                        <a href={selectedRecord.data.documentData} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <img src={selectedRecord.data.documentData} alt="Document" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', background: 'var(--bg-main)' }} />
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Customer Name</p>
                      <p style={{ fontWeight: 500, fontSize: '1.125rem' }}>{selectedRecord.data.customerName}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Contact No</p>
                      <p style={{ fontWeight: 500, fontSize: '1.125rem' }}>{selectedRecord.data.contactNo}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Project Name</p>
                      <p style={{ fontWeight: 500, fontSize: '1.125rem' }}>{selectedRecord.data.projectName || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Dispatched From</p>
                      <p style={{ fontWeight: 500, fontSize: '1.125rem' }}>{selectedRecord.data.from}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Address</p>
                      <p style={{ fontWeight: 500, background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.5rem' }}>{selectedRecord.data.address}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Remarks</p>
                      <p style={{ fontWeight: 500, background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.5rem' }}>{selectedRecord.data.remarks || '-'}</p>
                    </div>
                  </>
                )}
              </div>

              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '2rem 0 1rem' }}>Items Transacted</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Model No</th>
                      <th>Product Type</th>
                      <th>Serial No</th>
                      <th>Qty</th>
                      {selectedRecord.type === 'OUTWARD' && <th>Unit Value</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRecord.data.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.modelNo}</td>
                        <td>{item.productType}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.slNo || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{item.qty}</td>
                        {selectedRecord.type === 'OUTWARD' && <td>${item.unitValue || 0}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedRecord(null)} className="btn btn-secondary">Close Window</button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
