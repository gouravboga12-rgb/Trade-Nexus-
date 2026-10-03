const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function testPdf() {
  const assetsDir = path.join(__dirname, '../server/assets');
  const framePath = path.join(assetsDir, 'id-card-template-frame.png');
  console.log('Frame exists:', fs.existsSync(framePath));

  const doc = new PDFDocument({
    size: [591, 1004],
    margins: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  const buffers = [];
  doc.on('data', b => buffers.push(b));
  doc.on('end', () => {
    const pdfBuf = Buffer.concat(buffers);
    fs.writeFileSync(path.join(__dirname, '../scratch/test_idcard_output.pdf'), pdfBuf);
    console.log('PDF written successfully, size bytes:', pdfBuf.length);
  });

  doc.image(framePath, 0, 0, { width: 591, height: 1004 });

  const cx = 295.5;
  const cy = 388;
  const r = 108;
  doc.circle(cx, cy, 116).lineWidth(7).strokeColor('#00C2CB').stroke();
  doc.circle(cx, cy, 110).lineWidth(2).strokeColor('#020E37').stroke();

  const defaultAvatarPath = path.join(assetsDir, 'default-id-avatar.png');
  if (fs.existsSync(defaultAvatarPath)) {
    doc.save();
    doc.circle(cx, cy, r).clip();
    doc.image(defaultAvatarPath, cx - r, cy - r, { width: r * 2, height: r * 2 });
    doc.restore();
  }

  doc.fontSize(25).font('Helvetica-Bold').fillColor('#FFFFFF').text('AVERY DAVIS', 0, 524, {
    align: 'center',
    width: 591,
    characterSpacing: 1.2
  });

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#00C2CB').text('DIGITAL MARKETING SPECIALIST', 0, 555, {
    align: 'center',
    width: 591,
    characterSpacing: 1.5
  });

  doc.rect(272, 576, 47, 3).fill('#00C2CB');

  const rows = [
    { label: 'Emp. ID', val: '001' },
    { label: 'Emp. Type', val: 'Full - Time' },
    { label: 'Blood Group', val: 'O+ ve' },
    { label: 'D.O.B.', val: '05/11/1997' },
    { label: 'Cell', val: '0000XXXX97' },
  ];

  let curY = 618;
  rows.forEach(row => {
    doc.fontSize(13.5).font('Helvetica').fillColor('#CBD5E1').text(row.label, 148, curY);
    doc.fontSize(13.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(':', 292, curY);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF').text(row.val, 328, curY);
    curY += 24;
  });

  doc.end();
}

testPdf();
