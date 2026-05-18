import { create } from 'zustand';
import { revenueHistory } from '../data/mockData';
import type { ReportDTO, ReportStatus } from '../types';

const ROUTE_PERF = [
  { route: 'GMP-CJU', revenue: 182_400_000, target: 160_000_000, loadFactor: 87 },
  { route: 'GMP-PUS', revenue: 94_500_000, target: 110_000_000, loadFactor: 58 },
  { route: 'ICN-CJU', revenue: 138_200_000, target: 130_000_000, loadFactor: 86 },
  { route: 'GMP-TAE', revenue: 41_800_000, target: 50_000_000, loadFactor: 48 },
];

const YIELD_DATA = [
  { month: '2월', yield: 82, target: 78 },
  { month: '3월', yield: 89, target: 82 },
  { month: '4월', yield: 85, target: 84 },
  { month: '5월', yield: 91, target: 86 },
];

interface ReportStore {
  reportData: ReportDTO | null;
  reportStatus: ReportStatus;
  emailInput: string;

  setEmailInput: (email: string) => void;
  generateReport: (route: string | null, start: string, end: string) => Promise<void>;
  downloadPdf: (reportId: string) => Promise<void>;
  downloadDocx: (reportId: string) => void;
  sendEmail: (reportId: string, email: string) => Promise<boolean>;
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reportData: null,
  reportStatus: 'idle',
  emailInput: '',

  setEmailInput: (email) => set({ emailInput: email }),

  generateReport: async (route, start, end) => {
    set({ reportStatus: 'generating' });
    await new Promise((r) => setTimeout(r, 1200));
    const totalRevenue = ROUTE_PERF.reduce((s, r) => s + r.revenue, 0);
    const totalTarget = ROUTE_PERF.reduce((s, r) => s + r.target, 0);
    set({
      reportData: {
        reportId: `RPT-${Date.now()}`,
        route,
        periodStart: start,
        periodEnd: end,
        totalRevenue,
        totalTarget,
        achieveRate: Math.round((totalRevenue / totalTarget) * 100),
        routePerformance: ROUTE_PERF,
        yieldTrend: YIELD_DATA,
        aiStats: { approvedCount: 3, rejectedCount: 1 },
        revenueHistory: revenueHistory,
        createdAt: new Date().toISOString(),
      },
      reportStatus: 'ready',
    });
  },

  downloadPdf: async (_reportId) => {
    const { reportData } = get();
    if (!reportData) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const el = document.querySelector('[data-testid="report-preview"]') as HTMLElement | null;
      if (!el) throw new Error('preview element not found');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height / canvas.width) * imgW;
      let y = 0;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
        remaining -= pageH;
        y += pageH;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`RM_Report_${reportData.reportId}.pdf`);
    } catch (e) {
      console.error('PDF 생성 실패:', e);
      // fallback: text blob with correct extension
      const content = buildTextContent(reportData);
      downloadBlob(content, `RM_Report_${reportData.reportId}.pdf`, 'application/pdf');
    }
  },

  downloadDocx: (_reportId) => {
    const { reportData } = get();
    if (!reportData) return;
    import('docx').then(({ Document, Paragraph, TextRun, HeadingLevel, Packer }) => {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: 'Revenue Management Report', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `기간: ${reportData.periodStart} ~ ${reportData.periodEnd}` }),
            new Paragraph({ text: `노선: ${reportData.route ?? '국내선 전체'}` }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: `총 수익: ${reportData.totalRevenue.toLocaleString()}원`, bold: true })] }),
            new Paragraph({ text: `목표 수익: ${reportData.totalTarget.toLocaleString()}원` }),
            new Paragraph({ children: [new TextRun({ text: `목표 달성률: ${reportData.achieveRate}%`, bold: true })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'AI 가격 추천 통계', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: `수동 승인: ${reportData.aiStats.approvedCount}건` }),
            new Paragraph({ text: `거부: ${reportData.aiStats.rejectedCount}건` }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '노선별 수익', heading: HeadingLevel.HEADING_2 }),
            ...reportData.routePerformance.map(r =>
              new Paragraph({ text: `${r.route}: ${r.revenue.toLocaleString()}원 / 목표 ${r.target.toLocaleString()}원 (달성률 ${Math.round(r.revenue / r.target * 100)}%, L/F ${r.loadFactor}%)` })
            ),
            new Paragraph({ text: '' }),
            new Paragraph({ text: `생성일시: ${reportData.createdAt}` }),
          ],
        }],
      });
      Packer.toBlob(doc).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RM_Report_${reportData.reportId}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }).catch((e) => {
      console.error('DOCX 생성 실패:', e);
      const content = buildTextContent(reportData);
      downloadBlob(content, `RM_Report_${reportData.reportId}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  },

  sendEmail: async (_reportId, email) => {
    const { reportData } = get();
    if (!reportData) return false;
    // mailto 방식으로 실제 이메일 클라이언트 열기
    const subject = encodeURIComponent(`[Revenue Manager] Yield Management Report ${reportData.periodStart}~${reportData.periodEnd}`);
    const body = encodeURIComponent(
      `안녕하세요,\n\n아래 수익 관리 보고서를 전달드립니다.\n\n` +
      `기간: ${reportData.periodStart} ~ ${reportData.periodEnd}\n` +
      `노선: ${reportData.route ?? '국내선 전체'}\n` +
      `총 수익: ${reportData.totalRevenue.toLocaleString()}원\n` +
      `목표 달성률: ${reportData.achieveRate}%\n` +
      `AI 추천 승인: ${reportData.aiStats.approvedCount}건\n\n` +
      `생성일시: ${reportData.createdAt}\n\n감사합니다.\nRevenue Management System`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    return true;
  },
}));

function buildTextContent(reportData: ReportDTO): string {
  return [
    'REVENUE MANAGEMENT REPORT',
    '',
    `기간: ${reportData.periodStart} ~ ${reportData.periodEnd}`,
    `노선: ${reportData.route ?? '국내선 전체'}`,
    `총 수익: ${reportData.totalRevenue.toLocaleString()}원`,
    `목표 달성률: ${reportData.achieveRate}%`,
    `생성일: ${reportData.createdAt}`,
  ].join('\n');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
