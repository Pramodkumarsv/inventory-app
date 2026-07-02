export interface InwardRecord {
  id: string;
  modelNo: string;
  productType: string;
  slNo: string;
  qty: number;
  from: string;
  remarks: string;
  date: string;
  documentData?: string; // Base64 string of the uploaded document
}

export interface OutwardItem {
  id: string;
  modelNo: string;
  productType: string;
  slNo: string;
  qty: number;
  unitValue: number;
}

export interface OutwardRecord {
  id: string;
  customerName: string;
  contactNo: string;
  address: string;
  projectName: string;
  from: string;
  remarks: string;
  date: string;
  items: OutwardItem[];
}
