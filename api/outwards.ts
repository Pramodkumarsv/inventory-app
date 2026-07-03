import { prisma } from './lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '', 
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      const outwards = await prisma.outward.findMany({ 
        include: { items: true },
        orderBy: { date: 'desc' } 
      });
      return res.status(200).json(outwards);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch outwards' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const newOutward = await prisma.outward.create({
        data: {
          customerName: data.customerName,
          contactNo: data.contactNo,
          address: data.address,
          projectName: data.projectName,
          from: data.from,
          remarks: data.remarks,
          items: {
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
      return res.status(201).json(newOutward);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create outward' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing ID' });
      await prisma.outward.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete outward' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const data = req.body;
      if (!data.id) return res.status(400).json({ error: 'Missing ID' });
      
      const updatedOutward = await prisma.outward.update({
        where: { id: data.id },
        data: {
          customerName: data.customerName,
          contactNo: data.contactNo,
          address: data.address,
          projectName: data.projectName,
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
      return res.status(200).json(updatedOutward);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update outward' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
