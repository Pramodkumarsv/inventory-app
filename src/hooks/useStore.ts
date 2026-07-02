import { useState, useEffect } from 'react';
import { store } from '../store';
import type { InwardRecord, OutwardRecord } from '../types';

export function useStore() {
  const [inwards, setInwards] = useState<InwardRecord[]>(store.getInwards());
  const [outwards, setOutwards] = useState<OutwardRecord[]>(store.getOutwards());

  useEffect(() => {
    return store.subscribe(() => {
      setInwards(store.getInwards());
      setOutwards(store.getOutwards());
    });
  }, []);

  return {
    inwards,
    outwards,
    addInward: store.addInward,
    addOutward: store.addOutward,
  };
}
