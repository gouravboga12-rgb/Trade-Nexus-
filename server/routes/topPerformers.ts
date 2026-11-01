import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/top-performers - Accessible to all authenticated employees
router.get('/', (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    let query = 'SELECT * FROM top_performers WHERE isActive = 1';
    const params: any[] = [];

    if (month) {
      query += ' AND monthYear = ?';
      params.push(month);
    }

    query += ' ORDER BY rank ASC, createdAt DESC';
    const rows = db.prepare(query).all(...params) as any[];

    const performers = rows.map((r) => ({
      ...r,
      rank: Number(r.rank),
      salesAmount: Number(r.salesAmount || 0),
      leadsClosedCount: Number(r.leadsClosedCount || 0),
      isActive: Boolean(r.isActive === 1 || r.isActive === true),
    }));

    return res.status(200).json(performers);
  } catch (error) {
    console.error('[TopPerformers Route] GET error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/top-performers - Admin Only: Create or Update Top Performer
router.post('/', (req: Request, res: Response) => {
  try {
    const userRole = ((req as any).user?.role || '').toLowerCase();
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can add or update top performers.' });
    }

    const {
      id,
      monthYear,
      rank,
      employeeId,
      employeeName,
      designation,
      salesAmount,
      leadsClosedCount,
      photoUrl,
      badgeNote,
      isActive = 1,
    } = req.body;

    if (!rank || !employeeName || !designation) {
      return res.status(400).json({ error: 'Rank, employee name, and designation are required.' });
    }

    const numericRank = Math.max(1, Math.floor(Number(rank) || 1));
    const finalMonth = (monthYear || '').trim() || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const targetId = id || `performer-${Date.now()}-${numericRank}`;

    // Check if performer exists with this id or with this (monthYear, rank)
    const existing = db.prepare('SELECT id FROM top_performers WHERE id = ? OR (monthYear = ? AND rank = ?)').get(targetId, finalMonth, numericRank) as any;

    const actualId = existing?.id || targetId;

    if (existing) {
      db.prepare(`
        UPDATE top_performers
        SET monthYear = ?,
            rank = ?,
            employeeId = ?,
            employeeName = ?,
            designation = ?,
            salesAmount = ?,
            leadsClosedCount = ?,
            photoUrl = ?,
            badgeNote = ?,
            isActive = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        finalMonth,
        numericRank,
        employeeId || null,
        employeeName.trim(),
        designation.trim(),
        Number(salesAmount || 0),
        Number(leadsClosedCount || 0),
        photoUrl || null,
        badgeNote || null,
        isActive ? 1 : 0,
        actualId
      );
    } else {
      db.prepare(`
        INSERT INTO top_performers (
          id, monthYear, rank, employeeId, employeeName, designation,
          salesAmount, leadsClosedCount, photoUrl, badgeNote, isActive
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        actualId,
        finalMonth,
        numericRank,
        employeeId || null,
        employeeName.trim(),
        designation.trim(),
        Number(salesAmount || 0),
        Number(leadsClosedCount || 0),
        photoUrl || null,
        badgeNote || null,
        isActive ? 1 : 0
      );
    }

    const saved = db.prepare('SELECT * FROM top_performers WHERE id = ?').get(actualId) as any;
    return res.status(200).json({
      ...saved,
      rank: Number(saved.rank),
      salesAmount: Number(saved.salesAmount || 0),
      leadsClosedCount: Number(saved.leadsClosedCount || 0),
      isActive: Boolean(saved.isActive === 1),
    });
  } catch (error) {
    console.error('[TopPerformers Route] POST error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/top-performers/:id - Admin Only: Delete Performer
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userRole = ((req as any).user?.role || '').toLowerCase();
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete top performers.' });
    }

    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM top_performers WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Performer record not found.' });
    }

    db.prepare('DELETE FROM top_performers WHERE id = ?').run(id);
    return res.status(200).json({ success: true, message: 'Performer removed successfully.' });
  } catch (error) {
    console.error('[TopPerformers Route] DELETE error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

