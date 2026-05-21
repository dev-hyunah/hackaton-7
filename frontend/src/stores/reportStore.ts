import { create } from 'zustand';
import type { ReportDTO, ReportStatus } from '../types';

// 전 노선 성과 데이터 (필터링 기준)
const ALL_ROUTE_PERF = [
  { route: 'GMP-CJU', revenue: 182_400_000, target: 160_000_000, loadFactor: 87 },
  { route: 'GMP-PUS', revenue: 94_500_000,  target: 110_000_000, loadFactor: 58 },
  { route: 'ICN-CJU', revenue: 138_200_000, target: 130_000_000, loadFactor: 86 },
  { route: 'GMP-TAE', revenue: 41_800_000,  target: 50_000_000,  loadFactor: 48 },
  { route: 'GMP-KWJ', revenue: 35_600_000,  target: 40_000_000,  loadFactor: 52 },
  { route: 'ICN-PUS', revenue: 88_900_000,  target: 100_000_000, loadFactor: 61 },
  { route: 'GMP-KPO', revenue: 32_100_000,  target: 38_000_000,  loadFactor: 55 },
  { route: 'GMP-RSU', revenue: 28_400_000,  target: 35_000_000,  loadFactor: 49 },
];

// 월별 Yield 데이터 (월 번호 → 데이터)
const YIELD_BY_MONTH: Record<number, { yield: number; target: number }> = {
  1: { yield: 78, target: 75 },
  2: { yield: 82, target: 78 },
  3: { yield: 89, target: 82 },
  4: { yield: 85, target: 84 },
  5: { yield: 91, target: 86 },
  6: { yield: 88, target: 85 },
  7: { yield: 95, target: 90 },
  8: { yield: 93, target: 91 },
  9: { yield: 86, target: 83 },
  10: { yield: 84, target: 82 },
  11: { yield: 80, target: 79 },
  12: { yield: 90, target: 88 },
};

