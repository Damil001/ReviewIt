import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Project from '../models/Project.js';
import Review from '../models/Review.js';
import puppeteer from 'puppeteer';

const router = express.Router();

// Export project reviews as PDF
router.get('/:projectId/pdf', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      $or: [
        { owner: req.userId },
        { collaborators: req.userId },
      ],
    })
      .populate('owner', 'name email')
      .populate('collaborators', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const reviews = await Review.find({ project: req.params.projectId })
      .populate('createdBy', 'name email')
      .populate('comments.user', 'name email')
      .sort({ createdAt: -1 });

    // Generate HTML for PDF
    const html = generatePDFHTML(project, reviews);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });
    await browser.close();

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="review-report-${project.name}-${Date.now()}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

function generatePDFHTML(project, reviews) {
  const breakpointNames = ['Mobile', 'Tablet', 'Laptop', 'Desktop'];
  
  const reviewsByBreakpoint = reviews.reduce((acc, review) => {
    const bpName = breakpointNames[review.breakpointIndex] || `Breakpoint ${review.breakpointIndex}`;
    if (!acc[bpName]) acc[bpName] = [];
    acc[bpName].push(review);
    return acc;
  }, {});

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 20px;
        }
        .header {
          border-bottom: 3px solid #4C6EF5;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1a1a1a;
          font-size: 28px;
          margin-bottom: 10px;
        }
        .header .meta {
          color: #666;
          font-size: 14px;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #4C6EF5;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .review-item {
          background: #f9fafb;
          border-left: 4px solid #4C6EF5;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 4px;
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 10px;
        }
        .review-type {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .review-type.point {
          background: #dbeafe;
          color: #1e40af;
        }
        .review-type.area {
          background: #d1fae5;
          color: #065f46;
        }
        .review-type.drawing {
          background: #fce7f3;
          color: #9f1239;
        }
        .review-meta {
          font-size: 12px;
          color: #666;
        }
        .review-position {
          font-size: 12px;
          color: #888;
          margin-top: 5px;
        }
        .review-comments {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }
        .comment {
          background: white;
          padding: 10px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 2px solid #e5e7eb;
        }
        .comment-author {
          font-weight: 600;
          font-size: 13px;
          color: #1a1a1a;
          margin-bottom: 5px;
        }
        .comment-text {
          font-size: 13px;
          color: #555;
        }
        .comment-date {
          font-size: 11px;
          color: #999;
          margin-top: 5px;
        }
        .resolved {
          opacity: 0.6;
        }
        .resolved-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #10b981;
          color: white;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #4C6EF5;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        @media print {
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(project.name)}</h1>
        <div class="meta">
          <strong>URL:</strong> ${escapeHtml(project.url)}<br>
          <strong>Owner:</strong> ${project.owner?.name || 'Unknown'}<br>
          <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
          ${project.collaborators?.length > 0 ? `<strong>Collaborators:</strong> ${project.collaborators.map(c => c.name).join(', ')}<br>` : ''}
        </div>
      </div>

      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${reviews.length}</div>
          <div class="stat-label">Total Reviews</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reviews.filter(r => r.resolved).length}</div>
          <div class="stat-label">Resolved</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reviews.filter(r => !r.resolved).length}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>

      ${Object.entries(reviewsByBreakpoint).map(([breakpoint, breakpointReviews]) => `
        <div class="section">
          <div class="section-title">${breakpoint} (${breakpointReviews.length} reviews)</div>
          ${breakpointReviews.map(review => `
            <div class="review-item ${review.resolved ? 'resolved' : ''}">
              <div class="review-header">
                <div>
                  <span class="review-type ${review.type}">${review.type}</span>
                  ${review.resolved ? '<span class="resolved-badge">Resolved</span>' : ''}
                </div>
                <div class="review-meta">
                  By ${review.createdBy?.name || 'Unknown'} • ${new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
              ${review.position ? `
                <div class="review-position">
                  Position: (${Math.round(review.position.x)}, ${Math.round(review.position.y)})
                  ${review.position.width ? ` • Size: ${Math.round(review.position.width)} × ${Math.round(review.position.height)}` : ''}
                </div>
              ` : ''}
              ${review.comments && review.comments.length > 0 ? `
                <div class="review-comments">
                  <strong>Comments (${review.comments.length}):</strong>
                  ${review.comments.map(comment => `
                    <div class="comment">
                      <div class="comment-author">${escapeHtml(comment.user?.name || 'Unknown')}</div>
                      <div class="comment-text">${escapeHtml(comment.text)}</div>
                      <div class="comment-date">${new Date(comment.createdAt).toLocaleString()}</div>
                    </div>
                  `).join('')}
                </div>
              ` : '<div class="review-comments"><em>No comments yet</em></div>'}
            </div>
          `).join('')}
        </div>
      `).join('')}

      ${reviews.length === 0 ? '<div class="section"><p>No reviews yet for this project.</p></div>' : ''}
    </body>
    </html>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

export default router;

