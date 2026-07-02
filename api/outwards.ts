import { PrismaClient } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const outwards = await prisma.outward.findMany({ 
        include: { items: true },
        orderBy: { date: 'desc' } 
      });
      return res.status(200).json(outwards);
    } catch (error) {
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

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
