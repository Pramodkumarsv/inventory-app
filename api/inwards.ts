import { PrismaClient } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const inwards = await prisma.inward.findMany({ orderBy: { date: 'desc' } });
      return res.status(200).json(inwards);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch inwards' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const newInward = await prisma.inward.create({
        data: {
          modelNo: data.modelNo,
          productType: data.productType,
          slNo: data.slNo,
          qty: data.qty,
          from: data.from,
          remarks: data.remarks,
          documentData: data.documentData
        }
      });
      return res.status(201).json(newInward);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create inward' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
