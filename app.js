// ========== CONSTANTES Y ESTADO ==========
const LS_KEY = "wcAnalyzer_pro_v1";

const state = {
  companyName: "",
  currency: "USD",
  industry: "oilgas",
  metrics: null,
  inputMode: "advanced",
  wacc: 10,
  ebitdaMargin: 15
};

// Benchmarks por industria
const INDUSTRY_BENCHMARKS = {
  oilgas: {
    name: "Oil & Gas Services",
    dso: { min: 55, max: 70, optimal: 85 },
    dio: { min: 40, optimal: 55, max: 75 },
    dpo: { min: 40, optimal: 55, max: 70 },
    ccc: { min: 30, optimal: 70, max: 110 }
  },
  manufacturing: {
    name: "Manufacturing",
    dso: { min: 40, optimal: 50, max: 65 },
    dio: { min: 50, optimal: 70, max: 90 },
    dpo: { min: 35, optimal: 45, max: 55 },
    ccc: { min: 50, optimal: 75, max: 100 }
  },
  distribution: {
    name: "Distribution",
    dso: { min: 30, optimal: 40, max: 50 },
    dio: { min: 30, optimal: 42, max: 55 },
    dpo: { min: 30, optimal: 40, max: 50 },
    ccc: { min: 25, optimal: 40, max: 60 }
  },
  retail: {
    name: "Retail",
    dso: { min: 0, optimal: 10, max: 20 },
    dio: { min: 40, optimal: 60, max: 80 },
    dpo: { min: 25, optimal: 35, max: 45 },
    ccc: { min: 10, optimal: 30, max: 60 }
  },
  tech: {
    name: "Technology",
    dso: { min: 45, optimal: 60, max: 75 },
    dio: { min: 0, optimal: 5, max: 20 },
    dpo: { min: 30, optimal: 45, max: 60 },
    ccc: { min: -10, optimal: 15, max: 40 }
  }
};

