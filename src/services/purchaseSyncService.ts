import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PurchaseOrder } from '../types';

export interface FirestorePurchaseRecord {
  invoiceNumber: string;
  orderId: string;
  date: string;
  receivedDate: string;
  supplier: {
    id: string;
    name: string;
  };
  items: Array<{
    medicineId: string;
    name: string;
    batchNo: string;
    expireDate: string;
    quantity: number;
    unitPrice: number;
    totalCost: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  status: string;
  savedAt: string;
  userId?: string;
}

/**
 * Saves a single purchase order to Firebase Firestore under the 'purchase_history' collection.
 * Uses the unique invoice/PO number as the Firestore document ID for deterministic idempotency.
 */
export async function savePurchaseToFirestore(
  po: PurchaseOrder,
  userId?: string
): Promise<{ success: boolean; id: string; error?: string }> {
  try {
    const docId = (po.poNumber && po.poNumber.trim() ? po.poNumber.trim() : po.id).replace(/\//g, '_');
    const docRef = doc(db, 'purchase_history', docId);

    const record: FirestorePurchaseRecord = {
      invoiceNumber: po.poNumber || docId,
      orderId: po.id,
      date: po.orderDate || new Date().toISOString(),
      receivedDate: po.receivedDate || po.orderDate || new Date().toISOString(),
      supplier: {
        id: po.supplierId || 'sup-unknown',
        name: po.supplierName || 'Unknown Supplier',
      },
      items: (po.items || []).map((it) => ({
        medicineId: it.medicineId,
        name: it.medicineName,
        batchNo: it.batchNumber || '',
        expireDate: it.expiryDate || '',
        quantity: it.quantity,
        unitPrice: it.purchasePrice,
        totalCost: it.totalCost,
      })),
      totalAmount: po.totalAmount,
      paidAmount: po.paidAmount,
      dueAmount: Math.max(0, Number((po.totalAmount - (po.paidAmount || 0)).toFixed(2))),
      paymentStatus: po.paymentStatus || 'Paid',
      status: po.status || 'Received',
      savedAt: new Date().toISOString(),
      userId: userId || 'default_store',
    };

    await setDoc(docRef, record, { merge: true });
    return { success: true, id: docId };
  } catch (err: any) {
    console.warn('[PurchaseSync] Firestore save notice (offline fallback active):', err?.message || err);
    return { success: false, id: po.poNumber || po.id, error: err?.message || 'Network error' };
  }
}

/**
 * Batch saves multiple purchase orders to Firebase Firestore under 'purchase_history'
 */
export async function syncAllPurchasesToFirestore(
  purchaseOrders: PurchaseOrder[],
  userId?: string
): Promise<number> {
  let savedCount = 0;
  for (const po of purchaseOrders) {
    const res = await savePurchaseToFirestore(po, userId);
    if (res.success) savedCount++;
  }
  return savedCount;
}

/**
 * Fetches recent purchase orders from the 'purchase_history' Firestore collection
 */
export async function fetchPurchasesFromFirestore(limitCount = 50): Promise<PurchaseOrder[]> {
  try {
    const colRef = collection(db, 'purchase_history');
    const q = query(colRef, orderBy('date', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    const results: PurchaseOrder[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestorePurchaseRecord;
      results.push({
        id: data.orderId || docSnap.id,
        poNumber: data.invoiceNumber || docSnap.id,
        supplierId: data.supplier?.id || 'sup-default',
        supplierName: data.supplier?.name || 'Wholesale Supplier',
        orderDate: data.date,
        receivedDate: data.receivedDate,
        status: (data.status as any) || 'Received',
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount,
        paymentStatus: data.paymentStatus,
        items: (data.items || []).map((it) => ({
          medicineId: it.medicineId,
          medicineName: it.name,
          batchNumber: it.batchNo,
          expiryDate: it.expireDate,
          quantity: it.quantity,
          purchasePrice: it.unitPrice,
          totalCost: it.totalCost,
        })),
      });
    });

    return results;
  } catch (err: any) {
    console.warn('[PurchaseSync] Firestore fetch notice:', err?.message || err);
    return [];
  }
}
