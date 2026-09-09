import { api } from '../services/api';

const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return "0m";
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = Math.round(totalMinutes % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
};

export const formatTargetValue = (item, kpi) => {
  if (item?.target_value === null || item?.target_value === undefined) return "—";
  const isDuration = kpi ? ((kpi.category === "Timeliness" || kpi.category === "Efficiency") && kpi.unit !== "/ 5") : false;
  if (isDuration) {
    return formatDuration(item.target_value);
  }
  if (kpi?.unit === "/ 5") {
    return `${parseFloat(item.target_value)} / 5`;
  }
  if (kpi?.unit === "%" || kpi?.category === "Quality") {
    return `${parseFloat(item.target_value)}%`;
  }
  return String(parseFloat(item.target_value));
};

const resolveEnrichedItems = (commitment, services = [], kpis = []) => {
  const items = commitment?.items || [];
  return items.map((item, idx) => {
    const svc = services.find(s => String(s.id) === String(item.service_id));
    const kpi = kpis.find(k => String(k.id) === String(item.kpi_id));
    const targetStr = formatTargetValue(item, kpi);

    return {
      index: idx + 1,
      service_name: svc?.name || item.service_name || "Unknown Service",
      classification: svc?.classification || item.classification || "Simple",
      kpi_name: kpi?.name || item.kpi_name || "Unknown KPI",
      kpi_category: kpi?.category || item.kpi_category || "—",
      target_value: targetStr,
      unit: item.unit || kpi?.unit || "—"
    };
  });
};

/**
 * Trigger backend audit log for commitment export (AC5)
 */
const logExportAudit = async (commitmentId, format) => {
  try {
    const res = await api.exportCommitment(commitmentId);
    return res;
  } catch (err) {
    console.warn("Backend exportCommitment audit hook warning:", err);
    try {
      await api.logAuditEvent({
        event_type: 'COMMITMENT_EXPORTED',
        resource_id: commitmentId,
        details: { format }
      });
    } catch (_) {}
    return null;
  }
};

/**
 * Export commitment as CSV with flat structure (AC1, AC4, AC5)
 */