// ========== UTILIDADES ==========
function parseNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function formatMoney(value, currency = "USD") {
  if (value === null || isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${currency} ${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDays(value) {
  if (value === null || isNaN(value)) return "—";
  return `${value.toFixed(1)}`;
}

function formatPercentFromDecimal(value) {
  if (value === null || isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatPercent(value) {
  if (value === null || isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

// ========== CÁLCULOS BÁSICOS ==========
function calcDSO(cxc, ventasAnuales) {
  if (ventasAnuales === 0) return 0;
  return (cxc / ventasAnuales) * 365;
}

function calcDIO(inventario, cogsAnual) {
  if (cogsAnual === 0) return 0;
  return (inventario / cogsAnual) * 365;
}

function calcDPO(cxp, cogsAnual) {
  if (cogsAnual === 0) return 0;
  return (cxp / cogsAnual) * 365;
}

function calcCCC(dso, dio, dpo) {
  return dso + dio - dpo;
}

function calcNWC(cxc, inventario, cxp) {
  return cxc + inventario - cxp;
}

function calcRatiosNWC(cxc, inventario, cxp, ventas, cogs) {
  const nwc = calcNWC(cxc, inventario, cxp);
  return {
    ratioCxcVentas: ventas === 0 ? 0 : cxc / ventas,
    ratioInvCogs: cogs === 0 ? 0 : inventario / cogs,
    ratioCxpCogs: cogs === 0 ? 0 : cxp / cogs,
    ratioNwcVentas: ventas === 0 ? 0 : nwc / ventas,
  };
}

function calcLiquidityMetrics(cash, cxc, inventario, cxp, otrosPasivos) {
  const activosCorrientes = cash + cxc + inventario;
  const pasivosCorrientes = cxp + otrosPasivos;

  if (pasivosCorrientes <= 0 || activosCorrientes <= 0) {
    return { currentRatio: null, quickRatio: null };
  }

  return {
    currentRatio: activosCorrientes / pasivosCorrientes,
    quickRatio: (cash + cxc) / pasivosCorrientes
  };
}

function calcNWCRequerido(ventasActuales, cogsActual, crecimientoVentas, ratioCxcVentas, ratioInvCogs, ratioCxpCogs) {
  const ventasFuturas = ventasActuales * (1 + crecimientoVentas);
  const cogsFuturo = cogsActual * (1 + crecimientoVentas);

  const cxcFuturo = ratioCxcVentas * ventasFuturas;
  const invFuturo = ratioInvCogs * cogsFuturo;
  const cxpFuturo = ratioCxpCogs * cogsFuturo;

  const nwcFuturo = calcNWC(cxcFuturo, invFuturo, cxpFuturo);

  return { ventasFuturas, cogsFuturo, cxcFuturo, invFuturo, cxpFuturo, nwcFuturo };
}

function simulateWorkingCapital(ventasAnuales, cogsAnual, dsoActual, dioActual, dpoActual, dsoNuevo, dioNuevo, dpoNuevo) {
  const ventasPorDia = ventasAnuales / 365;
  const cogsPorDia = cogsAnual / 365;

  const cxcActual = ventasPorDia * dsoActual;
  const invActual = cogsPorDia * dioActual;
  const cxpActual = cogsPorDia * dpoActual;
  const nwcActual = calcNWC(cxcActual, invActual, cxpActual);
  const cccActual = calcCCC(dsoActual, dioActual, dpoActual);

  const cxcNuevo = ventasPorDia * dsoNuevo;
  const invNuevo = cogsPorDia * dioNuevo;
  const cxpNuevo = cogsPorDia * dpoNuevo;
  const nwcNuevo = calcNWC(cxcNuevo, invNuevo, cxpNuevo);
  const cccNuevo = calcCCC(dsoNuevo, dioNuevo, dpoNuevo);

  const cashLiberado = nwcActual - nwcNuevo;

  return { cccActual, cccNuevo, nwcActual, nwcNuevo, cashLiberado };
}

// ========== CLASIFICACIONES ==========
function classifyCCC(ccc) {
  if (ccc <= 0) return { label: "Muy defensivo", type: "good", position: 5 };
  if (ccc <= 40) return { label: "Sano", type: "good", position: 25 };
  if (ccc <= 80) return { label: "A vigilar", type: "warn", position: 55 };
  if (ccc <= 150) return { label: "Tenso", type: "bad", position: 80 };
  return { label: "Muy tenso", type: "bad", position: 95 };
}

function classifyNwcSales(ratio) {
  if (ratio < 0.05) return { label: "Ligero", type: "good" };
  if (ratio < 0.25) return { label: "Moderado", type: "warn" };
  return { label: "Pesado", type: "bad" };
}

function classifyLiquidity(currentRatio, quickRatio) {
  if (currentRatio === null || quickRatio === null) {
    return {
      text: "Ingresa efectivo y otros pasivos corrientes para ver ratios de liquidez.",
      badge: "—",
      type: "neutral"
    };
  }

  let text = `Current ratio: ${currentRatio.toFixed(2)} · Quick ratio: ${quickRatio.toFixed(2)}. `;
  let badge = "";
  let type = "neutral";

  if (currentRatio < 1) {
    badge = "Ajustada";
    type = "bad";
    text += "Pasivos corrientes similares o mayores a activos corrientes.";
  } else if (currentRatio >= 1 && currentRatio < 2) {
    badge = "Aceptable";
    type = "warn";
    text += "Nivel de liquidez razonable.";
  } else {
    badge = "Sólida";
    type = "good";
    text += "Buena capacidad para responder obligaciones de corto plazo.";
  }

  return { text, badge, type };
}

function detectMainLever(metrics) {
  const { cxc, inv, cxp, ccc, sales, cogs } = metrics;

  if (sales <= 0 || cogs <= 0) {
    return {
      title: "Completa tus datos",
      detail: "Carga ventas y COGS para analizar dónde está tu mayor palanca."
    };
  }

  const cxcPeso = Math.abs(cxc);
  const invPeso = Math.abs(inv);
  const cxpPeso = Math.abs(cxp);

  if (ccc <= 0) {
    return {
      title: "Posición defensiva",
      detail: "Tu CCC es cercano a cero o negativo. Cobras y giras inventarios rápido."
    };
  }

  if (cxcPeso >= invPeso && cxcPeso >= cxpPeso) {
    return {
      title: "Enfócate en DSO (cobros)",
      detail: "Las cuentas por cobrar son el componente más pesado. Prioriza cobranza."
    };
  } else if (invPeso >= cxcPeso && invPeso >= cxpPeso) {
    return {
      title: "Enfócate en DIO (inventario)",
      detail: "El inventario representa la mayor parte. Evalúa rotación y demanda."
    };
  }
  return {
    title: "Enfócate en DPO (proveedores)",
    detail: "Negociar mejores plazos puede ayudar a reducir la tensión de caja."
  };
}

// ========== BENCHMARKS ==========
function compareToBenchmark(value, benchmark) {
  const mid = (benchmark.min + benchmark.max) / 2;
  const range = benchmark.max - benchmark.min;
  
  if (value <= benchmark.min) {
    return { status: "Excelente", type: "good", percentage: 100 };
  } else if (value <= mid) {
    const pct = 100 - ((value - benchmark.min) / (mid - benchmark.min)) * 30;
    return { status: "Bueno", type: "good", percentage: Math.max(70, pct) };
  } else if (value <= benchmark.max) {
    const pct = 70 - ((value - mid) / (benchmark.max - mid)) * 40;
    return { status: "Moderado", type: "warn", percentage: Math.max(30, pct) };
  } else {
    const pct = Math.max(10, 30 - ((value - benchmark.max) / range) * 20);
    return { status: "Por mejorar", type: "bad", percentage: pct };
  }
}

function buildBenchmarkInsights(metrics, industry) {
  const bench = INDUSTRY_BENCHMARKS[industry];
  if (!metrics || !bench) return "Calcula tus métricas para ver el análisis comparativo.";

  const dsoComp = compareToBenchmark(metrics.dso, bench.dso);
  const dioComp = compareToBenchmark(metrics.dio, bench.dio);
  const dpoComp = compareToBenchmark(metrics.dpo, bench.dpo);
  const cccComp = compareToBenchmark(metrics.ccc, bench.ccc);

  let insights = `Comparado con la industria ${bench.name}: `;

  const parts = [];
  
  if (dsoComp.type === "bad") {
    parts.push(`tu DSO de ${formatDays(metrics.dso)} días está por encima del rango típico (${bench.dso.min}-${bench.dso.max} días), indicando cobros más lentos que el promedio`);
  } else if (dsoComp.type === "good") {
    parts.push(`tu DSO de ${formatDays(metrics.dso)} días es excelente, dentro o por debajo del rango de la industria`);
  }

  if (dioComp.type === "bad") {
    parts.push(`tu DIO de ${formatDays(metrics.dio)} días supera el rango típico, sugiriendo inventario excesivo o lenta rotación`);
  } else if (dioComp.type === "good") {
    parts.push(`tu DIO de ${formatDays(metrics.dio)} días muestra buena rotación de inventario`);
  }

  if (cccComp.type === "bad") {
    parts.push(`tu CCC de ${formatDays(metrics.ccc)} días indica un ciclo más largo que el promedio, amarrando más capital que tus competidores`);
  } else if (cccComp.type === "good") {
    parts.push(`tu CCC de ${formatDays(metrics.ccc)} días es competitivo o superior al promedio de la industria`);
  }

  insights += parts.join("; ") + ".";

  return insights;
}

// ========== SCORECARD ==========
function calculateScorecard(metrics, industry) {
  if (!metrics) return null;

  const bench = INDUSTRY_BENCHMARKS[industry];
  
  // CCC Score (0-100)
  const cccComp = compareToBenchmark(metrics.ccc, bench.ccc);
  const cccScore = Math.round(cccComp.percentage);

  // Cash Efficiency Score
  const nwcRatio = metrics.ratios.ratioNwcVentas;
  let efficiencyScore = 100;
  if (nwcRatio > 0.35) efficiencyScore = 40;
  else if (nwcRatio > 0.25) efficiencyScore = 60;
  else if (nwcRatio > 0.15) efficiencyScore = 75;
  else if (nwcRatio > 0.10) efficiencyScore = 85;

  // Liquidity Score
  const { currentRatio, quickRatio } = calcLiquidityMetrics(
    metrics.cash, metrics.cxc, metrics.inv, metrics.cxp, metrics.otherLiab
  );
  
  let liquidityScore = 50;
  if (currentRatio !== null) {
    if (currentRatio < 1) liquidityScore = 30;
    else if (currentRatio < 1.5) liquidityScore = 60;
    else if (currentRatio < 2) liquidityScore = 80;
    else if (currentRatio < 3) liquidityScore = 95;
    else liquidityScore = 75;
  }

  const totalScore = Math.round((cccScore + efficiencyScore + liquidityScore) / 3);

  return {
    cccScore,
    efficiencyScore,
    liquidityScore,
    totalScore
  };
}

function getScoreLabel(score) {
  if (score >= 85) return { text: "Excelente", color: "#16a34a" };
  if (score >= 70) return { text: "Bueno", color: "#22c55e" };
  if (score >= 50) return { text: "Aceptable", color: "#f59e0b" };
  if (score >= 30) return { text: "Mejorable", color: "#f97316" };
  return { text: "Crítico", color: "#dc2626" };
}

function buildScorecardInsights(scorecard) {
  if (!scorecard) return "Calcula tus métricas para ver tu scorecard.";

  const total = scorecard.totalScore;
  let msg = `Tu score total es ${total}/100, clasificado como "${getScoreLabel(total).text}". `;

  if (total >= 80) {
    msg += "Excelente gestión de capital de trabajo. Mantén estas prácticas y busca optimizaciones marginales.";
  } else if (total >= 60) {
    msg += "Gestión sólida con oportunidades de mejora. Enfócate en las áreas con menor puntuación.";
  } else if (total >= 40) {
    msg += "Hay oportunidades significativas de mejora. Prioriza las métricas más débiles.";
  } else {
    msg += "Se requiere acción inmediata. El capital de trabajo está limitando tu flexibilidad financiera.";
  }

  return msg;
}

// ========== GROWTH CAPACITY ==========
function calculateSGR(metrics) {
  if (!metrics || metrics.sales === 0) return null;

  const nwcRatio = metrics.ratios.ratioNwcVentas;
  
  let sgr = 0;
  if (nwcRatio > 0 && nwcRatio < 1) {
    sgr = (1 / (1 + nwcRatio)) * 100 - 20;
    sgr = Math.max(0, Math.min(100, sgr));
  }

  return sgr;
}

function buildGrowthInsights(metrics, plannedGrowth, sgr) {
  if (!metrics || sgr === null) return "—";

  const planned = parseNumber(plannedGrowth);
  
  if (planned === 0) {
    return `Sin crecimiento planeado. Tu capacidad de crecimiento sostenible es aproximadamente ${formatPercent(sgr)} anual sin requerir financiamiento adicional para capital de trabajo.`;
  }

  if (planned <= sgr) {
    return `✅ Tu crecimiento planeado de ${formatPercent(planned)} está dentro de tu capacidad sostenible (${formatPercent(sgr)}). Puedes crecer sin necesitar financiamiento externo significativo para capital de trabajo.`;
  } else {
    const gap = planned - sgr;
    return `⚠️ Tu crecimiento planeado de ${formatPercent(planned)} excede tu capacidad sostenible (${formatPercent(sgr)}) por ${formatPercent(gap)}. Necesitarás financiamiento adicional o mejorar la eficiencia de capital de trabajo para lograr este crecimiento.`;
  }
}

// ========== VALUACIÓN ==========
function calculateValuationImpact(metrics, wacc, ebitdaMargin) {
  if (!metrics || wacc === 0) return null;

  const sales = metrics.sales;
  const cogs = metrics.cogs;
  const salesPerDay = sales / 365;
  const cogsPerDay = cogs / 365;

  const cashFromDSO = salesPerDay * 5;
  const valueFromDSO = (cashFromDSO * (ebitdaMargin / 100)) / (wacc / 100);

  const cashFromDIO = cogsPerDay * 5;
  const valueFromDIO = (cashFromDIO * (ebitdaMargin / 100)) / (wacc / 100);

  const cashFromDPO = cogsPerDay * 5;
  const valueFromDPO = (cashFromDPO * (ebitdaMargin / 100)) / (wacc / 100);

  const totalImpact = valueFromDSO + valueFromDIO + valueFromDPO;

  return {
    valueFromDSO,
    valueFromDIO,
    valueFromDPO,
    totalImpact
  };
}

// ========== INSIGHTS ==========
function buildInsights(metrics, currency) {
  if (!metrics) {
    return "Completa el formulario y calcula las métricas para ver el análisis automático.";
  }

  const { sales, dso, dio, dpo, ccc, nwc, ratios } = metrics;
  const { ratioNwcVentas } = ratios;

  const cccInfo = classifyCCC(ccc);
  const nwcInfo = classifyNwcSales(ratioNwcVentas);

  const diasVentas = sales / 365 || 0;
  const nwcEnDiasDeVentas = diasVentas === 0 ? 0 : nwc / diasVentas;

  const partes = [];

  partes.push(
    `Tu Cash Conversion Cycle (CCC) es de ${formatDays(ccc)} días, clasificado como "${cccInfo.label}".`
  );

  partes.push(
    `Tienes ${formatMoney(nwc, currency)} en capital de trabajo operativo, equivalentes a ${formatDays(nwcEnDiasDeVentas)} días de ventas.`
  );

  partes.push(
    `El NWC representa ${formatPercentFromDecimal(ratioNwcVentas)} de tus ventas anuales, perfil "${nwcInfo.label}".`
  );

  if (ccc > 0) {
    partes.push(
      `Reducir tus días de cobro, inventario o negociar más plazo con proveedores puede liberar caja significativo.`
    );
  }

  return partes.join(" ");
}

// ========== TABS ==========
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      tabContents.forEach((content) => {
        if (content.id === targetId) {
          content.classList.add("active");
        } else {
          content.classList.remove("active");
        }
      });
    });
  });
}

// ========== LOCALSTORAGE ==========
function saveToLocalStorage(payload) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("No se pudo guardar en localStorage", e);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("No se pudo leer localStorage", e);
    return null;
  }
}

