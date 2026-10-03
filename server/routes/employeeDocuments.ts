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

    // Save Offer Letter to employee_documents if employee ID exists
    try {
      const emp = db.prepare('SELECT id FROM team_members WHERE id = ? OR email = ? LIMIT 1').get(employee.id || '', employee.email) as any;
      const targetEmpId = emp?.id || employee.id;
      if (targetEmpId) {
        const { generateOfferLetterPdf } = await import('../services/pdfGenerator.js');
        const offerPayload = {
          candidateName: employee.name,
          candidateEmail: employee.email,
          candidatePhone: employee.phone,
          candidateAddress: employee.address || offerLetter?.candidateAddress,
          roleTitle: employee.roleTitle || employee.role || offerLetter?.roleTitle,
          annualCtc: offerLetter?.annualCtc,
          monthlyGross: offerLetter?.monthlyGross,
          joiningDate: offerLetter?.joiningDate || employee.joiningDate,
          reportingManager: offerLetter?.reportingManager,
          acceptanceDeadline: offerLetter?.acceptanceDeadline,
          signatoryName: offerLetter?.signatoryName,
          signatoryRole: offerLetter?.signatoryRole,
          issuedDate: offerLetter?.issuedDate,
        };
        const pdfBuf = await generateOfferLetterPdf(offerPayload);
        const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;
        const safeName = (employee.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `Official_Offer_Letter_${safeName}.pdf`;

        const existingDoc = db.prepare(`
          SELECT id FROM employee_documents WHERE employeeId = ? AND category = 'Offer Letter' LIMIT 1
        `).get(targetEmpId) as any;

        if (existingDoc) {
          db.prepare(`
            UPDATE employee_documents 
            SET title = 'Official Job Offer Letter', fileName = ?, sizeBytes = ?, content = ?, uploadedAt = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(fileName, pdfBuf.length, base64Data, existingDoc.id);
        } else {
          db.prepare(`
            INSERT INTO employee_documents
              (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
            VALUES (?, ?, 'Official Job Offer Letter', 'Offer Letter', ?, 'application/pdf', ?, ?, 'HR System')
          `).run(`doc-offer-${Date.now()}`, targetEmpId, fileName, pdfBuf.length, base64Data);
        }
      }
    } catch (saveErr) {
      console.warn('[Save Offer Doc Warning]', saveErr);
    }

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

// GET /api/employee-documents/experience-cert/:employeeId
// Returns the stored experience cert document record (metadata only) for a specific employee.
router.get('/experience-cert/:employeeId', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const doc = db.prepare(`
      SELECT id, employeeId, title, category, fileName, mimeType, sizeBytes, uploadedBy, uploadedAt
      FROM employee_documents
      WHERE employeeId = ? AND category = 'Experience Certificate'
      ORDER BY uploadedAt DESC
      LIMIT 1
    `).get(employeeId) as any;
    if (!doc) return res.status(404).json({ exists: false });
    return res.status(200).json({ exists: true, document: doc });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/generate/experience-cert
// Full lifecycle: generate PDF → save to employee_documents → send email → return record
router.post('/generate/experience-cert', async (req: Request, res: Response) => {
  try {
    const { employeeId, certData, uploadedBy, sendEmail } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    // Resolve employee
    const emp = db.prepare('SELECT * FROM team_members WHERE id = ? OR empCode = ? LIMIT 1').get(employeeId, employeeId) as any;
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Enforce: Admins cannot receive experience letters
    if (emp.portal === 'admin' || emp.role === 'admin') {
      return res.status(403).json({ error: 'Experience letters cannot be generated for admin accounts' });
    }

    const actualEmpId = emp.id;

    // Build cert payload — merge employee data with HR-provided overrides
    const payload = {
      employeeId: actualEmpId,
      employeeName: certData?.employeeName  || emp.name          || 'Staff Member',
      empCode:      certData?.empCode       || emp.empCode       || 'TNX-001',
      guardianName: certData?.guardianName  || '',
      designation:  certData?.designation   || emp.role          || 'Executive',
      department:   certData?.department    || emp.group         || 'Operations',
      startDate:    certData?.startDate     || emp.joiningDate   || '',
      endDate:      certData?.endDate       || '',
      refNumber:    certData?.refNumber     || `TNX/EXP/${new Date().getFullYear()}/${emp.empCode || '001'}`,
      issuedDate:   certData?.issuedDate    || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      companyName:  certData?.companyName   || 'Trade Nexus',
      introParagraph:   certData?.introParagraph   || null,
      roleParagraph:    certData?.roleParagraph    || null,
      conductRemarks:   certData?.conductRemarks   || null,
      closingParagraph: certData?.closingParagraph || null,
      signatoryName:    certData?.signatoryName    || 'T. Vidhya Sagar',
      signatoryRole:    certData?.signatoryRole    || 'Chief Executive Officer',
    };

    // Generate ONE PDF
    const { generateExperienceCertPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateExperienceCertPdf(emp, payload);
    const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;

    const safeName = (payload.employeeName).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Official_Experience_Certificate_${safeName}.pdf`;

    // Upsert into employee_documents
    const existingDoc = db.prepare(`
      SELECT id FROM employee_documents
      WHERE employeeId = ? AND category = 'Experience Certificate'
      LIMIT 1
    `).get(actualEmpId) as any;

    let docId = existingDoc?.id;
    const now = new Date().toISOString();

    if (existingDoc) {
      db.prepare(`
        UPDATE employee_documents
        SET title = ?, fileName = ?, sizeBytes = ?, content = ?, uploadedBy = ?, uploadedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(`Official Experience Certificate - ${payload.employeeName}`, fileName, pdfBuf.length, base64Data, uploadedBy || 'HR Admin', existingDoc.id);
    } else {
      docId = `doc-expcert-${Date.now()}`;
      db.prepare(`
        INSERT INTO employee_documents
          (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
        VALUES (?, ?, ?, 'Experience Certificate', ?, 'application/pdf', ?, ?, ?)
      `).run(
        docId,
        actualEmpId,
        `Official Experience Certificate - ${payload.employeeName}`,
        fileName,
        pdfBuf.length,
        base64Data,
        uploadedBy || 'HR Admin'
      );
    }

    // Email the SAME PDF buffer to the employee
    let emailResult: any = { skipped: true };
    const targetEmail = emp.email?.trim();
    if (sendEmail !== false && targetEmail) {
      try {
        const { sendEmployeeExperienceCertEmail } = await import('../services/emailService.js');
        emailResult = await sendEmployeeExperienceCertEmail(
          { ...emp, name: payload.employeeName, email: targetEmail },
          payload,
          pdfBuf
        );
      } catch (emailErr) {
        console.warn('[Experience Cert Email Warning]', emailErr);
        emailResult = { success: false, error: (emailErr as Error).message };
      }
    }

    // Upsert into experience_certificates table for canonical registry
    const expCertId = `exp-${actualEmpId}`;
    const existingExpCert = db.prepare('SELECT id FROM experience_certificates WHERE employeeId = ? LIMIT 1').get(actualEmpId) as any;
    if (existingExpCert) {
      db.prepare(`
        UPDATE experience_certificates
        SET employeeName = ?, empCode = ?, guardianName = ?, designation = ?, department = ?,
            startDate = ?, endDate = ?, refNumber = ?, issuedDate = ?, companyName = ?,
            introParagraph = ?, roleParagraph = ?, conductRemarks = ?, closingParagraph = ?,
            signatoryName = ?, signatoryRole = ?, documentId = ?, dispatchedAt = ?, emailedAt = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        payload.employeeName, payload.empCode, payload.guardianName, payload.designation, payload.department,
        payload.startDate, payload.endDate, payload.refNumber, payload.issuedDate, payload.companyName,
        payload.introParagraph, payload.roleParagraph, payload.conductRemarks, payload.closingParagraph,
        payload.signatoryName, payload.signatoryRole, docId, now, emailResult.success ? now : null,
        existingExpCert.id
      );
    } else {
      db.prepare(`
        INSERT INTO experience_certificates (
          id, employeeId, employeeName, empCode, guardianName, designation, department,
          startDate, endDate, refNumber, issuedDate, companyName,
          introParagraph, roleParagraph, conductRemarks, closingParagraph,
          signatoryName, signatoryRole, documentId, dispatchedAt, emailedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expCertId, actualEmpId, payload.employeeName, payload.empCode, payload.guardianName, payload.designation, payload.department,
        payload.startDate, payload.endDate, payload.refNumber, payload.issuedDate, payload.companyName,
        payload.introParagraph, payload.roleParagraph, payload.conductRemarks, payload.closingParagraph,
        payload.signatoryName, payload.signatoryRole, docId, now, emailResult.success ? now : null
      );
    }

    return res.status(200).json({
      success: true,
      documentId: docId,
      fileName,
      sizeBytes: pdfBuf.length,
      content: base64Data,
      certData: { ...payload, documentId: docId, dispatchedAt: now, emailedAt: emailResult.success ? now : null },
      emailResult,
      message: 'Experience Certificate generated and saved successfully.',
    });
  } catch (error) {
    console.error('[Generate Experience Cert Error]', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});



// POST /api/employee-documents/generate/id-card
router.post('/generate/id-card', async (req: Request, res: Response) => {
  try {
    const { employeeId, cardData, uploadedBy } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    // Lookup employee from team_members
    const emp = db.prepare('SELECT * FROM team_members WHERE id = ? OR empCode = ? LIMIT 1').get(employeeId, employeeId) as any || {};
    const actualEmpId = emp.id || employeeId;

    const payload = cardData || {};
    const { generateIdCardPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateIdCardPdf(emp, payload);
    const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;

    const safeName = (payload.name || emp.name || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Official_ID_Card_${safeName}.pdf`;

    // Check if ID Card already exists in employee_documents
    const existingDoc = db.prepare(`
      SELECT id FROM employee_documents 
      WHERE employeeId = ? AND category = 'ID Card'
      LIMIT 1
    `).get(actualEmpId) as any;

    let docId = existingDoc?.id;
    if (existingDoc) {
      db.prepare(`
        UPDATE employee_documents 
        SET title = 'Official Digital ID Card', fileName = ?, sizeBytes = ?, content = ?, uploadedBy = ?, uploadedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(fileName, pdfBuf.length, base64Data, uploadedBy || 'HR Admin', existingDoc.id);
    } else {
      docId = `doc-idcard-${Date.now()}`;
      db.prepare(`
        INSERT INTO employee_documents
          (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
        VALUES (?, ?, 'Official Digital ID Card', 'ID Card', ?, 'application/pdf', ?, ?, ?)
      `).run(docId, actualEmpId, fileName, pdfBuf.length, base64Data, uploadedBy || 'HR Admin');
    }

    // Update team_members record with updated fields if provided
    if (payload) {
      try {
        db.prepare(`
          UPDATE team_members
          SET avatar = COALESCE(?, avatar),
              bloodGroup = COALESCE(?, bloodGroup),
              dob = COALESCE(?, dob),
              phone = COALESCE(?, phone),
              emergencyPhone = COALESCE(?, emergencyPhone),
              companyAddress = COALESCE(?, companyAddress),
              companyEmail = COALESCE(?, companyEmail),
              companyWebsite = COALESCE(?, companyWebsite),
              companyPhone = COALESCE(?, companyPhone),
              signatoryName = COALESCE(?, signatoryName),
              signatoryRole = COALESCE(?, signatoryRole)
          WHERE id = ? OR empCode = ?
        `).run(
          payload.avatar || null,
          payload.bloodGroup || null,
          payload.dob || null,
          payload.phone || null,
          payload.phone || null,
          payload.address || null,
          payload.email || null,
          payload.website || null,
          payload.companyPhone || null,
          payload.signatoryName || null,
          payload.signatoryRole || null,
          actualEmpId, actualEmpId
        );
        db.prepare('UPDATE employee_profiles SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? OR empCode = ?').run(actualEmpId, emp.empCode || '');
      } catch (uErr) {
        console.warn('[Sync ID Card Fields Warning]', uErr);
      }
    }

    return res.status(200).json({
      success: true,
      documentId: docId,
      fileName,
      sizeBytes: pdfBuf.length,
      content: base64Data,
      message: 'Official ID Card generated and saved successfully.',
    });
  } catch (error) {
    console.error('[Generate ID Card Error]', error);
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

    // Generate canonical PDF
    const { generateIdCardPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateIdCardPdf(employee || {}, cardData);
    const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;

    // Ensure it is saved to employee_documents table
    const empId = employee?.id || cardData?.employeeId || cardData?.empCode;
    if (empId) {
      const existingDoc = db.prepare(`
        SELECT id FROM employee_documents WHERE employeeId = ? AND category = 'ID Card' LIMIT 1
      `).get(empId) as any;

      const safeName = (cardData?.name || employee?.name || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Official_ID_Card_${safeName}.pdf`;

      if (existingDoc) {
        db.prepare(`
          UPDATE employee_documents 
          SET title = 'Official Digital ID Card', fileName = ?, sizeBytes = ?, content = ?, uploadedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fileName, pdfBuf.length, base64Data, existingDoc.id);
      } else {
        const docId = `doc-idcard-${Date.now()}`;
        db.prepare(`
          INSERT INTO employee_documents
            (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
          VALUES (?, ?, 'Official Digital ID Card', 'ID Card', ?, 'application/pdf', ?, ?, 'HR System')
        `).run(docId, empId, fileName, pdfBuf.length, base64Data);
      }
    }

    const { sendEmployeeIdCardEmail } = await import('../services/emailService.js');
    const result = await sendEmployeeIdCardEmail(employee || {}, cardData);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/employee-documents/generate/offer-letter
router.post('/generate/offer-letter', async (req: Request, res: Response) => {
  try {
    const { employeeId, offerLetter, uploadedBy } = req.body;

    // Lookup employee from team_members if employeeId or candidate email is provided
    let emp: any = null;
    if (employeeId) {
      emp = db.prepare('SELECT * FROM team_members WHERE id = ? OR empCode = ? LIMIT 1').get(employeeId, employeeId);
    }
    if (!emp && offerLetter?.candidateEmail) {
      emp = db.prepare('SELECT * FROM team_members WHERE email = ? LIMIT 1').get(offerLetter.candidateEmail);
    }
    if (!emp && offerLetter?.candidateName) {
      emp = db.prepare('SELECT * FROM team_members WHERE name = ? LIMIT 1').get(offerLetter.candidateName);
    }

    const actualEmpId = emp?.id || employeeId || `cand-${Date.now()}`;
    const payload = {
      candidateName: offerLetter?.candidateName || emp?.name || 'Candidate',
      candidateEmail: offerLetter?.candidateEmail || emp?.email || '',
      candidatePhone: offerLetter?.candidatePhone || emp?.phone || '+91 98765 43210',
      candidateAddress: offerLetter?.candidateAddress || emp?.address || '123 Anywhere St., Any City, ST 12345',
      roleTitle: offerLetter?.roleTitle || emp?.role || 'Marketing Coordinator',
      department: offerLetter?.department || emp?.department || 'Operations',
      employeeType: offerLetter?.employeeType || 'Full Time',
      salaryType: offerLetter?.salaryType || 'Per Annum',
      annualCtc: offerLetter?.annualCtc ? Number(offerLetter.annualCtc) : (offerLetter?.monthlyGross ? Number(offerLetter.monthlyGross) * 12 : 8400000),
      monthlyGross: offerLetter?.monthlyGross ? Number(offerLetter.monthlyGross) : 700000,
      joiningDate: offerLetter?.joiningDate || emp?.joinDate || 'Immediate',
      reportingManager: offerLetter?.reportingManager || 'Rosa Maria (Marketing Manager)',
      acceptanceDeadline: offerLetter?.acceptanceDeadline || 'Within 7 business days',
      signatoryName: offerLetter?.signatoryName || 'T .Vidhya Sagar',
      signatoryRole: offerLetter?.signatoryRole || 'Chief executive Officer',
      location: offerLetter?.location || 'Bengaluru Corporate HQ',
      issuedDate: offerLetter?.issuedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      companyName: offerLetter?.companyName || 'TRADE NEXUS',
      companyAddress: offerLetter?.companyAddress || '456 Business Avenue, Financial District, Your City, 5005001',
      companyPhone: offerLetter?.companyPhone || '+91 98765 43210',
      companyEmail: offerLetter?.companyEmail || 'info@tradenexus.com',
      companyWebsite: offerLetter?.companyWebsite || 'www.tradenexus.com',
    };

    const { generateOfferLetterPdf } = await import('../services/pdfGenerator.js');
    const pdfBuf = await generateOfferLetterPdf(payload);
    const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;

    const safeName = (payload.candidateName || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Official_Offer_Letter_${safeName}.pdf`;

    // 1. Upsert into employee_documents table
    const existingDoc = db.prepare(`
      SELECT id FROM employee_documents 
      WHERE employeeId = ? AND category = 'Offer Letter'
      LIMIT 1
    `).get(actualEmpId) as any;

    let docId = existingDoc?.id;
    if (existingDoc) {
      db.prepare(`
        UPDATE employee_documents 
        SET title = 'Official Job Offer Letter', fileName = ?, sizeBytes = ?, content = ?, uploadedBy = ?, uploadedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(fileName, pdfBuf.length, base64Data, uploadedBy || 'HR Admin', existingDoc.id);
    } else {
      docId = `doc-offer-${Date.now()}`;
      db.prepare(`
        INSERT INTO employee_documents
          (id, employeeId, title, category, fileName, mimeType, sizeBytes, content, uploadedBy)
        VALUES (?, ?, 'Official Job Offer Letter', 'Offer Letter', ?, 'application/pdf', ?, ?, ?)
      `).run(docId, actualEmpId, fileName, pdfBuf.length, base64Data, uploadedBy || 'HR Admin');
    }

    // 2. Also upsert into offer_letters table to sync registry
    const existingLetter = db.prepare(`
      SELECT id FROM offer_letters 
      WHERE candidateEmail = ? OR candidateName = ?
      LIMIT 1
    `).get(payload.candidateEmail, payload.candidateName) as any;

    let offerId = offerLetter?.id || existingLetter?.id || `off-${Date.now()}`;
    if (existingLetter) {
      db.prepare(`
        UPDATE offer_letters
        SET candidateName = ?, candidateEmail = ?, candidatePhone = ?, candidateAddress = ?,
            roleTitle = ?, department = ?, employeeType = ?, salaryType = ?,
            annualCtc = ?, monthlyGross = ?, joiningDate = ?, acceptanceDeadline = ?,
            reportingManager = ?, signatoryName = ?, signatoryRole = ?,
            location = ?, issuedDate = ?,
            companyName = ?, companyAddress = ?, companyPhone = ?, companyEmail = ?, companyWebsite = ?
        WHERE id = ?
      `).run(
        payload.candidateName, payload.candidateEmail, payload.candidatePhone, payload.candidateAddress,
        payload.roleTitle, payload.department, payload.employeeType, payload.salaryType,
        payload.annualCtc, payload.monthlyGross, payload.joiningDate, payload.acceptanceDeadline,
        payload.reportingManager, payload.signatoryName, payload.signatoryRole,
        payload.location, payload.issuedDate,
        payload.companyName, payload.companyAddress, payload.companyPhone, payload.companyEmail, payload.companyWebsite,
        existingLetter.id
      );
      offerId = existingLetter.id;
    } else {
      db.prepare(`
        INSERT INTO offer_letters (
          id, candidateName, candidateEmail, candidatePhone, candidateAddress,
          roleTitle, department, employeeType, salaryType,
          annualCtc, monthlyGross, joiningDate, acceptanceDeadline,
          reportingManager, signatoryName, signatoryRole,
          location, issuedDate,
          companyName, companyAddress, companyPhone, companyEmail, companyWebsite
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        offerId,
        payload.candidateName, payload.candidateEmail, payload.candidatePhone, payload.candidateAddress,
        payload.roleTitle, payload.department, payload.employeeType, payload.salaryType,
        payload.annualCtc, payload.monthlyGross, payload.joiningDate, payload.acceptanceDeadline,
        payload.reportingManager, payload.signatoryName, payload.signatoryRole,
        payload.location, payload.issuedDate,
        payload.companyName, payload.companyAddress, payload.companyPhone, payload.companyEmail, payload.companyWebsite
      );
    }

    return res.status(200).json({
      success: true,
      documentId: docId,
      offerId,
      fileName,
      sizeBytes: pdfBuf.length,
      content: base64Data,
      offerLetter: { ...payload, id: offerId },
      message: 'Official Job Offer Letter generated and saved successfully.',
    });
  } catch (error) {
    console.error('[Generate Offer Letter Error]', error);
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
