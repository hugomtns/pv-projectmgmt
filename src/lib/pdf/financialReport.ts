/**
 * Financial Report PDF Generator
 *
 * Browser-based PDF generation using jsPDF
 * Generates comprehensive financial analysis reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { ProjectResults, CostLineItem } from '@/lib/types/financial';
import { formatCurrency, formatPercent, formatNumber, formatWithSuffix } from './formatter';

export interface PDFExportOptions {
  includeRevenueChart?: boolean;
  includeCashFlowChart?: boolean;
  includeYearlyTable?: boolean;
  includeMonthlyView?: boolean;  // If true, uses monthly charts instead of yearly
}

// Colors for professional report styling
const COLORS = {
  PRIMARY_BLUE: [29, 78, 216] as [number, number, number],
  SECONDARY_BLUE: [37, 99, 235] as [number, number, number],
  GRAY_LIGHT: [229, 231, 235] as [number, number, number],
  GRAY_DARK: [17, 24, 39] as [number, number, number],
  GRAY_BORDER: [209, 213, 219] as [number, number, number],
  WHITE: [255, 255, 255] as [number, number, number],
  STRIPED_ROW: [249, 250, 251] as [number, number, number],
  GREEN: [16, 185, 129] as [number, number, number],
};

export class PDFReportGenerator {
  private doc!: jsPDF;
  private currentY: number = 20;
  private globalMargin: number = 0;
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN_BOTTOM = 20;
  private readonly MARGIN_TOP = 20;

  /**
   * Check if we need a new page and add one if necessary
   */
  private ensureSpace(neededHeight: number): void {
    if (this.currentY + neededHeight > this.PAGE_HEIGHT - this.MARGIN_BOTTOM) {
      this.doc.addPage();
      this.currentY = this.MARGIN_TOP;
    }
  }

  /**
   * Start a new page
   */
  private startNewPage(): void {
    this.doc.addPage();
    this.currentY = this.MARGIN_TOP;
  }

  /**
   * Capture chart as image using html2canvas
   */
  private async captureChartAsImage(elementId: string): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element ${elementId} not found for PDF capture`);
      return null;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`Failed to capture chart ${elementId}:`, error);
      return null;
    }
  }

  /**
   * Add chart section to PDF - always starts on a new page
   * Returns true if chart was added, false if element not found
   */
  private async addChartSection(title: string, elementId: string): Promise<boolean> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element ${elementId} not found for PDF capture`);
      return false;
    }

    const imgData = await this.captureChartAsImage(elementId);
    if (!imgData) {
      return false;
    }

    // Charts always start on a new page to prevent cutoff
    this.startNewPage();
    this.addSectionHeader(title);

    // Calculate proper aspect ratio from element dimensions
    const rect = element.getBoundingClientRect();
    const aspectRatio = rect.width / rect.height;

    // A4 width = 210mm, margins = 14mm each side, so available width = 182mm
    const pdfWidth = 182;
    const pdfHeight = pdfWidth / aspectRatio;

    this.doc.addImage(imgData, 'PNG', 14, this.currentY, pdfWidth, pdfHeight);
    this.currentY += pdfHeight + 10;
    return true;
  }

  /**
   * Generate complete PDF report
   */
  async generateReport(
    results: ProjectResults,
    options: PDFExportOptions = {},
    globalMargin: number = 0
  ): Promise<Blob> {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.currentY = this.MARGIN_TOP;
    this.globalMargin = globalMargin;

    // Page 1: Title + Project Summary + Key Metrics
    this.addTitle();
    this.addProjectSummary(results.project_summary);

    // Check if Key Metrics fits, otherwise new page
    this.ensureSpace(80);
    this.addKeyMetrics(results.key_metrics);

    // Page 2: Financing Structure + First Year Operations
    this.startNewPage();
    this.addFinancingStructure(results.financing_structure);
    this.ensureSpace(60);
    this.addFirstYearOperations(results.first_year_operations);

    // Cost breakdown on its own page (always included if data exists)
    if (results.cost_items_breakdown) {
      this.startNewPage();
      this.addCostBreakdown(results.cost_items_breakdown);
    }

    // Determine chart IDs based on view mode
    const isMonthly = options.includeMonthlyView === true;
    const revenueChartId = isMonthly ? 'monthly-revenue-chart' : 'yearly-revenue-chart';
    const fcfChartId = isMonthly ? 'monthly-fcf-chart' : 'yearly-fcf-chart';
    const viewLabel = isMonthly ? 'Monthly' : 'Yearly';

    // Revenue chart (if requested)
    if (options.includeRevenueChart !== false) {
      await this.addChartSection(
        `Revenue & Costs (${viewLabel})`,
        revenueChartId
      );
    }

    // Cash flow chart (if requested)
    if (options.includeCashFlowChart !== false) {
      await this.addChartSection(
        `Cumulative Cash Flow to Equity (${viewLabel})`,
        fcfChartId
      );
    }

    // Yearly projections table on its own page
    if (results.yearly_data && options.includeYearlyTable !== false) {
      this.startNewPage();
      this.addYearlyProjections(results.yearly_data);
    }

    // Assessment section on its own page
    this.startNewPage();
    this.addAssessment(results.assessment);

    return this.doc.output('blob');
  }

  /**
   * Section 1: Title and Date
   */
  private addTitle(): void {
    this.doc.setFontSize(24);
    this.doc.setTextColor(...COLORS.PRIMARY_BLUE);
    this.doc.text('PV Finance Project Analysis', 105, this.currentY, { align: 'center' });

    this.currentY += 10;

    this.doc.setFontSize(11);
    this.doc.setTextColor(128, 128, 128);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    this.doc.text(`Generated on ${dateStr}`, 105, this.currentY, { align: 'center' });

    this.currentY += 15;
  }

  /**
   * Section 2: Project Summary
   */
  private addProjectSummary(summary: ProjectResults['project_summary']): void {
    this.addSectionHeader('Project Summary');

    const data = [
      ['Capacity', `${formatNumber(summary.capacity_mw, 1)} MW`],
      ['Capacity Factor', formatPercent(summary.capacity_factor)],
      ['P50 Year 0 Yield', `${formatNumber(summary.p50_year_0_yield_mwh, 0)} MWh`],
      ['Project Lifetime', `${summary.project_lifetime} years`],
      ['Total CapEx', formatCurrency(summary.total_capex)],
      ['CapEx per MW', formatCurrency(summary.capex_per_mw)]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Parameter', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.GRAY_LIGHT,
        textColor: COLORS.GRAY_DARK,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 3: Key Financial Metrics (highlighted)
   */
  private addKeyMetrics(metrics: ProjectResults['key_metrics']): void {
    this.addSectionHeader('Key Financial Metrics');

    const data = [
      ['Project IRR', formatPercent(metrics.project_irr)],
      ['Equity IRR', formatPercent(metrics.equity_irr)],
      ['LCOE', `${formatNumber(metrics.lcoe, 2)} €/MWh`],
      ['Minimum DSCR', formatWithSuffix(metrics.min_dscr, 2, 'x')],
      ['Average DSCR', formatWithSuffix(metrics.avg_dscr, 2, 'x')],
      ['Project NPV', formatCurrency(metrics.project_npv)],
      ['PPA Price', `${formatNumber(metrics.ppa_price, 2)} €/MWh`],
      ['Equity Payback', metrics.equity_payback_years ? `${formatNumber(metrics.equity_payback_years, 1)} years` : '—'],
      ['Project Payback', metrics.project_payback_years ? `${formatNumber(metrics.project_payback_years, 1)} years` : '—']
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.SECONDARY_BLUE,
        textColor: COLORS.WHITE,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 4: Financing Structure
   */
  private addFinancingStructure(financing: ProjectResults['financing_structure']): void {
    this.addSectionHeader('Financing Structure');

    const data = [
      ['Max Debt by DSCR', formatCurrency(financing.max_debt_by_dscr)],
      ['Max Debt by Gearing', formatCurrency(financing.max_debt_by_gearing)],
      ['Final Debt', formatCurrency(financing.final_debt)],
      ['Equity', formatCurrency(financing.equity)],
      ['Actual Gearing', formatPercent(financing.actual_gearing)],
      ['Binding Constraint', financing.binding_constraint],
      ['Interest Rate', formatPercent(financing.interest_rate)],
      ['Debt Tenor', `${financing.debt_tenor} years`],
      ['Annual Debt Service', formatCurrency(financing.annual_debt_service)]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Parameter', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.GRAY_LIGHT,
        textColor: COLORS.GRAY_DARK,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 5: First Year Operations
   */
  private addFirstYearOperations(firstYear: ProjectResults['first_year_operations']): void {
    this.addSectionHeader('First Year Operations');

    const data = [
      ['Energy Production', `${formatNumber(firstYear.energy_production_mwh, 0)} MWh`],
      ['Revenue', formatCurrency(firstYear.revenue)],
      ['O&M Costs', formatCurrency(firstYear.om_costs)],
      ['EBITDA', formatCurrency(firstYear.ebitda)],
      ['CFADS', formatCurrency(firstYear.cfads)]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: COLORS.GRAY_LIGHT,
        textColor: COLORS.GRAY_DARK,
        fontStyle: 'bold'
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 6: Cost Breakdown (conditional)
   */
  private addCostBreakdown(costBreakdown: NonNullable<ProjectResults['cost_items_breakdown']>): void {
    this.addSectionHeader('Cost Breakdown');

    const capexItems = costBreakdown.items.filter((item: CostLineItem) => item.is_capex);
    const opexItems = costBreakdown.items.filter((item: CostLineItem) => !item.is_capex);

    // CapEx items
    if (capexItems.length > 0) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.doc.text('CapEx Items', 14, this.currentY);
      this.currentY += 8;

      let totalBeforeMargin = 0;
      let totalWithMargin = 0;

      const capexData = capexItems.map((item: CostLineItem) => {
        const subtotal = item.amount;
        const marginPercent = item.margin_percent ?? this.globalMargin;
        const total = subtotal * (1 + marginPercent / 100);

        totalBeforeMargin += subtotal;
        totalWithMargin += total;

        if (item.unit_price && item.quantity) {
          return [
            item.name,
            formatCurrency(item.unit_price),
            formatNumber(item.quantity, 0),
            item.unit || '—',
            formatCurrency(subtotal),
            `${formatNumber(marginPercent, 1)}%`,
            formatCurrency(total)
          ];
        } else {
          return [
            item.name,
            '—',
            '—',
            item.unit || '—',
            formatCurrency(subtotal),
            `${formatNumber(marginPercent, 1)}%`,
            formatCurrency(total)
          ];
        }
      });

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Item', 'Price/Item', 'Qty', 'Unit', 'Subtotal', 'Margin%', 'Total']],
        body: capexData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: COLORS.GRAY_LIGHT,
          textColor: COLORS.GRAY_DARK,
          fontStyle: 'bold',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'right' },
          2: { cellWidth: 18, halign: 'right' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
        }
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 5;

      // Total CapEx (before and after margin)
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`Total CapEx (before margin): ${formatCurrency(totalBeforeMargin)}`, 14, this.currentY);
      this.currentY += 5;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLORS.GREEN);
      this.doc.text(`Total CapEx (with margin): ${formatCurrency(totalWithMargin)}`, 14, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.currentY += 5;

      const effectiveMargin = totalBeforeMargin > 0
        ? ((totalWithMargin - totalBeforeMargin) / totalBeforeMargin) * 100
        : 0;
      this.doc.setFontSize(9);
      this.doc.setTextColor(128, 128, 128);
      this.doc.text(`Effective Margin: ${formatNumber(effectiveMargin, 2)}%`, 14, this.currentY);
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.currentY += 10;
    }

    // OpEx items
    if (opexItems.length > 0) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(...COLORS.GRAY_DARK);
      this.doc.text('OpEx Items (Year 1)', 14, this.currentY);
      this.currentY += 8;

      const opexData = opexItems.map((item: CostLineItem) => [
        item.name,
        item.unit || '—',
        formatCurrency(item.amount)
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Item', 'Unit', 'Annual Cost']],
        body: opexData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: COLORS.GRAY_LIGHT,
          textColor: COLORS.GRAY_DARK,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 46, halign: 'right' }
        }
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 5;

      // Total OpEx
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`Total OpEx (Year 1): ${formatCurrency(costBreakdown.total_opex_year_1)}`, 14, this.currentY);
      this.doc.setFont('helvetica', 'normal');
    }
  }

  /**
   * Section 7: Yearly Projections (10-column table)
   */
  private addYearlyProjections(yearlyData: NonNullable<ProjectResults['yearly_data']>): void {
    this.addSectionHeader('Yearly Financial Projections');

    const headers = [
      'Year',
      'Energy\n(MWh)',
      'Revenue\n(€)',
      'O&M\n(€)',
      'EBITDA\n(€)',
      'CFADS\n(€)',
      'Debt Svc\n(€)',
      'DSCR',
      'FCF to Eq\n(€)',
      'Cumul FCF\n(€)'
    ];

    const body = yearlyData.years.map((year: number, i: number) => [
      year.toString(),
      formatNumber(yearlyData.energy_production_mwh[i], 0),
      formatNumber(yearlyData.revenue[i], 0),
      formatNumber(yearlyData.om_costs[i], 0),
      formatNumber(yearlyData.ebitda[i], 0),
      formatNumber(yearlyData.cfads[i], 0),
      formatNumber(yearlyData.debt_service[i], 0),
      yearlyData.dscr[i] !== null ? `${formatNumber(yearlyData.dscr[i]!, 2)}x` : '—',
      formatNumber(yearlyData.fcf_to_equity[i], 0),
      formatNumber(yearlyData.cumulative_fcf_to_equity[i], 0)
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: body,
      theme: 'striped',
      styles: {
        fontSize: 7,
        cellPadding: 2
      },
      headStyles: {
        fillColor: COLORS.SECONDARY_BLUE,
        textColor: COLORS.WHITE,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: COLORS.STRIPED_ROW
      }
    });
  }

  /**
   * Section 8: Project Assessment
   */
  private addAssessment(assessment: ProjectResults['assessment']): void {
    this.addSectionHeader('Project Assessment');

    this.doc.setFontSize(11);
    this.doc.setTextColor(...COLORS.GRAY_DARK);

    const assessmentData = [
      ['Project IRR', assessment.project_irr],
      ['Equity IRR', assessment.equity_irr],
      ['DSCR', assessment.dscr]
    ];

    let y = this.currentY;
    assessmentData.forEach(([label, value]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${label}:`, 14, y);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, 14, y + 6);
      y += 15;
    });

    y += 5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Overall Assessment:', 14, y);
    this.doc.setFont('helvetica', 'normal');

    // Wrap long text
    const splitText = this.doc.splitTextToSize(assessment.overall, 180);
    this.doc.text(splitText, 14, y + 6);

    // Add footer
    y += 25 + (splitText.length * 5);
    this.doc.setFontSize(9);
    this.doc.setTextColor(128, 128, 128);
    this.doc.text('Generated with PV Project Management', 105, y, { align: 'center' });
  }

  /**
   * Helper: Add section header
   */
  private addSectionHeader(title: string): void {
    this.doc.setFontSize(14);
    this.doc.setTextColor(...COLORS.PRIMARY_BLUE);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, 14, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 8;
  }
}

/**
 * Generate and download PDF report
 */
export async function downloadFinancialReport(
  results: ProjectResults,
  options: PDFExportOptions = {},
  globalMargin: number = 0,
  filename?: string
): Promise<void> {
  const generator = new PDFReportGenerator();
  const blob = await generator.generateReport(results, options, globalMargin);

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `PV_Finance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