// ========== DOM READY ==========
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("input-form");
  const formError = document.getElementById("form-error");
  const resetBtn = document.getElementById("reset-btn");

  const companyInput = document.getElementById("company-name");
  const currencyInput = document.getElementById("currency");
  const industrySelect = document.getElementById("industry");
  const periodicitySelect = document.getElementById("periodicity");

  const salesInput = document.getElementById("sales");
  const cogsInput = document.getElementById("cogs");
  const receivablesInput = document.getElementById("receivables");
  const inventoryInput = document.getElementById("inventory");
  const payablesInput = document.getElementById("payables");
  const growthInput = document.getElementById("growth");
  const waccInput = document.getElementById("wacc");
  const ebitdaMarginInput = document.getElementById("ebitda-margin");

  const cashInput = document.getElementById("cash");
  const otherLiabInput = document.getElementById("other-current-liab");

  const basicDSOInput = document.getElementById("basic-dso");
  const basicDIOInput = document.getElementById("basic-dio");
  const basicDPOInput = document.getElementById("basic-dpo");

  const advancedBlock = document.getElementById("advanced-block");
  const basicBlock = document.getElementById("basic-block");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const loadDemoBtn = document.getElementById("load-demo-btn");

  const companyLabel = document.getElementById("company-label");

  // Dashboard
  const kpiCCC = document.getElementById("kpi-ccc");
  const kpiNWC = document.getElementById("kpi-nwc");
  const kpiNWCSales = document.getElementById("kpi-nwc-sales");
  const kpiCycleBreakdown = document.getElementById("kpi-cycle-breakdown");
  const valDSO = document.getElementById("val-dso");
  const valDIO = document.getElementById("val-dio");
  const valDPO = document.getElementById("val-dpo");
  const valCCC = document.getElementById("val-ccc");

  const badgeCCC = document.getElementById("badge-ccc");
  const badgeNWC = document.getElementById("badge-nwc");
  const cccMeterFill = document.getElementById("ccc-meter-fill");

  const kpiLiquidityMain = document.getElementById("kpi-liquidity");
  const kpiLiquiditySub = document.getElementById("kpi-liquidity-sub");

  const kpiMainLever = document.getElementById("kpi-main-lever");
  const kpiMainLeverSub = document.getElementById("kpi-main-lever-sub");

  const insightsContent = document.getElementById("insights-content");

  // Benchmark
  const benchmarkWarning = document.getElementById("benchmark-warning");
  const benchmarkGrid = document.getElementById("benchmark-grid");
  const benchmarkInsights = document.getElementById("benchmark-insights");

  // Scorecard
  const scorecardWarning = document.getElementById("scorecard-warning");
  const scoreCCC = document.getElementById("score-ccc");
  const scoreCCCLabel = document.getElementById("score-ccc-label");
  const scoreEfficiency = document.getElementById("score-efficiency");
  const scoreEfficiencyLabel = document.getElementById("score-efficiency-label");
  const scoreLiquidity = document.getElementById("score-liquidity");
  const scoreLiquidityLabel = document.getElementById("score-liquidity-label");
  const scoreTotal = document.getElementById("score-total");
  const scoreTotalLabel = document.getElementById("score-total-label");
  const scorecardInsightsEl = document.getElementById("scorecard-insights");

  // Simulador
  const simWarning = document.getElementById("sim-warning");
  const sliderDSO = document.getElementById("slider-dso");
  const sliderDIO = document.getElementById("slider-dio");
  const sliderDPO = document.getElementById("slider-dpo");
  const sliderDSOValue = document.getElementById("slider-dso-value");
  const sliderDIOValue = document.getElementById("slider-dio-value");
  const sliderDPOValue = document.getElementById("slider-dpo-value");

  const simCCCActual = document.getElementById("sim-ccc-actual");
  const simCCCNew = document.getElementById("sim-ccc-new");
  const simCCCDelta = document.getElementById("sim-ccc-delta");
  const simNWCActual = document.getElementById("sim-nwc-actual");
  const simNWCNew = document.getElementById("sim-nwc-new");
  const simCashFreed = document.getElementById("sim-cash-freed");
  const simCashDays = document.getElementById("sim-cash-days");
  const exportSimCSVBtn = document.getElementById("export-sim-csv");

  // Proyección
  const growthWarning = document.getElementById("growth-warning");
  const sgrValue = document.getElementById("sgr-value");
  const plannedGrowthValue = document.getElementById("planned-growth-value");
  const sgrMessage = document.getElementById("sgr-message");
  
  const ratioCxcVentasEl = document.getElementById("ratio-cxc-ventas");
  const ratioInvCogsEl = document.getElementById("ratio-inv-cogs");
  const ratioCxpCogsEl = document.getElementById("ratio-cxp-cogs");
  const ratioNwcVentasEl = document.getElementById("ratio-nwc-ventas");
  const growthNwcActualEl = document.getElementById("growth-nwc-actual");
  const growthNwcNeededEl = document.getElementById("growth-nwc-needed");
  const growthExtraNwcEl = document.getElementById("growth-extra-nwc");
  const growthSalesFutureEl = document.getElementById("growth-sales-future");
  const growthCogsFutureEl = document.getElementById("growth-cogs-future");

  // Valuation
  const valuationWarning = document.getElementById("valuation-warning");
  const valImpactDSO = document.getElementById("val-impact-dso");
  const valImpactDIO = document.getElementById("val-impact-dio");
  const valImpactDPO = document.getElementById("val-impact-dpo");
  const valImpactTotal = document.getElementById("val-impact-total");

  const exportPdfBtn = document.getElementById("export-pdf-btn");

  setupTabs();

  // ===== HELPERS =====
  function clearInputErrors() {
    [salesInput, cogsInput, receivablesInput, inventoryInput, payablesInput, 
     growthInput, cashInput, otherLiabInput, basicDSOInput, basicDIOInput, basicDPOInput
    ].forEach((inp) => inp && inp.classList.remove("input-error"));
  }

  function resetOutputs() {
    companyLabel.textContent = "Sin datos aún";

    [kpiCCC, kpiNWC, kpiNWCSales, kpiCycleBreakdown, valDSO, valDIO, valDPO, valCCC, kpiLiquidityMain
    ].forEach((el) => {
      if (el) el.textContent = "—";
    });

    kpiLiquiditySub.textContent = "Current y quick ratio.";

    badgeCCC.textContent = "—";
    badgeCCC.className = "badge badge-neutral";
    badgeNWC.textContent = "—";
    badgeNWC.className = "badge badge-neutral";
    cccMeterFill.style.width = "0%";

    kpiMainLever.textContent = "Palanca principal";
    kpiMainLeverSub.textContent = "Te mostramos dónde enfocar primero.";

    insightsContent.textContent = "Completa el formulario para ver el análisis automático.";

    simWarning.style.display = "";
    benchmarkWarning.style.display = "";
    scorecardWarning.style.display = "";
    growthWarning.style.display = "";
    valuationWarning.style.display = "";

    benchmarkGrid.innerHTML = "";
    benchmarkInsights.textContent = "Los benchmarks te mostrarán cómo te comparas.";

    [simCCCActual, simCCCNew, simCCCDelta, simNWCActual, simNWCNew, simCashFreed, simCashDays
    ].forEach((el) => {
      if (el) el.textContent = "—";
    });

    [ratioCxcVentasEl, ratioInvCogsEl, ratioCxpCogsEl, ratioNwcVentasEl,
     growthNwcActualEl, growthNwcNeededEl, growthExtraNwcEl, 
     growthSalesFutureEl, growthCogsFutureEl
    ].forEach((el) => {
      if (el) el.textContent = "—";
    });

    sgrValue.textContent = "—";
    plannedGrowthValue.textContent = "—";
    sgrMessage.textContent = "—";

    scoreCCC.textContent = "—";
    scoreEfficiency.textContent = "—";
    scoreLiquidity.textContent = "—";
    scoreTotal.textContent = "—";
    scoreCCCLabel.textContent = "—";
    scoreEfficiencyLabel.textContent = "—";
    scoreLiquidityLabel.textContent = "—";
    scoreTotalLabel.textContent = "—";
    scorecardInsightsEl.textContent = "Calcula tus métricas para ver tu scorecard.";

    valImpactDSO.textContent = "—";
    valImpactDIO.textContent = "—";
    valImpactDPO.textContent = "—";
    valImpactTotal.textContent = "—";
  }

  // ===== MODO BÁSICO / AVANZADO =====
  function applyMode(mode) {
    state.inputMode = mode;
    modeButtons.forEach((btn) => {
      const btnMode = btn.getAttribute("data-mode");
      if (btnMode === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    if (mode === "advanced") {
      advancedBlock.classList.remove("hidden");
      basicBlock.classList.add("hidden");
    } else {
      advancedBlock.classList.add("hidden");
      basicBlock.classList.remove("hidden");
    }
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode") || "advanced";
      applyMode(mode);
    });
  });

  // ===== CARGAR DEMO =====
  loadDemoBtn.addEventListener("click", () => {
    applyMode("advanced");
    companyInput.value = "Demo Oil & Gas Co";
    currencyInput.value = "USD";
    industrySelect.value = "oilgas";
    periodicitySelect.value = "annual";

    salesInput.value = "2500000";
    cogsInput.value = "1500000";

    receivablesInput.value = "480000";
    inventoryInput.value = "230000";
    payablesInput.value = "200000";

    cashInput.value = "150000";
    otherLiabInput.value = "180000";

    growthInput.value = "15";
    waccInput.value = "10";
    ebitdaMarginInput.value = "18";

    basicDSOInput.value = "70";
    basicDIOInput.value = "56";
    basicDPOInput.value = "49";

    formError.textContent = "";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });

  // ===== UPDATE DASHBOARD =====
  function updateDashboard() {
    const metrics = state.metrics;
    if (!metrics) {
      resetOutputs();
      return;
    }

    const currency = state.currency || "USD";

    companyLabel.textContent = state.companyName
      ? `${state.companyName} · ${currency}`
      : "Sin datos aún";

    kpiCCC.textContent = `${formatDays(metrics.ccc)} días`;
    kpiNWC.textContent = formatMoney(metrics.nwc, currency);
    kpiNWCSales.textContent = formatPercentFromDecimal(metrics.ratios.ratioNwcVentas);
    kpiCycleBreakdown.textContent = `${formatDays(metrics.dso)} / ${formatDays(metrics.dio)} / ${formatDays(metrics.dpo)}`;

    valDSO.textContent = formatDays(metrics.dso);
    valDIO.textContent = formatDays(metrics.dio);
    valDPO.textContent = formatDays(metrics.dpo);
    valCCC.textContent = formatDays(metrics.ccc);

    const cccInfo = classifyCCC(metrics.ccc);
    badgeCCC.textContent = cccInfo.label;
    badgeCCC.className = "badge " + (cccInfo.type === "good" ? "badge-good" : 
                                     cccInfo.type === "warn" ? "badge-warn" : "badge-bad");
    const pos = Math.max(0, Math.min(100, cccInfo.position));
    cccMeterFill.style.width = `${pos}%`;

    const nwcInfo = classifyNwcSales(metrics.ratios.ratioNwcVentas);
    badgeNWC.textContent = nwcInfo.label;
    badgeNWC.className = "badge " + (nwcInfo.type === "good" ? "badge-good" : 
                                     nwcInfo.type === "warn" ? "badge-warn" : "badge-bad");

    const { currentRatio, quickRatio } = calcLiquidityMetrics(
      metrics.cash, metrics.cxc, metrics.inv, metrics.cxp, metrics.otherLiab
    );
    const lq = classifyLiquidity(currentRatio, quickRatio);
    if (currentRatio && quickRatio) {
      kpiLiquidityMain.textContent = `${currentRatio.toFixed(2)} / ${quickRatio.toFixed(2)}`;
    } else {
      kpiLiquidityMain.textContent = "—";
    }
    kpiLiquiditySub.textContent = lq.text;

    const lever = detectMainLever(metrics);
    kpiMainLever.textContent = lever.title;
    kpiMainLeverSub.textContent = lever.detail;

    insightsContent.textContent = buildInsights(metrics, currency);

    const kpiCards = document.querySelectorAll(".kpi-card");
    kpiCards.forEach((card) => {
      card.classList.remove("flash");
      void card.offsetWidth;
      card.classList.add("flash");
    });
  }

  // ===== UPDATE BENCHMARK =====
  function updateBenchmark() {
    const metrics = state.metrics;
    if (!metrics) {
      benchmarkWarning.style.display = "";
      benchmarkGrid.innerHTML = "";
      return;
    }
    benchmarkWarning.style.display = "none";

    const bench = INDUSTRY_BENCHMARKS[state.industry];
    const dsoComp = compareToBenchmark(metrics.dso, bench.dso);
    const dioComp = compareToBenchmark(metrics.dio, bench.dio);
    const dpoComp = compareToBenchmark(metrics.dpo, bench.dpo);
    const cccComp = compareToBenchmark(metrics.ccc, bench.ccc);

    const benchmarks = [
      { name: "DSO (Días de cobro)", value: metrics.dso, bench: bench.dso, comp: dsoComp },
      { name: "DIO (Días de inventario)", value: metrics.dio, bench: bench.dio, comp: dioComp },
      { name: "DPO (Días de pago)", value: metrics.dpo, bench: bench.dpo, comp: dpoComp, inverse: true },
      { name: "CCC (Cash Conversion Cycle)", value: metrics.ccc, bench: bench.ccc, comp: cccComp }
    ];

    benchmarkGrid.innerHTML = "";
    benchmarks.forEach((item) => {
      const card = document.createElement("div");
      card.className = "benchmark-card";

      const statusClass = item.comp.type;
      const barClass = statusClass;

      card.innerHTML = `
        <h4>${item.name}</h4>
        <div class="benchmark-comparison">
          <span style="font-weight: 600;">${formatDays(item.value)} días</span>
          <span style="color: var(--text-muted);">${item.comp.status}</span>
        </div>
        <div class="benchmark-bar">
          <div class="benchmark-fill ${barClass}" style="width: ${item.comp.percentage}%;"></div>
        </div>
        <p style="font-size: 0.7rem; margin: 0.2rem 0 0; color: var(--text-muted);">
          Industria: ${item.bench.min}-${item.bench.max} días
        </p>
      `;

      benchmarkGrid.appendChild(card);
    });

    benchmarkInsights.textContent = buildBenchmarkInsights(metrics, state.industry);
  }

  // ===== UPDATE SCORECARD =====
  function updateScorecard() {
    const metrics = state.metrics;
    if (!metrics) {
      scorecardWarning.style.display = "";
      return;
    }
    scorecardWarning.style.display = "none";

    const scorecard = calculateScorecard(metrics, state.industry);
    if (!scorecard) return;

    const cccLabel = getScoreLabel(scorecard.cccScore);
    const effLabel = getScoreLabel(scorecard.efficiencyScore);
    const liqLabel = getScoreLabel(scorecard.liquidityScore);
    const totalLabel = getScoreLabel(scorecard.totalScore);

    scoreCCC.textContent = scorecard.cccScore;
    scoreCCC.style.color = cccLabel.color;
    scoreCCCLabel.textContent = cccLabel.text;
    scoreCCCLabel.style.background = cccLabel.color + "22";
    scoreCCCLabel.style.color = cccLabel.color;

    scoreEfficiency.textContent = scorecard.efficiencyScore;
    scoreEfficiency.style.color = effLabel.color;
    scoreEfficiencyLabel.textContent = effLabel.text;
    scoreEfficiencyLabel.style.background = effLabel.color + "22";
    scoreEfficiencyLabel.style.color = effLabel.color;

    scoreLiquidity.textContent = scorecard.liquidityScore;
    scoreLiquidity.style.color = liqLabel.color;
    scoreLiquidityLabel.textContent = liqLabel.text;
    scoreLiquidityLabel.style.background = liqLabel.color + "22";
    scoreLiquidityLabel.style.color = liqLabel.color;

    scoreTotal.textContent = scorecard.totalScore;
    scoreTotal.style.color = totalLabel.color;
    scoreTotalLabel.textContent = totalLabel.text;
    scoreTotalLabel.style.background = totalLabel.color + "22";
    scoreTotalLabel.style.color = totalLabel.color;

    scorecardInsightsEl.textContent = buildScorecardInsights(scorecard);
  }

  // ===== UPDATE SIMULATION =====
  function updateSimulation() {
    const metrics = state.metrics;
    if (!metrics) return;

    const dsoNuevo = parseFloat(sliderDSO.value);
    const dioNuevo = parseFloat(sliderDIO.value);
    const dpoNuevo = parseFloat(sliderDPO.value);

    sliderDSOValue.textContent = formatDays(dsoNuevo);
    sliderDIOValue.textContent = formatDays(dioNuevo);
    sliderDPOValue.textContent = formatDays(dpoNuevo);

    const sim = simulateWorkingCapital(
      metrics.sales, metrics.cogs,
      metrics.dso, metrics.dio, metrics.dpo,
      dsoNuevo, dioNuevo, dpoNuevo
    );

    simCCCActual.textContent = `${formatDays(sim.cccActual)} días`;
    simCCCNew.textContent = `${formatDays(sim.cccNuevo)} días`;

    const delta = sim.cccActual - sim.cccNuevo;
    if (Math.abs(delta) < 0.01) {
      simCCCDelta.textContent = "Sin cambios relevantes.";
    } else if (delta > 0) {
      simCCCDelta.textContent = `Mejoras el CCC en ${formatDays(delta)} días.`;
    } else {
      simCCCDelta.textContent = `Empeoras el CCC en ${formatDays(-delta)} días.`;
    }

    simNWCActual.textContent = formatMoney(sim.nwcActual, state.currency);
    simNWCNew.textContent = formatMoney(sim.nwcNuevo, state.currency);
    simCashFreed.textContent = formatMoney(sim.cashLiberado, state.currency);

    const ventasPorDia = metrics.sales / 365 || 0;
    if (ventasPorDia > 0) {
      const diasVentas = sim.cashLiberado / ventasPorDia;
      simCashDays.textContent = `Equivale a ${formatDays(diasVentas)} días de ventas.`;
    } else {
      simCashDays.textContent = "NWC actual − NWC simulado.";
    }
  }

  function initSimulator() {
    const metrics = state.metrics;
    if (!metrics) {
      simWarning.style.display = "";
      return;
    }
    simWarning.style.display = "none";

    sliderDSO.value = metrics.dso.toFixed(1);
    sliderDIO.value = metrics.dio.toFixed(1);
    sliderDPO.value = metrics.dpo.toFixed(1);

    updateSimulation();
  }

  sliderDSO.addEventListener("input", updateSimulation);
  sliderDIO.addEventListener("input", updateSimulation);
  sliderDPO.addEventListener("input", updateSimulation);

  exportSimCSVBtn.addEventListener("click", () => {
    const metrics = state.metrics;
    if (!metrics) {
      alert("Primero calcula las métricas.");
      return;
    }

    const dsoNuevo = parseFloat(sliderDSO.value);
    const dioNuevo = parseFloat(sliderDIO.value);
    const dpoNuevo = parseFloat(sliderDPO.value);

    const sim = simulateWorkingCapital(
      metrics.sales, metrics.cogs,
      metrics.dso, metrics.dio, metrics.dpo,
      dsoNuevo, dioNuevo, dpoNuevo
    );

    const rows = [
      ["Métrica", "Actual", "Simulado"],
      ["DSO (días)", metrics.dso.toFixed(2), dsoNuevo.toFixed(2)],
      ["DIO (días)", metrics.dio.toFixed(2), dioNuevo.toFixed(2)],
      ["DPO (días)", metrics.dpo.toFixed(2), dpoNuevo.toFixed(2)],
      ["CCC (días)", sim.cccActual.toFixed(2), sim.cccNuevo.toFixed(2)],
      ["NWC", sim.nwcActual.toFixed(2), sim.nwcNuevo.toFixed(2)],
      ["Cash liberado", sim.cashLiberado.toFixed(2), ""],
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "simulacion_working_capital.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ===== UPDATE GROWTH =====
  function updateGrowth() {
    const metrics = state.metrics;
    if (!metrics) {
      growthWarning.style.display = "";
      return;
    }

    const growthPct = parseNumber(growthInput.value) / 100;
    growthWarning.style.display = "none";

    ratioCxcVentasEl.textContent = formatPercentFromDecimal(metrics.ratios.ratioCxcVentas);
    ratioInvCogsEl.textContent = formatPercentFromDecimal(metrics.ratios.ratioInvCogs);
    ratioCxpCogsEl.textContent = formatPercentFromDecimal(metrics.ratios.ratioCxpCogs);
    ratioNwcVentasEl.textContent = formatPercentFromDecimal(metrics.ratios.ratioNwcVentas);

    const proj = calcNWCRequerido(
      metrics.sales, metrics.cogs, growthPct,
      metrics.ratios.ratioCxcVentas,
      metrics.ratios.ratioInvCogs,
      metrics.ratios.ratioCxpCogs
    );

    growthNwcActualEl.textContent = formatMoney(metrics.nwc, state.currency);
    growthNwcNeededEl.textContent = formatMoney(proj.nwcFuturo, state.currency);
    growthExtraNwcEl.textContent = formatMoney(proj.nwcFuturo - metrics.nwc, state.currency);

    growthSalesFutureEl.textContent = formatMoney(proj.ventasFuturas, state.currency);
    growthCogsFutureEl.textContent = formatMoney(proj.cogsFuturo, state.currency);

    // SGR
    const sgr = calculateSGR(metrics);
    if (sgr !== null) {
      sgrValue.textContent = formatPercent(sgr);
      plannedGrowthValue.textContent = formatPercent(parseNumber(growthInput.value));
      sgrMessage.textContent = buildGrowthInsights(metrics, parseNumber(growthInput.value), sgr);
    }
  }

  growthInput.addEventListener("input", () => {
    if (state.metrics) updateGrowth();
  });

  // ===== UPDATE VALUATION =====
  function updateValuation() {
    const metrics = state.metrics;
    const wacc = parseNumber(waccInput.value);
    const ebitdaMargin = parseNumber(ebitdaMarginInput.value);

    if (!metrics || wacc === 0) {
      valuationWarning.style.display = "";
      return;
    }
    valuationWarning.style.display = "none";

    const valuation = calculateValuationImpact(metrics, wacc, ebitdaMargin);
    if (!valuation) return;

    valImpactDSO.textContent = formatMoney(valuation.valueFromDSO, state.currency);
    valImpactDIO.textContent = formatMoney(valuation.valueFromDIO, state.currency);
    valImpactDPO.textContent = formatMoney(valuation.valueFromDPO, state.currency);
    valImpactTotal.textContent = formatMoney(valuation.totalImpact, state.currency);
  }

  waccInput.addEventListener("input", () => {
    if (state.metrics) updateValuation();
  });

  ebitdaMarginInput.addEventListener("input", () => {
    if (state.metrics) updateValuation();
  });

  // ===== SUBMIT FORM =====
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    formError.textContent = "";
    clearInputErrors();

    const companyName = (companyInput.value || "").trim() || "Empresa sin nombre";
    const currency = (currencyInput.value || "").trim() || "USD";
    const industry = industrySelect.value || "oilgas";
    
    state.companyName = companyName;
    state.currency = currency;
    state.industry = industry;
    state.wacc = parseNumber(waccInput.value);
    state.ebitdaMargin = parseNumber(ebitdaMarginInput.value);

    let factor = 1;
    const periodicity = periodicitySelect.value;
    if (periodicity === "quarterly") factor = 4;
    if (periodicity === "monthly") factor = 12;

    const salesPeriod = parseNumber(salesInput.value);
    const cogsPeriod = parseNumber(cogsInput.value);

    if (salesPeriod <= 0 || cogsPeriod < 0) {
      if (salesPeriod <= 0) salesInput.classList.add("input-error");
      if (cogsPeriod < 0) cogsInput.classList.add("input-error");
      formError.textContent = "Revisa que Ventas y COGS sean válidos.";
      return;
    }

    const salesAnnual = salesPeriod * factor;
    const cogsAnnual = cogsPeriod * factor;

    let cxc = 0, inv = 0, cxp = 0, dso = 0, dio = 0, dpo = 0;

    if (state.inputMode === "advanced") {
      cxc = parseNumber(receivablesInput.value);
      inv = parseNumber(inventoryInput.value);
      cxp = parseNumber(payablesInput.value);

      if (cxc < 0 || inv < 0 || cxp < 0) {
        if (cxc < 0) receivablesInput.classList.add("input-error");
        if (inv < 0) inventoryInput.classList.add("input-error");
        if (cxp < 0) payablesInput.classList.add("input-error");
        formError.textContent = "Revisa que CxC, Inventario y CxP sean válidos.";
        return;
      }

      dso = calcDSO(cxc, salesAnnual);
      dio = calcDIO(inv, cogsAnnual);
      dpo = calcDPO(cxp, cogsAnnual);
    } else {
      const basicDSO = parseNumber(basicDSOInput.value);
      const basicDIO = parseNumber(basicDIOInput.value);
      const basicDPO = parseNumber(basicDPOInput.value);

      if (basicDSO <= 0 || basicDIO < 0 || basicDPO < 0) {
        if (basicDSO <= 0) basicDSOInput.classList.add("input-error");
        if (basicDIO < 0) basicDIOInput.classList.add("input-error");
        if (basicDPO < 0) basicDPOInput.classList.add("input-error");
        formError.textContent = "En modo básico, DSO debe ser > 0 y DIO/DPO ≥ 0.";
        return;
      }

      dso = basicDSO;
      dio = basicDIO;
      dpo = basicDPO;

      const ventasPorDia = salesAnnual / 365;
      const cogsPorDia = cogsAnnual / 365;

      cxc = ventasPorDia * dso;
      inv = cogsPorDia * dio;
      cxp = cogsPorDia * dpo;
    }

    const cash = parseNumber(cashInput.value);
    const otherLiab = parseNumber(otherLiabInput.value);

    const ccc = calcCCC(dso, dio, dpo);
    const nwc = calcNWC(cxc, inv, cxp);
    const ratios = calcRatiosNWC(cxc, inv, cxp, salesAnnual, cogsAnnual);

    state.metrics = {
      sales: salesAnnual,
      cogs: cogsAnnual,
      dso, dio, dpo, ccc, nwc,
      cxc, inv, cxp,
      cash, otherLiab,
      ratios
    };

    updateDashboard();
    updateBenchmark();
    updateScorecard();
    initSimulator();
    updateGrowth();
    updateValuation();

    const payload = {
      companyName, currency, industry, periodicity,
      inputMode: state.inputMode,
      sales: salesInput.value,
      cogs: cogsInput.value,
      receivables: receivablesInput.value,
      inventory: inventoryInput.value,
      payables: payablesInput.value,
      growth: growthInput.value,
      wacc: waccInput.value,
      ebitdaMargin: ebitdaMarginInput.value,
      cash: cashInput.value,
      otherLiab: otherLiabInput.value,
      basicDSO: basicDSOInput.value,
      basicDIO: basicDIOInput.value,
      basicDPO: basicDPOInput.value,
      metrics: state.metrics
    };
    saveToLocalStorage(payload);
  });

  // ===== RESET =====
  resetBtn.addEventListener("click", () => {
    form.reset();
    state.metrics = null;
    formError.textContent = "";
    clearInputErrors();
    resetOutputs();
  });

  // ===== EXPORT PDF =====
  exportPdfBtn.addEventListener("click", () => {
    window.print();
  });

  // ===== LOAD FROM LOCALSTORAGE =====
  const saved = loadFromLocalStorage();
  if (saved) {
    companyInput.value = saved.companyName || "";
    currencyInput.value = saved.currency || "USD";
    industrySelect.value = saved.industry || "oilgas";
    periodicitySelect.value = saved.periodicity || "annual";

    salesInput.value = saved.sales || "";
    cogsInput.value = saved.cogs || "";
    receivablesInput.value = saved.receivables || "";
    inventoryInput.value = saved.inventory || "";
    payablesInput.value = saved.payables || "";
    growthInput.value = saved.growth || "";
    waccInput.value = saved.wacc || "10";
    ebitdaMarginInput.value = saved.ebitdaMargin || "15";
    cashInput.value = saved.cash || "";
    otherLiabInput.value = saved.otherLiab || "";
    basicDSOInput.value = saved.basicDSO || "";
    basicDIOInput.value = saved.basicDIO || "";
    basicDPOInput.value = saved.basicDPO || "";

    applyMode(saved.inputMode || "advanced");

    if (saved.metrics) {
      state.companyName = saved.companyName || "Empresa sin nombre";
      state.currency = saved.currency || "USD";
      state.industry = saved.industry || "oilgas";
      state.wacc = parseNumber(saved.wacc || "10");
      state.ebitdaMargin = parseNumber(saved.ebitdaMargin || "15");
      state.metrics = saved.metrics;
      
      updateDashboard();
      updateBenchmark();
      updateScorecard();
      initSimulator();
      updateGrowth();
      updateValuation();
    } else {
      resetOutputs();
    }
  } else {
    applyMode("advanced");
    resetOutputs();
  }
});