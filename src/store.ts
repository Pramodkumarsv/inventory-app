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
    };
    inwards.push(newRecord);
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

  subscribe: (listener: Listener) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};
