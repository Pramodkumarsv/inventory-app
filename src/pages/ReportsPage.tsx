import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';

export function ReportsPage() {
  const { inwards, outwards } = useStore();
  const [searchModel, setSearchModel] = useState('');

  // Calculate available qty by model no
  const availableByModel = useMemo(() => {
    const map: Record<string, { modelNo: string, availableQty: number, productType: string }> = {};
    
    inwards.forEach(i => {
      if (!map[i.modelNo]) {
        map[i.modelNo] = { modelNo: i.modelNo, availableQty: 0, productType: i.productType };
      }
      map[i.modelNo].availableQty += i.qty;
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

  // Total available quantity overall
  const totalAvailableQty = useMemo(() => {
    return availableByModel.reduce((acc, curr) => acc + curr.availableQty, 0);
  }, [availableByModel]);

  // Outward detail model no wise search
  // We need to flatten the outwards to show item-level outward details
  const filteredOutwards = useMemo(() => {
    const flattened: any[] = [];
    outwards.forEach(o => {
      (o.items || []).forEach(item => {
        if (!searchModel.trim() || item.modelNo.toLowerCase().includes(searchModel.toLowerCase())) {
          flattened.push({
            id: o.id + '-' + item.id,
            date: o.date,
            customerName: o.customerName,
            projectName: o.projectName,
            modelNo: item.modelNo,
            qty: item.qty,
            from: o.from,
            unitValue: item.unitValue
          });
        }
      });
    });
    return flattened;
  }, [outwards, searchModel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Overview Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Dashboard Overview</h2>
          <p style={{ color: 'var(--text-muted)' }}>Real-time inventory metrics</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
            {totalAvailableQty}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Available Qty</div>
        </div>
      </div>

      {/* Available Qty By Model No */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>Available Quantity By Model No</h3>
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
              {availableByModel.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No inventory data available.</td>
                </tr>
              ) : (
                availableByModel.map(item => (
                  <tr key={item.modelNo}>
                    <td style={{ fontWeight: '500', color: 'var(--primary)' }}>{item.modelNo}</td>
                    <td>{item.productType}</td>
                    <td>{item.availableQty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outward detail model no wise search */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Outward Details</h3>
          <div style={{ width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search by Model No..." 
              className="form-input" 
              value={searchModel}
              onChange={e => setSearchModel(e.target.value)}
            />
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Project</th>
                <th>Model No</th>
                <th>Qty</th>
                <th>Unit Value</th>
                <th>From</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutwards.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No outward records found.</td>
                </tr>
              ) : (
                filteredOutwards.map(o => (
                  <tr key={o.id}>
                    <td>{new Date(o.date).toLocaleDateString()}</td>
                    <td>{o.customerName}</td>
                    <td>{o.projectName || '-'}</td>
                    <td style={{ fontWeight: '500' }}>{o.modelNo}</td>
                    <td>{o.qty}</td>
                    <td>{o.unitValue}</td>
                    <td>{o.from}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
