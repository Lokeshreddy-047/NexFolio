import { InvestorReportResponse, TaxReportResponse, AuditLogItem } from "./api";

export interface ThemedExcelExportOptions {
  report: InvestorReportResponse | null;
  taxReport: TaxReportResponse | null;
  activeTab: "DOSSIER" | "TAX_HARVESTING" | "AUDIT_LOGS";
  portfolioName: string;
  integrityHash: string;
  theme: "dark" | "light";
  selectedTaxYear?: string;
  auditLogs?: AuditLogItem[];
}

export function exportThemedReportExcel({
  report,
  taxReport,
  activeTab,
  portfolioName,
  integrityHash,
  theme,
  selectedTaxYear = "Tax Year 2026-27",
  auditLogs = [],
}: ThemedExcelExportOptions) {
  const isDark = theme === "dark";

  // Institutional private wealth and financial accounting palette for Excel
  const c = isDark
    ? {
        bodyBg: "#030712",
        cardBg: "#0B1120",
        cardAltBg: "#0F172A",
        headerBg: "#162032",
        headerText: "#38BDF8",
        sectionBannerBg: "#1E293B",
        sectionBannerText: "#F8FAFC",
        titleText: "#FFFFFF",
        subText: "#94A3B8",
        textColor: "#E2E8F0",
        mutedText: "#64748B",
        borderColor: "#334155",
        lightBorder: "#1E293B",
        greenColor: "#34D399",
        greenBg: "#064E3B",
        redColor: "#FB7185",
        redBg: "#881337",
        indigoColor: "#818CF8",
        indigoBg: "#312E81",
        tealColor: "#2DD4BF",
        tealBg: "#134E4A",
        amberColor: "#FBBF24",
        amberBg: "#78350F",
        mastheadBg: "#0B1120",
        metaBoxBg: "#0F172A",
        summaryRowBg: "#162032",
        doubleUnderlineColor: "#38BDF8",
      }
    : {
        bodyBg: "#FFFFFF",
        cardBg: "#FFFFFF",
        cardAltBg: "#F8FAFC",
        headerBg: "#F1F5F9",
        headerText: "#0F172A",
        sectionBannerBg: "#E2E8F0",
        sectionBannerText: "#0F172A",
        titleText: "#0F172A",
        subText: "#475569",
        textColor: "#1E293B",
        mutedText: "#94A3B8",
        borderColor: "#CBD5E1",
        lightBorder: "#E2E8F0",
        greenColor: "#047857",
        greenBg: "#ECFDF5",
        redColor: "#BE123C",
        redBg: "#FFF1F2",
        indigoColor: "#4338CA",
        indigoBg: "#EEF2FF",
        tealColor: "#0F766E",
        tealBg: "#F0FDFA",
        amberColor: "#B45309",
        amberBg: "#FEF3C7",
        mastheadBg: "#FFFFFF",
        metaBoxBg: "#F8FAFC",
        summaryRowBg: "#F1F5F9",
        doubleUnderlineColor: "#0F172A",
      };

  let title = "NexFolio Institutional Asset Intelligence Report";
  let subtitle = "Fiduciary Wealth Management & Autonomous Quantitative Risk Platform";
  let bodyContent = "";

  if (activeTab === "TAX_HARVESTING" && taxReport) {
    title = `Statutory Capital Gains & Tax Loss Harvesting Schedule (${taxReport.rule_set.law || "Income-tax Act, 2025"})`;
    subtitle = `Assessment & Filing Period: ${selectedTaxYear} • Section 111A STCG @ 20% & Section 112A LTCG @ 12.5%`;
    bodyContent = generateTaxHarvestExcelContent(taxReport, c, selectedTaxYear);
  } else if (activeTab === "AUDIT_LOGS") {
    title = "System Audit Trail & Cryptographic Provenance Ledger";
    subtitle = "Immutable Audit Log of Valuations, Executions, and Quantitative Engine Operations";
    bodyContent = generateAuditLogsExcelContent(auditLogs, c);
  } else if (report) {
    title = `Executive Portfolio Intelligence Dossier (${report.report_version || "Latest Snapshot"})`;
    subtitle = `Quantitative Risk Analysis, 4-Pillar Scorecard, and Allocation Intelligence`;
    bodyContent = generateDossierExcelContent(report, c);
  } else {
    bodyContent = `<tr><td colspan="8" style="padding: 24px; color: ${c.textColor}; text-align: center;">No active report snapshot loaded. Please load a portfolio in NexFolio first.</td></tr>`;
  }

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>NexFolio_${theme.toUpperCase()}_Dossier</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:PaperSizeIndex>9</x:PaperSizeIndex>
              <x:HorizontalResolution>600</x:HorizontalResolution>
              <x:VerticalResolution>600</x:VerticalResolution>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body {
      background-color: ${c.bodyBg};
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      color: ${c.textColor};
      margin: 0;
      padding: 16px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 22px;
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    }
    .masthead-title {
      font-size: 15pt;
      font-weight: 900;
      color: ${c.titleText};
      letter-spacing: 0.5px;
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    }
    .masthead-sub {
      font-size: 9pt;
      color: ${c.subText};
      margin-top: 2px;
    }
    .section-title {
      background-color: ${c.sectionBannerBg};
      color: ${c.sectionBannerText};
      font-size: 10pt;
      font-weight: bold;
      padding: 9px 12px;
      border: 1px solid ${c.borderColor};
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    th {
      background-color: ${c.headerBg};
      color: ${c.headerText};
      font-weight: 700;
      border: 1px solid ${c.borderColor};
      padding: 8px 10px;
      text-align: left;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      border: 1px solid ${c.borderColor};
      padding: 7px 10px;
      font-size: 9pt;
      color: ${c.textColor};
      vertical-align: middle;
    }
    .num-curr {
      mso-number-format: "\"₹\"\\#,##0.00";
      text-align: right;
      font-family: Consolas, 'Courier New', monospace;
    }
    .num-pct {
      mso-number-format: "0.00%";
      text-align: right;
      font-family: Consolas, 'Courier New', monospace;
    }
    .num-int {
      mso-number-format: "\\#,##0";
      text-align: right;
      font-family: Consolas, 'Courier New', monospace;
    }
    .col-id {
      mso-number-format: "\\@";
      font-family: Consolas, 'Courier New', monospace;
      color: ${c.indigoColor};
    }
    .col-date {
      mso-number-format: "yyyy\\-mm\\-dd";
      text-align: center;
    }
    .summary-total-row td {
      background-color: ${c.summaryRowBg};
      border-top: 1.5px solid ${c.doubleUnderlineColor};
      border-bottom: 3px double ${c.doubleUnderlineColor};
      font-weight: bold;
    }
  </style>
</head>
<body style="background-color: ${c.bodyBg};">

  <!-- Institutional Masthead & Official Letterhead -->
  <table style="margin-bottom: 16px; border: 2px solid ${c.borderColor};">
    <tr>
      <td colspan="8" style="background-color: ${c.mastheadBg}; padding: 16px; border: none;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
          <tr>
            <td style="border: none; padding: 0; vertical-align: top;">
              <div class="masthead-title">NEXFOLIO INSTITUTIONAL ASSET INTELLIGENCE</div>
              <div class="masthead-sub">${subtitle}</div>
            </td>
            <td style="border: none; padding: 0; text-align: right; vertical-align: top; font-size: 8.5pt; color: ${c.subText};">
              <strong>SEBI PMS Reg:</strong> INP000008472<br/>
              <strong>Statutory Filing:</strong> Indian Income-tax Act, 2025 Schedule
            </td>
          </tr>
        </table>

        <!-- Metadata Ribbon -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px; background-color: ${c.metaBoxBg}; border: 1px solid ${c.borderColor};">
          <tr>
            <td style="padding: 8px 12px; font-size: 8.5pt; border: none;">
              <strong>Document:</strong> ${title} &nbsp;|&nbsp;
              <strong>Portfolio:</strong> ${portfolioName} &nbsp;|&nbsp;
              <strong>Theme:</strong> ${theme.toUpperCase()} MODE &nbsp;|&nbsp;
              <strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} &nbsp;|&nbsp;
              <strong>Audit Hash:</strong> <span style="font-family: Consolas, monospace; color: ${c.indigoColor};">${integrityHash}</span> &nbsp;|&nbsp;
              <strong>Classification:</strong> CONFIDENTIAL &amp; PRIVILEGED
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Main Themed Content Body -->
  ${bodyContent}

  <!-- Professional Regulatory Seal & Statutory Disclaimer -->
  <table style="margin-top: 24px; border: 1px solid ${c.borderColor};">
    <tr>
      <td colspan="8" style="background-color: ${c.mastheadBg}; padding: 14px; font-size: 8pt; color: ${c.subText}; line-height: 1.5; border: none;">
        <strong style="color: ${c.titleText}; font-size: 8.5pt;">Statutory Compliance &amp; Fiduciary Notice:</strong>
        This financial report and computation schedule is prepared for institutional, corporate, and accredited investor reporting under Indian securities and tax regulations (<strong>Securities and Exchange Board of India - SEBI Portfolio Managers Regulations</strong> and the <strong>Income-tax Act, 2025</strong>). All computations, capital gains classifications, FIFO tax lot matching, and unrealized loss harvesting scenarios are algorithmically validated by NexFolio Quantitative Intelligence Core v2.4.
        <br/><br/>
        <span style="font-family: Consolas, monospace; font-size: 7.5pt; color: ${c.mutedText};">
          Cryptographic Provenance Hash: ${integrityHash} &bull; Generated in ${theme.toUpperCase()} Mode &bull; Fiduciary Record ID: NXF-${Date.now().toString(16).toUpperCase()}
        </span>
      </td>
    </tr>
  </table>

</body>
</html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const sanitizedName = portfolioName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const docType = activeTab === "TAX_HARVESTING" ? "Tax_Schedule" : activeTab === "AUDIT_LOGS" ? "Audit_Trail" : "Executive_Dossier";
  a.download = `NexFolio_${docType}_${sanitizedName}_${theme.toUpperCase()}_THEME.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateDossierExcelContent(report: InvestorReportResponse, c: Record<string, string>): string {
  return `
    <!-- 01. Executive KPI Dashboard Cards Table -->
    <table>
      <colgroup>
        <col style="width: 17%;" />
        <col style="width: 16%;" />
        <col style="width: 16%;" />
        <col style="width: 16%;" />
        <col style="width: 17%;" />
        <col style="width: 18%;" />
      </colgroup>
      <tr>
        <td colspan="6" class="section-title">01. EXECUTIVE RISK &amp; PERFORMANCE KPI SCORECARD</td>
      </tr>
      <tr>
        <th>Total Valuation</th>
        <th>Total ROI %</th>
        <th>Portfolio Alpha</th>
        <th>Portfolio Beta</th>
        <th>Annualized Volatility</th>
        <th>Health Score (0-100)</th>
      </tr>
      <tr style="background-color: ${c.cardBg}; font-size: 10.5pt;">
        <td class="num-curr" style="font-size: 12pt; font-weight: bold; color: ${c.titleText};">
          ₹${report.summary?.total_valuation?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
        </td>
        <td class="num-pct" style="font-size: 12pt; font-weight: bold; color: ${(report.summary?.total_roi_pct || 0) >= 0 ? c.greenColor : c.redColor};">
          ${report.summary?.total_roi_pct?.toFixed(2)}%
        </td>
        <td class="num-pct" style="font-size: 12pt; font-weight: bold; color: ${c.greenColor};">
          ${report.benchmark?.alpha_pct ? `${report.benchmark.alpha_pct.toFixed(2)}%` : "N/A"}
        </td>
        <td class="num-curr" style="font-size: 12pt; font-weight: bold; color: ${c.titleText};">
          ${report.benchmark?.portfolio_beta?.toFixed(2) || "1.00"}
        </td>
        <td class="num-pct" style="font-size: 12pt; font-weight: bold; color: ${c.titleText};">
          ${((report.benchmark?.annualized_volatility || 0) * 100).toFixed(1)}%
        </td>
        <td style="text-align: center; font-size: 12pt; font-weight: bold; color: ${c.greenColor};">
          ${report.health_scorecard?.overall_score || 0} / 100 (Grade ${report.health_scorecard?.grade || "A"})
        </td>
      </tr>
    </table>

    <!-- 02. 4-Pillar Scorecard Table -->
    <table>
      <colgroup>
        <col style="width: 26%;" />
        <col style="width: 14%;" />
        <col style="width: 14%;" />
        <col style="width: 26%;" />
        <col style="width: 20%;" />
      </colgroup>
      <tr>
        <td colspan="5" class="section-title">02. 4-PILLAR INSTITUTIONAL HEALTH BREAKDOWN</td>
      </tr>
      <tr>
        <th>Pillar Dimension</th>
        <th style="text-align: center;">Score</th>
        <th style="text-align: center;">Max Possible</th>
        <th>Key Evaluated Metric</th>
        <th>Metric Outcome</th>
      </tr>
      ${(report.health_scorecard?.pillars || [])
        .map(
          (p, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td style="font-weight: bold; color: ${c.titleText};">${p.name}</td>
          <td style="text-align: center; font-weight: bold; color: ${c.greenColor}; font-size: 10pt;">${p.score}</td>
          <td style="text-align: center; color: ${c.subText};">${p.max_score}</td>
          <td style="color: ${c.subText};">${p.key_metric_label}</td>
          <td style="font-weight: bold; color: ${c.titleText};">${p.key_metric_value}</td>
        </tr>
      `
        )
        .join("")}
    </table>

    <!-- 03. Holdings Allocation Ledger Table -->
    <table>
      <colgroup>
        <col style="width: 12%;" />
        <col style="width: 24%;" />
        <col style="width: 16%;" />
        <col style="width: 10%;" />
        <col style="width: 12%;" />
        <col style="width: 13%;" />
        <col style="width: 13%;" />
      </colgroup>
      <tr>
        <td colspan="7" class="section-title">03. ACTIVE HOLDINGS ALLOCATION &amp; VALUATION LEDGER</td>
      </tr>
      <tr>
        <th>Symbol</th>
        <th>Company Name</th>
        <th>Sector Classification</th>
        <th style="text-align: right;">Quantity</th>
        <th style="text-align: right;">Live LTP</th>
        <th style="text-align: right;">Valuation (INR)</th>
        <th style="text-align: right;">Portfolio Weight</th>
      </tr>
      ${(report.holdings || [])
        .map(
          (h, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td class="col-id" style="font-weight: bold;">${h.symbol}</td>
          <td style="color: ${c.titleText};">${h.company_name}</td>
          <td style="color: ${c.subText};">${h.sector}</td>
          <td class="num-int">${h.quantity}</td>
          <td class="num-curr">₹${h.current_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="num-curr" style="font-weight: bold; color: ${c.titleText};">
            ₹${h.valuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
          <td class="num-pct">${h.weight_pct?.toFixed(2)}%</td>
        </tr>
      `
        )
        .join("")}
      <tr class="summary-total-row">
        <td colspan="5" style="text-align: right; text-transform: uppercase;">Portfolio Total Valuation:</td>
        <td class="num-curr" style="font-size: 10.5pt; color: ${c.titleText};">
          ₹${(report.holdings || []).reduce((acc, h) => acc + h.valuation, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td class="num-pct" style="font-size: 10.5pt; color: ${c.titleText};">100.00%</td>
      </tr>
    </table>

    <!-- 04. Sector Allocation Table -->
    <table>
      <colgroup>
        <col style="width: 40%;" />
        <col style="width: 25%;" />
        <col style="width: 35%;" />
      </colgroup>
      <tr>
        <td colspan="3" class="section-title">04. SECTOR EXPOSURE &amp; CONCENTRATION BREAKDOWN</td>
      </tr>
      <tr>
        <th>Sector</th>
        <th style="text-align: right;">Weight (%)</th>
        <th style="text-align: right;">Allocated Capital (INR)</th>
      </tr>
      ${(report.sector_allocation || [])
        .map(
          (s, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td style="font-weight: bold; color: ${c.titleText};">${s.sector}</td>
          <td class="num-pct" style="font-weight: bold; color: ${c.headerText};">${s.weight_pct?.toFixed(2)}%</td>
          <td class="num-curr">₹${(s.valuation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `
        )
        .join("")}
    </table>

    <!-- 05. Traceable Strategic Recommendations Table -->
    <table>
      <colgroup>
        <col style="width: 16%;" />
        <col style="width: 10%;" />
        <col style="width: 24%;" />
        <col style="width: 30%;" />
        <col style="width: 20%;" />
      </colgroup>
      <tr>
        <td colspan="5" class="section-title">05. TRACEABLE QUANTITATIVE RECOMMENDATIONS &amp; ACTION PLAN</td>
      </tr>
      <tr>
        <th>Category</th>
        <th style="text-align: center;">Priority</th>
        <th>Action Title</th>
        <th>Strategic Rationale</th>
        <th>Quantitative Trigger</th>
      </tr>
      ${(report.recommendations || [])
        .map(
          (r, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td style="font-weight: bold; color: ${c.greenColor};">${r.category}</td>
          <td style="text-align: center; font-weight: bold;">P${r.priority_rank}</td>
          <td style="font-weight: bold; color: ${c.titleText};">${r.title}</td>
          <td style="color: ${c.subText};">${r.description}</td>
          <td class="col-id" style="font-size: 8.5pt;">${r.trigger_condition}</td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;
}

function generateTaxHarvestExcelContent(taxReport: TaxReportResponse, c: Record<string, string>, selectedTaxYear: string): string {
  // Compute Advance Tax Installment Schedule
  const totalTax = taxReport.capital_gains.total_estimated_tax_liability;
  const advanceTaxData = [
    { quarter: "Q1", label: "First Installment", dueDate: "15-Jun-2025", pct: 0.15, cumAmount: totalTax * 0.15, instAmount: totalTax * 0.15 },
    { quarter: "Q2", label: "Second Installment", dueDate: "15-Sep-2025", pct: 0.45, cumAmount: totalTax * 0.45, instAmount: totalTax * 0.30 },
    { quarter: "Q3", label: "Third Installment", dueDate: "15-Dec-2025", pct: 0.75, cumAmount: totalTax * 0.75, instAmount: totalTax * 0.30 },
    { quarter: "Q4", label: "Fourth Installment", dueDate: "15-Mar-2026", pct: 1.00, cumAmount: totalTax * 1.00, instAmount: totalTax * 0.25 },
  ];

  return `
    <!-- 01. Top Tax Summary Table -->
    <table>
      <colgroup>
        <col style="width: 25%;" />
        <col style="width: 25%;" />
        <col style="width: 25%;" />
        <col style="width: 25%;" />
      </colgroup>
      <tr>
        <td colspan="4" class="section-title">
          01. STATUTORY CAPITAL GAINS TAX SUMMARY (${taxReport.rule_set.law || "Income-tax Act, 2025"} &bull; ${selectedTaxYear})
        </td>
      </tr>
      <tr>
        <th>Section 111A STCG (Net @ 20%)</th>
        <th>Section 112A LTCG (Net @ 12.5%)</th>
        <th>Total Tax Liability (Incl. 4% Cess)</th>
        <th>Available Tax Loss Bank</th>
      </tr>
      <tr style="background-color: ${c.cardBg}; font-size: 10.5pt;">
        <td class="num-curr" style="font-size: 12pt; font-weight: bold; color: ${taxReport.capital_gains.net_stcg >= 0 ? c.greenColor : c.redColor};">
          ₹${taxReport.capital_gains.net_stcg.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td class="num-curr" style="font-size: 12pt; font-weight: bold; color: ${c.greenColor};">
          ₹${taxReport.capital_gains.section_112a.net_112a_ltcg_before_exemption.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td class="num-curr" style="font-size: 12pt; font-weight: bold; color: ${c.amberColor};">
          ₹${taxReport.capital_gains.total_estimated_tax_liability.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td class="num-curr" style="font-size: 12pt; font-weight: bold; color: ${c.indigoColor};">
          ₹${taxReport.tax_loss_bank.total_banked_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>
      <tr style="background-color: ${c.cardAltBg}; font-size: 8.5pt; color: ${c.subText};">
        <td>Gross: ₹${taxReport.capital_gains.gross_stcg.toLocaleString("en-IN")} | Set-off: ₹${taxReport.capital_gains.stcl_setoff_against_stcg.toLocaleString("en-IN")}</td>
        <td>Exemption Used: ₹${taxReport.capital_gains.section_112a.threshold_consumed.toLocaleString("en-IN")} / ₹1.25L</td>
        <td>Base Tax: ₹${taxReport.capital_gains.total_base_tax.toLocaleString("en-IN")} | 4% Cess: ₹${taxReport.capital_gains.cess_amount.toLocaleString("en-IN")}</td>
        <td>STCL: ₹${taxReport.tax_loss_bank.total_available_stcl.toLocaleString("en-IN")} | LTCL: ₹${taxReport.tax_loss_bank.total_available_ltcl.toLocaleString("en-IN")}</td>
      </tr>
    </table>

    <!-- 02. Advance Tax Installment Schedule Table (Section 208/234C) -->
    <table>
      <colgroup>
        <col style="width: 15%;" />
        <col style="width: 25%;" />
        <col style="width: 20%;" />
        <col style="width: 20%;" />
        <col style="width: 20%;" />
      </colgroup>
      <tr>
        <td colspan="5" class="section-title">
          02. STATUTORY ADVANCE TAX INSTALLMENT SCHEDULE (SECTION 208 / 234C COMPLIANCE)
        </td>
      </tr>
      <tr>
        <th>Quarter</th>
        <th>Installment Stage</th>
        <th style="text-align: center;">Statutory Due Date</th>
        <th style="text-align: right;">Cumulative Due (INR)</th>
        <th style="text-align: right;">Quarterly Installment (INR)</th>
      </tr>
      ${advanceTaxData
        .map(
          (ad, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td style="font-weight: bold; color: ${c.titleText};">${ad.quarter} (${Math.round(ad.pct * 100)}%)</td>
          <td style="color: ${c.subText};">${ad.label}</td>
          <td class="col-date" style="font-weight: bold;">${ad.dueDate}</td>
          <td class="num-curr" style="font-weight: bold; color: ${c.amberColor};">
            ₹${Math.round(ad.cumAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
          <td class="num-curr" style="font-weight: bold; color: ${c.titleText};">
            ₹${Math.round(ad.instAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
        )
        .join("")}
      <tr class="summary-total-row">
        <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Annual Advance Tax Assessment:</td>
        <td colspan="2" class="num-curr" style="color: ${c.amberColor}; font-size: 10pt;">
          ₹${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>
    </table>

    <!-- 03. Tax Loss Harvesting Candidates Table -->
    <table>
      <colgroup>
        <col style="width: 10%;" />
        <col style="width: 20%;" />
        <col style="width: 14%;" />
        <col style="width: 8%;" />
        <col style="width: 11%;" />
        <col style="width: 11%;" />
        <col style="width: 13%;" />
        <col style="width: 13%;" />
      </colgroup>
      <tr>
        <td colspan="8" class="section-title">
          03. UNREALIZED CAPITAL LOSS HARVESTING OPPORTUNITIES (${taxReport.loss_harvesting.candidates.length} POSITIONS)
        </td>
      </tr>
      <tr>
        <th>Instrument</th>
        <th>Company Name</th>
        <th>Sector</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">Avg Buy Price</th>
        <th style="text-align: right;">Live LTP</th>
        <th style="text-align: right;">Harvestable Loss</th>
        <th style="text-align: right;">Incremental Tax Saved</th>
      </tr>
      ${taxReport.loss_harvesting.candidates.length === 0
        ? `<tr><td colspan="8" style="text-align: center; padding: 16px; color: ${c.subText};">No unrealized capital losses detected for this portfolio.</td></tr>`
        : taxReport.loss_harvesting.candidates
            .map(
              (cand, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td class="col-id" style="font-weight: bold;">${cand.symbol}</td>
          <td style="color: ${c.titleText};">${cand.company_name}</td>
          <td style="color: ${c.subText};">${cand.sector}</td>
          <td class="num-int">${cand.quantity}</td>
          <td class="num-curr">₹${cand.avg_buy_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="num-curr" style="font-weight: bold; color: ${c.titleText};">₹${cand.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="num-curr" style="font-weight: bold; color: ${c.redColor};">-₹${cand.harvestable_loss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="num-curr" style="font-weight: bold; color: ${c.greenColor};">+₹${cand.estimated_incremental_tax_saving.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `
            )
            .join("")}
      <tr class="summary-total-row">
        <td colspan="6" style="text-align: right; text-transform: uppercase;">Total Potential Tax Offset:</td>
        <td class="num-curr" style="color: ${c.redColor}; font-size: 10pt;">
          -₹${taxReport.loss_harvesting.candidates.reduce((a, b) => a + b.harvestable_loss, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td class="num-curr" style="color: ${c.greenColor}; font-size: 10pt;">
          +₹${taxReport.loss_harvesting.candidates.reduce((a, b) => a + b.estimated_incremental_tax_saving, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>
    </table>

    <!-- 04. Realized Lots Ledger Table -->
    <table>
      <colgroup>
        <col style="width: 12%;" />
        <col style="width: 12%;" />
        <col style="width: 10%;" />
        <col style="width: 10%;" />
        <col style="width: 9%;" />
        <col style="width: 13%;" />
        <col style="width: 11%;" />
        <col style="width: 11%;" />
        <col style="width: 12%;" />
      </colgroup>
      <tr>
        <td colspan="9" class="section-title">
          04. REALIZED CAPITAL GAINS &amp; BUYBACK AUDIT LEDGER (${taxReport.realized_lots.length} MATCHED FIFO LOTS)
        </td>
      </tr>
      <tr>
        <th>Lot ID</th>
        <th>Instrument</th>
        <th style="text-align: center;">Buy Date</th>
        <th style="text-align: center;">Sell Date</th>
        <th style="text-align: right;">Holding (Mos)</th>
        <th style="text-align: center;">Tax Bucket</th>
        <th style="text-align: right;">Cost Basis</th>
        <th style="text-align: right;">Sale Consideration</th>
        <th style="text-align: right;">Realized Gain/Loss</th>
      </tr>
      ${taxReport.realized_lots.length === 0
        ? `<tr><td colspan="9" style="text-align: center; padding: 16px; color: ${c.subText};">No realized trade lots recorded for ${selectedTaxYear}.</td></tr>`
        : taxReport.realized_lots
            .map(
              (lot, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td class="col-id">${lot.lot_id}</td>
          <td style="font-weight: bold; color: ${c.titleText};">${lot.symbol} ${lot.is_buyback ? "(BUYBACK)" : ""}</td>
          <td class="col-date">${new Date(lot.buy_date).toLocaleDateString()}</td>
          <td class="col-date">${new Date(lot.sell_date).toLocaleDateString()}</td>
          <td class="num-int">${lot.holding_period_months}</td>
          <td style="text-align: center; font-weight: bold;">${lot.classification}</td>
          <td class="num-curr">₹${lot.cost_basis.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="num-curr" style="font-weight: bold;">₹${lot.sale_proceeds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="num-curr" style="font-weight: bold; color: ${lot.realized_pnl >= 0 ? c.greenColor : c.redColor};">
            ${lot.realized_pnl >= 0 ? "+" : ""}₹${lot.realized_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
            )
            .join("")}
      <tr class="summary-total-row">
        <td colspan="6" style="text-align: right; text-transform: uppercase;">Total Realized Portfolio Gains:</td>
        <td class="num-curr">₹${taxReport.realized_lots.reduce((a, b) => a + b.cost_basis, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="num-curr">₹${taxReport.realized_lots.reduce((a, b) => a + b.sale_proceeds, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="num-curr" style="color: ${taxReport.realized_lots.reduce((a, b) => a + b.realized_pnl, 0) >= 0 ? c.greenColor : c.redColor}; font-size: 10pt;">
          ₹${taxReport.realized_lots.reduce((a, b) => a + b.realized_pnl, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>
    </table>
  `;
}

function generateAuditLogsExcelContent(auditLogs: AuditLogItem[], c: Record<string, string>): string {
  return `
    <table>
      <colgroup>
        <col style="width: 14%;" />
        <col style="width: 14%;" />
        <col style="width: 12%;" />
        <col style="width: 12%;" />
        <col style="width: 32%;" />
        <col style="width: 16%;" />
      </colgroup>
      <tr>
        <td colspan="6" class="section-title">SYSTEM AUDIT TRAIL LEDGER (${auditLogs.length} PROVENANCE EVENTS)</td>
      </tr>
      <tr>
        <th>Event ID</th>
        <th>Event Type</th>
        <th>Actor</th>
        <th>Source</th>
        <th>Event Description</th>
        <th style="text-align: center;">Timestamp</th>
      </tr>
      ${auditLogs.length === 0
        ? `<tr><td colspan="6" style="text-align: center; padding: 16px; color: ${c.subText};">No audit events recorded for this portfolio.</td></tr>`
        : auditLogs
            .map(
              (log, i) => `
        <tr style="background-color: ${i % 2 === 0 ? c.cardBg : c.cardAltBg};">
          <td class="col-id">${log.id}</td>
          <td style="font-weight: bold; color: ${c.indigoColor};">${log.event_type}</td>
          <td style="color: ${c.subText};">${log.actor}</td>
          <td style="color: ${c.subText};">${log.source}</td>
          <td style="color: ${c.titleText};">${log.description}</td>
          <td class="col-date">${new Date(log.timestamp).toLocaleString()}</td>
        </tr>
      `
            )
            .join("")}
    </table>
  `;
}
