import { getPrisma } from './lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing in Vercel.');
  }
  return createClient(url, key);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let supabase;
  let prisma;
  try {
    supabase = getSupabase();
    prisma = getPrisma();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      const inwards = await prisma.inward.findMany({ 
        include: { items: true },
        orderBy: { date: 'desc' } 
      });
      return res.status(200).json(inwards);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch inwards' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const newInward = await prisma.inward.create({
        data: {
          from: data.from,
          remarks: data.remarks,
          documentData: data.documentData,
          items: {
            create: data.items.map((item: any) => ({
              modelNo: item.modelNo,
              productType: item.productType,
              slNo: item.slNo,
              qty: item.qty
            }))
          }
        },
        include: { items: true }
      });
      return res.status(201).json(newInward);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create inward' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing ID' });
      await prisma.inward.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete inward' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const data = req.body;
      if (!data.id) return res.status(400).json({ error: 'Missing ID' });
      
      const updatedInward = await prisma.inward.update({
        where: { id: data.id },
        data: {
          from: data.from,
          remarks: data.remarks,
          items: {
            deleteMany: {}, // Delete all old nested items
            create: data.items.map((item: any) => ({
              modelNo: item.modelNo,
              productType: item.productType,
              slNo: item.slNo,
              qty: item.qty,
              unitValue: item.unitValue,
            }))
          }
        },
        include: {
          items: true
        }
      });
      return res.status(200).json(updatedInward);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update inward' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
