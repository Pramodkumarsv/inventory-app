import type { InwardRecord, OutwardRecord, OutwardItem } from './types';

// Simple pub/sub for React to subscribe to store changes
type Listener = () => void;
let listeners: Listener[] = [];

function emitChange() {
  for (let listener of listeners) {
    listener();
  }
}

export const store = {
  getInwards: (): InwardRecord[] => {
    const data = localStorage.getItem('inventory_inwards');
    return data ? JSON.parse(data) : [];
  },
  
  addInward: (record: Omit<InwardRecord, 'id' | 'date'>) => {
    const inwards = store.getInwards();
    const newRecord: InwardRecord = {
      ...record,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: record.items.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }))
    };
    inwards.push(newRecord);
    localStorage.setItem('inventory_inwards', JSON.stringify(inwards));
    emitChange();
  },

  updateInward: (id: string, updatedRecord: Partial<InwardRecord>) => {
    const inwards = store.getInwards();
    const idx = inwards.findIndex(i => i.id === id);
    if (idx > -1) {
      inwards[idx] = { ...inwards[idx], ...updatedRecord };
      localStorage.setItem('inventory_inwards', JSON.stringify(inwards));
      emitChange();
    }
  },

  deleteInward: (id: string) => {
    let inwards = store.getInwards();
    inwards = inwards.filter(i => i.id !== id);
    localStorage.setItem('inventory_inwards', JSON.stringify(inwards));
    emitChange();
  },

  getOutwards: (): OutwardRecord[] => {
    const data = localStorage.getItem('inventory_outwards');
    return data ? JSON.parse(data) : [];
  },
  
  addOutward: (record: Omit<OutwardRecord, 'id' | 'date'>) => {
    const outwards = store.getOutwards();
    const newRecord: OutwardRecord = {
      ...record,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: record.items.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }))
    };
    outwards.push(newRecord);
    localStorage.setItem('inventory_outwards', JSON.stringify(outwards));
    emitChange();
  },

  updateOutward: (id: string, updatedRecord: Partial<OutwardRecord>) => {
    const outwards = store.getOutwards();
    const idx = outwards.findIndex(o => o.id === id);
    if (idx > -1) {
      outwards[idx] = { ...outwards[idx], ...updatedRecord };
      localStorage.setItem('inventory_outwards', JSON.stringify(outwards));
      emitChange();
    }
  },

  deleteOutward: (id: string) => {
    let outwards = store.getOutwards();
    outwards = outwards.filter(o => o.id !== id);
    localStorage.setItem('inventory_outwards', JSON.stringify(outwards));
    emitChange();
  },

  subscribe: (listener: Listener) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};