// 기간 내 일별 수익 mock 생성 (필터 기간에 정확히 맞는 데이터)
function generateDailyRevenue(
  start: string,
  end: string,
  baseDaily: number,
): { date: string; revenue: number; bookings: number }[] {
  const result: { date: string; revenue: number; bookings: number }[] = [];
  const s = new Date(start);
  const e = new Date(end);
  const cur = new Date(s);
  let seed = s.getTime();
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000; };
  while (cur <= e) {
    const noise = 0.75 + rng() * 0.5;
    const revenue = Math.round(baseDaily * noise);
    const bookings = Math.round(revenue / 105_000 * (0.9 + rng() * 0.2));
    result.push({
      date: `${cur.getMonth() + 1}/${cur.getDate()}`,
      revenue,
      bookings: Math.max(1, bookings),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// 기간에 포함되는 월 목록 반환
function getMonthsInRange(start: string, end: string): number[] {
  const s = new Date(start);
  const e = new Date(end);
  const months: number[] = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  while (cur <= e) {
    months.push(cur.getMonth() + 1);
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

// 기간에 따라 노선 수익을 일할 비례 스케일링 (전체 기간 = 90일 기준)
function scaleRevenue(revenue: number, start: string, end: string): number {
  const days = Math.max(1, (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
  return Math.round(revenue * (days / 90));
}

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

    // 노선 필터링
    const filteredRoutes = route
      ? ALL_ROUTE_PERF.filter((r) => r.route === route)
      : ALL_ROUTE_PERF;

    // 기간 비례 스케일링 적용
    const routePerformance = filteredRoutes.map((r) => ({
      ...r,
      revenue: scaleRevenue(r.revenue, start, end),
      target:  scaleRevenue(r.target,  start, end),
    }));

    const totalRevenue = routePerformance.reduce((s, r) => s + r.revenue, 0);
    const totalTarget  = routePerformance.reduce((s, r) => s + r.target,  0);

    // 기간 내 포함되는 월만 Yield 표시
    const months = getMonthsInRange(start, end);
    const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const yieldTrend = months.map((m) => ({
      month: MONTH_LABELS[m - 1],
      ...(YIELD_BY_MONTH[m] ?? { yield: 80, target: 80 }),
    }));

    // 기간 내 일별 수익 — 필터 기간에 정확히 맞는 데이터 동적 생성
    const baseDaily = Math.round(totalRevenue / Math.max(1, (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
    const historyToShow = generateDailyRevenue(start, end, baseDaily);

    set({
      reportData: {
        reportId: `RPT-${Date.now()}`,
        route,
        periodStart: start,
        periodEnd: end,
        totalRevenue,
        totalTarget,
        achieveRate: Math.round((totalRevenue / totalTarget) * 100),
        routePerformance,
        yieldTrend,
        aiStats: { approvedCount: 3, rejectedCount: 1 },
        revenueHistory: historyToShow,
        createdAt: new Date().toISOString(),
      },
      reportStatus: 'ready',
    });
  },

  downloadPdf: async (_reportId) => {
    const { reportData } = get();
    if (!reportData) return;
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const el = document.querySelector('[data-testid="report-preview"]') as HTMLElement | null;
      if (!el) throw new Error('preview element not found');

      // html-to-image는 getComputedStyle()로 인라인화하므로 oklch() CSS 변수 파싱 오류 없음
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          // 스크롤바 제거
          if (node instanceof HTMLElement && node.style) {
            node.style.overflow = 'visible';
          }
          return true;
        },
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (img.height / img.width) * imgW;

      let renderedHeight = 0;
      while (renderedHeight < imgH) {
        if (renderedHeight > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, -renderedHeight, imgW, imgH);
        renderedHeight += pageH;
      }

      pdf.save(`RM_Report_${reportData.reportId}.pdf`);
    } catch (e) {
      console.error('PDF 생성 실패:', e);
      alert('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  },

  downloadDocx: (_reportId) => {
    const { reportData } = get();
    if (!reportData) return;
    import('docx').then(({
      Document, Paragraph, TextRun, HeadingLevel, Packer,
      Table, TableRow, TableCell, WidthType, BorderStyle,
      AlignmentType, ShadingType,
    }) => {
      const KE_NAVY = '002561';
      const EMERALD = '059669';
      const GRAY_BG = 'F8FAFC';
      const HEADER_BG = 'EFF6FF';

      const makeCell = (text: string, opts: {
        bold?: boolean; bg?: string; color?: string; align?: typeof AlignmentType[keyof typeof AlignmentType];
      } = {}) =>
        new TableCell({
          shading: opts.bg ? { type: ShadingType.CLEAR, fill: opts.bg } : undefined,
          children: [new Paragraph({
            alignment: opts.align ?? AlignmentType.LEFT,
            children: [new TextRun({
              text,
              bold: opts.bold,
              color: opts.color ?? '374151',
              size: 20,
            })],
          })],
        });

      const tableStyle = {
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          left:   { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          right:  { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          insideH:{ style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          insideV:{ style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        },
      };

      const spacer = new Paragraph({ text: '' });

      // ── Executive Summary 표 ──
      const aiContrib = ((reportData.totalRevenue - 430_000_000) / 1_000_000).toFixed(0);
      const summaryTable = new Table({
        ...tableStyle,
        rows: [
          new TableRow({ children: [
            makeCell('항목', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('실적', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('비고', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
          ]}),
          new TableRow({ children: [
            makeCell('총 수익'),
            makeCell(`${(reportData.totalRevenue / 100_000_000).toFixed(2)}억원`, { bold: true, color: EMERALD }),
            makeCell(`목표 ${(reportData.totalTarget / 100_000_000).toFixed(2)}억원`),
          ]}),
          new TableRow({ children: [
            makeCell('목표 달성률'),
            makeCell(`${reportData.achieveRate}%`, { bold: true, color: reportData.achieveRate >= 100 ? EMERALD : 'D97706' }),
            makeCell(reportData.achieveRate >= 100 ? '목표 초과 달성 ✓' : '목표 미달'),
          ]}),
          new TableRow({ children: [
            makeCell('AI 가격 수익 기여'),
            makeCell(`+${aiContrib}M원`, { bold: true, color: KE_NAVY }),
            makeCell(`수동 승인 ${reportData.aiStats.approvedCount}건 적용분`),
          ]}),
        ],
      });

      // ── 노선별 수익 표 ──
      const routeTable = new Table({
        ...tableStyle,
        rows: [
          new TableRow({ children: [
            makeCell('노선', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('실적 수익', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('목표 수익', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('달성률', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('L/F', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
          ]}),
          ...reportData.routePerformance.map((r) => {
            const rate = Math.round((r.revenue / r.target) * 100);
            return new TableRow({ children: [
              makeCell(r.route, { bold: true }),
              makeCell(`${r.revenue.toLocaleString()}원`),
              makeCell(`${r.target.toLocaleString()}원`),
              makeCell(`${rate}%`, { color: rate >= 100 ? EMERALD : 'D97706', bold: true }),
              makeCell(`${r.loadFactor}%`),
            ]});
          }),
        ],
      });

      // ── Yield 추이 표 ──
      const yieldTable = new Table({
        ...tableStyle,
        rows: [
          new TableRow({ children: [
            makeCell('월', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('실제 Yield', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('목표 Yield', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('달성 여부', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
          ]}),
          ...reportData.yieldTrend.map((y) =>
            new TableRow({ children: [
              makeCell(y.month, { bold: true }),
              makeCell(`${y.yield}%`, { color: y.yield >= y.target ? EMERALD : 'D97706', bold: true }),
              makeCell(`${y.target}%`),
              makeCell(y.yield >= y.target ? '달성 ✓' : '미달', { color: y.yield >= y.target ? EMERALD : 'D97706' }),
            ]})
          ),
        ],
      });

      // ── AI 기여도 표 ──
      const aiTable = new Table({
        ...tableStyle,
        rows: [
          new TableRow({ children: [
            makeCell('구분', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('건수', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
          ]}),
          new TableRow({ children: [
            makeCell('수동 승인'),
            makeCell(`${reportData.aiStats.approvedCount}건`, { bold: true, color: EMERALD }),
          ]}),
          new TableRow({ children: [
            makeCell('거부'),
            makeCell(`${reportData.aiStats.rejectedCount}건`, { bold: true, color: 'EF4444' }),
          ]}),
        ],
      });

      // ── 일별 수익 표 ──
      const dailyTable = new Table({
        ...tableStyle,
        rows: [
          new TableRow({ children: [
            makeCell('날짜', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('수익', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('예약 건수', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
            makeCell('평균 단가', { bold: true, bg: HEADER_BG, color: KE_NAVY }),
          ]}),
          ...reportData.revenueHistory.map((d) =>
            new TableRow({ children: [
              makeCell(`2026/${d.date}`),
              makeCell(`${d.revenue.toLocaleString()}원`, { bold: true }),
              makeCell(`${d.bookings}건`),
              makeCell(`${Math.round(d.revenue / d.bookings).toLocaleString()}원`),
            ]})
          ),
        ],
      });

      const doc = new Document({
        styles: {
          default: {
            document: { run: { font: 'Malgun Gothic', size: 22 } },
          },
        },
        sections: [{
          properties: {},
          children: [
            // ── 표지 ──
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Yield Management Report', bold: true, size: 48, color: KE_NAVY })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: `${reportData.periodStart} ~ ${reportData.periodEnd}  |  ${reportData.route ?? '국내선 전체 노선'}`,
                size: 24, color: '6B7280',
              })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `생성일시: ${reportData.createdAt}`, size: 20, color: '9CA3AF' })],
            }),
            spacer,

            // ── Executive Summary ──
            new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
            summaryTable,
            spacer,
            new Paragraph({
              children: [
                new TextRun({ text: '수익 최적화 결론: ', bold: true, color: KE_NAVY, size: 20 }),
                new TextRun({
                  text: `AI 추천 수동 승인 ${reportData.aiStats.approvedCount}건으로 기준 대비 수익 약 ` +
                    `+${((reportData.totalRevenue - 430_000_000) / 430_000_000 * 100).toFixed(1)}% 향상. ` +
                    `목표 달성률 ${reportData.achieveRate}%로 ` +
                    (reportData.achieveRate >= 100 ? '목표 초과 달성.' : '목표 미달 — 하위 노선 단가 전략 재검토 필요.'),
                  size: 20, color: '374151',
                }),
              ],
              shading: { type: ShadingType.CLEAR, fill: GRAY_BG },
            }),
            spacer,

            // ── 노선별 수익 ──
            new Paragraph({ text: '노선별 수익 달성률', heading: HeadingLevel.HEADING_1 }),
            routeTable,
            spacer,

            // ── Yield 추이 ──
            new Paragraph({ text: '월별 Yield 추이', heading: HeadingLevel.HEADING_1 }),
            yieldTable,
            spacer,

            // ── AI 기여도 ──
            new Paragraph({ text: 'AI 가격 추천 수익 기여도', heading: HeadingLevel.HEADING_1 }),
            aiTable,
            spacer,

            // ── 일별 수익 ──
            new Paragraph({ text: '최근 8일 일별 수익', heading: HeadingLevel.HEADING_1 }),
            dailyTable,
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
      alert('DOCX 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
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