export const exportCommitmentAsCsv = async ({
  commitment,
  services = [],
  kpis = [],
  periodName = "Period"
}) => {
  if (!commitment) return;

  // AC5: log export in audit trail
  const exportRes = await logExportAudit(commitment.id, 'CSV');

  const targetCommitment = {
    ...commitment,
    ...(exportRes?.meta || {}),
    items: (commitment.items && commitment.items.length > 0)
      ? commitment.items
      : (exportRes?.items || commitment.items || [])
  };

  const enrichedItems = resolveEnrichedItems(targetCommitment, services, kpis);
  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  // AC4: Flat structure
  const headers = [
    "Index",
    "Service Name",
    "Classification",
    "KPI Name",
    "KPI Category",
    "Target Value",
    "Unit"
  ];

  const rows = enrichedItems.map(item => [
    escapeCsv(item.index),
    escapeCsv(item.service_name),
    escapeCsv(item.classification),
    escapeCsv(item.kpi_name),
    escapeCsv(item.kpi_category),
    escapeCsv(item.target_value),
    escapeCsv(item.unit)
  ]);

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map(r => r.join(","))
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanPeriod = (periodName || "period").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `commitment_${cleanPeriod}_v${targetCommitment.version_number || 1}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export commitment as PDF via printable HTML with DRAFT watermark for drafts (AC1, AC2, AC3, AC5)
 */
export const exportCommitmentAsPdf = async ({
  commitment,
  services = [],
  kpis = [],
  periodName = "Period"
}) => {
  if (!commitment) return;

  // AC5: log export in audit trail
  const exportRes = await logExportAudit(commitment.id, 'PDF');

  const targetCommitment = {
    ...commitment,
    ...(exportRes?.meta || {}),
    items: (commitment.items && commitment.items.length > 0)
      ? commitment.items
      : (exportRes?.items || commitment.items || [])
  };

  const enrichedItems = resolveEnrichedItems(targetCommitment, services, kpis);
  const isDraft = targetCommitment.status === "Draft" || Boolean(targetCommitment.is_draft);
  const versionNum = targetCommitment.version_number || 1;
  const statusLabel = isDraft && versionNum > 1 ? "Draft (Revision)" : targetCommitment.status;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OPCR Commitment - ${periodName} (V${versionNum})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 20mm 15mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      margin: 0;
      padding: 24px;
      color: #1e293b;
      background: #ffffff;
      font-size: 11pt;
      position: relative;
    }

    /* AC3: DRAFT Watermark on print HTML */
    .draft-watermark {
      display: ${isDraft ? 'block' : 'none'};
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 5.5rem;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.12);
      border: 6px dashed rgba(220, 38, 38, 0.18);
      padding: 10px 40px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      pointer-events: none;
      z-index: 9999;
      user-select: none;
      white-space: nowrap;
    }

    .header-bar {
      border-bottom: 3px solid #580000;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .inst-title {
      font-size: 15pt;
      font-weight: 800;
      color: #580000;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }
    .report-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 9pt;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-locked {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-draft {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px 18px;
      font-size: 9.5pt;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .meta-val {
      font-weight: 600;
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 9pt;
    }
    thead tr {
      background-color: #580000;
      color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    th {
      padding: 8px 10px;
      text-align: left;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid #580000;
    }
    th.text-right {
      text-align: right;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .classif-chip {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    .signatures {
      margin-top: 40px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      page-break-inside: avoid;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sig-line {
      width: 80%;
      border-bottom: 1px solid #334155;
      margin-bottom: 6px;
      height: 35px;
    }
    .sig-name {
      font-weight: 700;
      font-size: 8.5pt;
    }
    .sig-role {
      font-size: 7.5pt;
      color: #64748b;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .draft-watermark {
        color: rgba(220, 38, 38, 0.15) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  ${isDraft ? '<div class="draft-watermark">DRAFT — NOT FINAL</div>' : ''}

  <div class="no-print" style="margin-bottom: 16px; padding: 10px 14px; background: #f1f5f9; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 9pt; color: #475569; font-weight: 600;">Print preview loaded. Choose "Save as PDF" in the print dialog.</span>
    <div>
      <button onclick="window.print()" style="padding: 6px 14px; background: #580000; color: #fff; border: none; border-radius: 4px; font-weight: 700; cursor: pointer; margin-right: 8px;">Print / Save as PDF</button>
      <button onclick="window.close()" style="padding: 6px 12px; background: #e2e8f0; color: #334155; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">Close</button>
    </div>
  </div>

  <div class="header-bar">
    <div>
      <h1 class="inst-title">Polytechnic University of the Philippines</h1>
      <h2 class="report-title">Office Performance Commitment and Review (OPCR) Report</h2>
    </div>
    <div>
      <span class="badge ${isDraft ? 'badge-draft' : 'badge-locked'}">
        ${statusLabel}
      </span>
    </div>
  </div>

  <div class="meta-card">
    <div class="meta-item">
      <span class="meta-label">Evaluation Period</span>
      <span class="meta-val">${periodName}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Office / Responsible Unit</span>
      <span class="meta-val">${targetCommitment.office || 'Campus Office'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Version</span>
      <span class="meta-val">Version ${versionNum} (${statusLabel})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Submitted / Recorded By</span>
      <span class="meta-val">${targetCommitment.submitted_by || targetCommitment.created_by || 'system'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Submission Date</span>
      <span class="meta-val">${targetCommitment.submitted_at ? new Date(targetCommitment.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : 'Pending Submission'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Export Timestamp</span>
      <span class="meta-val">${new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>Service Charter</th>
        <th style="width: 110px;">Classification</th>
        <th>KPI Indicator</th>
        <th style="width: 110px;">Category</th>
        <th style="width: 130px; text-align: right;">Target Value</th>
      </tr>
    </thead>
    <tbody>
      ${enrichedItems.length > 0 ? enrichedItems.map(item => `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #580000;">${item.index}</td>
          <td style="font-weight: 600;">${item.service_name}</td>
          <td><span class="classif-chip">${item.classification}</span></td>
          <td style="color: #334155;">${item.kpi_name}</td>
          <td style="color: #475569; font-weight: 500;">${item.kpi_category}</td>
          <td style="text-align: right; font-weight: 700; color: #580000;">${item.target_value}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">No commitment items defined.</td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <span class="sig-name">Office Head / Evaluator</span>
      <span class="sig-role">Prepared By</span>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <span class="sig-name">Planning & Standards Officer</span>
      <span class="sig-role">Reviewed By</span>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <span class="sig-name">Campus Director</span>
      <span class="sig-role">Approved By</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Popup was blocked: fallback to hidden iframe print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 2000);
    }, 500);
  }
};
