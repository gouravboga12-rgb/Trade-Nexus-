import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

/**
 * Individual employee documents — ID proofs, certificates, contracts (scope §11).
 * Files are held as data URLs alongside the record, which keeps the whole system
 * in one SQLite file with no separate storage to configure.
 */

// GET /api/employee-documents?employeeId=...
// The file content is deliberately left out of the list so a long list stays light.
router.get('/', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;
    const sql = `
      SELECT id, employeeId, title, category, fileName, mimeType, sizeBytes, uploadedBy, uploadedAt
      FROM employee_documents
      ${employeeId ? 'WHERE employeeId = ?' : ''}
      ORDER BY uploadedAt DESC
    `;
    const rows = employeeId
      ? db.prepare(sql).all(employeeId)
      : db.prepare(sql).all();
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/employee-documents/:id — the full document, including its content
router.get('/:id', (req: Request, res: Response) => {
  try {
    const doc = db.prepare('SELECT * FROM employee_documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    return res.status(200).json(doc);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents
router.post('/', (req: Request, res: Response) => {
  try {
    const { employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy } = req.body;

    if (!employeeId || !fileName || !content) {
      return res.status(400).json({ error: 'employeeId, fileName and content are required' });
    }

    // Roughly 8 MB of base64, which is about 6 MB of actual file
    if (typeof content === 'string' && content.length > 8_000_000) {
      return res.status(413).json({ error: 'That file is too large. Please keep documents under 5 MB.' });
    }

    const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO employee_documents
        (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, employeeId, title || fileName, category || 'Other', fileName,
      mimeType || null, sizeBytes || null, content, uploadedBy || 'Admin'
    );

    const { content: _omit, ...saved } = db
      .prepare('SELECT * FROM employee_documents WHERE id = ?')
      .get(id) as any;
    return res.status(201).json(saved);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/employee-documents/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM employee_documents WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Document not found' });
    return res.status(200).json({ deleted: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/send-onboarding-email
router.post('/send-onboarding-email', async (req: Request, res: Response) => {
  try {
    const { employee, offerLetter } = req.body;
    if (!employee || !employee.email) {
      return res.status(400).json({ error: 'Employee with email is required' });
    }
    const { sendEmployeeOnboardingEmail } = await import('../services/emailService.js');
    const result = await sendEmployeeOnboardingEmail(employee, offerLetter);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/send-relieving-email
router.post('/send-relieving-email', async (req: Request, res: Response) => {
  try {
    const { employee, relievingLetter } = req.body;
    if (!employee || !employee.email || !relievingLetter) {
      return res.status(400).json({ error: 'Employee with email and relieving letter data are required' });
    }
    const { sendEmployeeRelievingLetterEmail } = await import('../services/emailService.js');
    const result = await sendEmployeeRelievingLetterEmail(employee, relievingLetter);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/send-experience-email
router.post('/send-experience-email', async (req: Request, res: Response) => {
  try {
    const { employee, cert } = req.body;
    if (!employee || !employee.email || !cert) {
      return res.status(400).json({ error: 'Employee with email and experience cert data are required' });
    }
    const { sendEmployeeExperienceCertEmail } = await import('../services/emailService.js');
    const result = await sendEmployeeExperienceCertEmail(employee, cert);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/send-id-card-email
router.post('/send-id-card-email', async (req: Request, res: Response) => {
  try {
    const { employee, cardData } = req.body;
    const targetEmail = employee?.email || cardData?.email;
    if (!targetEmail) {
      return res.status(400).json({ error: 'Employee email address is required' });
    }
    const { sendEmployeeIdCardEmail } = await import('../services/emailService.js');
    const result = await sendEmployeeIdCardEmail(employee || {}, cardData);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF Binary Direct Download Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/employee-documents/download/offer-letter
router.post('/download/offer-letter', async (req: Request, res: Response) => {
  try {
    const { offerLetter, data } = req.body;
    const payload = offerLetter || data || req.body;
    const { generateOfferLetterPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateOfferLetterPdf(payload);

    const safeName = (payload.candidateName || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Job_Offer_Letter_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Offer Letter Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/download/experience-cert
router.post('/download/experience-cert', async (req: Request, res: Response) => {
  try {
    const { employee, cert } = req.body;
    const certPayload = cert || req.body;
    const empPayload = employee || {};
    const { generateExperienceCertPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateExperienceCertPdf(empPayload, certPayload);

    const safeName = (certPayload.employeeName || empPayload.name || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Experience_Certificate_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Experience Cert Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/download/relieving-letter
router.post('/download/relieving-letter', async (req: Request, res: Response) => {
  try {
    const { employee, relievingLetter } = req.body;
    const relPayload = relievingLetter || req.body;
    const empPayload = employee || {};
    const { generateRelievingLetterPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateRelievingLetterPdf(empPayload, relPayload);

    const safeName = (relPayload.employeeName || empPayload.name || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Relieving_Letter_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download Relieving Letter Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/download/id-card
router.post('/download/id-card', async (req: Request, res: Response) => {
  try {
    const { employee, cardData } = req.body;
    const cardPayload = cardData || req.body;
    const empPayload = employee || {};
    const { generateIdCardPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateIdCardPdf(empPayload, cardPayload);

    const safeName = (cardPayload.name || empPayload.name || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Digital_ID_Card_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.end(pdfBuf);
  } catch (error) {
    console.error('[Download ID Card Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
