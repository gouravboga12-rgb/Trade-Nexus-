import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { sendCustomerInvoiceEmail } from '../services/emailService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/invoices
router.get('/', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, clientEmail } = req.query;
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (clientEmail) {
      sql += ' AND LOWER(clientEmail) = LOWER(?)';
      params.push(String(clientEmail).trim());
    }

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(String(startDate).trim());
    }

    if (endDate) {
      sql += ' AND date <= ?';
      params.push(String(endDate).trim());
    }

    sql += ' ORDER BY createdAt DESC';
    const rows = db.prepare(sql).all(...params) as any[];

    // Parse JSON items if needed
    const parsed = rows.map((r) => {
      try {
        return {
          ...r,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
        };
      } catch {
        return r;
      }
    });

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/invoices
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      id,
      invoiceNumber,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      clientAddress,
      fromName,
      fromRole,
      fromPhone,
      fromEmail,
      fromAddress,
      items,
      subTotal,
      taxRate,
      taxAmount,
      grandTotal,
      note,
      bankName,
      accountNumber,
      ifscCode,
      paymentEmail,
      status,
      date,
      dueDate,
    } = req.body;

    if (!clientName || !clientEmail || !invoiceNumber) {
      return res.status(400).json({ error: 'Client Name, Email and Invoice Number are required' });
    }

    const invId = id || `inv-${Date.now()}`;
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);
    const createdBy = (req as any).user?.name || 'HR/Admin';

    db.prepare(`
      INSERT INTO invoices (
        id, invoiceNumber, clientName, clientCompany, clientEmail, clientPhone, clientAddress,
        fromName, fromRole, fromPhone, fromEmail, fromAddress,
        items, subTotal, taxRate, taxAmount, grandTotal, note,
        bankName, accountNumber, ifscCode, paymentEmail, status,
        date, dueDate, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invId,
      invoiceNumber.trim(),
      clientName.trim(),
      clientCompany ? clientCompany.trim() : null,
      clientEmail.trim(),
      clientPhone ? clientPhone.trim() : null,
      clientAddress ? clientAddress.trim() : null,
      fromName || 'Finance & Accounts',
      fromRole || 'Commercial Billing',
      fromPhone || null,
      fromEmail || null,
      fromAddress || null,
      itemsJson,
      Number(subTotal) || 0,
      taxRate !== undefined && taxRate !== null && taxRate !== '' ? Number(taxRate) : 18,
      Number(taxAmount) || 0,
      Number(grandTotal) || 0,
      note || null,
      bankName || 'HDFC Bank',
      accountNumber || '50200084920194',
      ifscCode || 'HDFC0001234',
      paymentEmail || 'billing@tradenexus.live',
      status || 'PENDING',
      date || new Date().toLocaleDateString('en-GB'),
      dueDate || null,
      createdBy
    );

    const saved = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;

    // Dispatch email to customer asynchronously
    sendCustomerInvoiceEmail({
      ...saved,
      items: typeof saved.items === 'string' ? JSON.parse(saved.items) : saved.items,
    }).then(() => {
      // Mark as SENT after successful email dispatch
      db.prepare("UPDATE invoices SET status = 'SENT' WHERE id = ?").run(invId);
    }).catch((err) => console.warn('[Invoice Email Warning]', err));

    return res.status(201).json({
      ...saved,
      items: typeof saved.items === 'string' ? JSON.parse(saved.items) : saved.items,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /api/invoices/:id (Update all editable invoice fields)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    const fields = [
      'invoiceNumber', 'clientName', 'clientCompany', 'clientEmail', 'clientPhone', 'clientAddress',
      'fromName', 'fromRole', 'fromPhone', 'fromEmail', 'fromAddress',
      'subTotal', 'taxRate', 'taxAmount', 'grandTotal', 'note',
      'bankName', 'accountNumber', 'ifscCode', 'paymentEmail', 'status', 'date', 'dueDate',
    ];
    const sets: string[] = [];
    const params: any[] = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }
    if (req.body.items !== undefined) {
      sets.push('items = ?');
      params.push(typeof req.body.items === 'string' ? req.body.items : JSON.stringify(req.body.items));
    }
    if (sets.length) {
      params.push(req.params.id);
      db.prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    return res.status(200).json({
      ...updated,
      items: typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/invoices/:id/resend
router.post('/:id/resend', async (req: Request, res: Response) => {
  try {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const emailRes = await sendCustomerInvoiceEmail({
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
    });

    // Update status to SENT after successful email dispatch
    if (emailRes?.success !== false) {
      db.prepare("UPDATE invoices SET status = 'SENT' WHERE id = ?").run(req.params.id);
    }

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    return res.status(200).json({ success: true, emailResult: emailRes, invoice: updated });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// PATCH /api/invoices/:id/status (Update invoice status, e.g. mark as PAID)
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'SENT', 'PAID', 'OVERDUE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const result = db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Invoice not found' });
    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    return res.status(200).json({
      ...updated,
      items: typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/invoices/:id/download (Direct binary PDF download)
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const invoiceData = {
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
    };

    const { generateTaxInvoicePdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateTaxInvoicePdf(invoiceData);

    const safeInvNum = (invoiceData.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${safeInvNum}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Invoice Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/invoices/download (Direct binary PDF download with custom invoice body for unsaved preview)
router.post('/download', async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;
    const { generateTaxInvoicePdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateTaxInvoicePdf(invoiceData);

    const safeInvNum = (invoiceData.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${safeInvNum}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Custom Invoice Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Invoice not found' });
    return res.status(200).json({ deleted: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
