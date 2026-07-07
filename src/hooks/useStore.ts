import { useState, useEffect, useCallback } from 'react';
import type { InwardRecord, OutwardRecord } from '../types';
import { supabase } from '../lib/supabase';

export function useStore() {
  const [inwards, setInwards] = useState<InwardRecord[]>([]);
  const [outwards, setOutwards] = useState<OutwardRecord[]>([]);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.access_token}` : '',
    };
  };

  const fetchInwards = useCallback(async () => {
    try {
      const res = await fetch('/api/inwards', { headers: await getHeaders() });
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        setInwards(await res.json());
      } else {
        console.error('Expected JSON, got HTML. Are you running "npm run dev" instead of "vercel dev"?');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchOutwards = useCallback(async () => {
    try {
      const res = await fetch('/api/outwards', { headers: await getHeaders() });
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        setOutwards(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchInwards();
    fetchOutwards();
  }, [fetchInwards, fetchOutwards]);

  const addInward = async (record: Omit<InwardRecord, 'id' | 'date'>) => {
    const res = await fetch('/api/inwards', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(record),
    });
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      fetchInwards();
    } else {
      const text = await res.text();
      throw new Error(`Failed to save inward. Backend responded with: ${text || 'Unknown Error (Are environment variables missing?)'}`);
    }
  };

  const addOutward = async (record: Omit<OutwardRecord, 'id' | 'date'>) => {
    const res = await fetch('/api/outwards', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(record),
    });
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      fetchOutwards();
    } else {
      const text = await res.text();
      throw new Error(`Failed to save outward. Backend responded with: ${text || 'Unknown Error (Are environment variables missing?)'}`);
    }
  };

  const deleteInward = async (id: string) => {
    const res = await fetch('/api/inwards', {
      method: 'DELETE',
      headers: await getHeaders(),
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchInwards();
    else throw new Error('Failed to delete inward');
  };

  const updateInward = async (id: string, record: Partial<InwardRecord>) => {
    const res = await fetch('/api/inwards', {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ id, ...record }),
    });
    if (res.ok) fetchInwards();
    else throw new Error('Failed to update inward');
  };

  const deleteOutward = async (id: string) => {
    const res = await fetch('/api/outwards', {
      method: 'DELETE',
      headers: await getHeaders(),
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchOutwards();
    else throw new Error('Failed to delete outward');
  };

  const updateOutward = async (id: string, record: Partial<OutwardRecord>) => {
    const res = await fetch('/api/outwards', {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify({ id, ...record }),
    });
    if (res.ok) fetchOutwards();
    else throw new Error('Failed to update outward');
  };

  return {
    inwards,
    outwards,
    addInward,
    updateInward,
    deleteInward,
    addOutward,
    updateOutward,
    deleteOutward,
  };
}
