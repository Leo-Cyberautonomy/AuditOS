export const DEMO_COMPANY = {
  name: "EuroTech Manufacturing GmbH",
  address: "Industriestraße 24, 80939 Munich, Germany",
  nace_code: "C10.13",
  industry: "Food Processing & Manufacturing",
  employees: 245,
  building_area_m2: 12400,
  annual_turnover_eur: 4200000,
  audit_year: 2025,
};

export const DEMO_AUDITOR = {
  name: "Dr. Stefan Gruber",
  e_control_id: "ISO-AUD-2025-0847",
  /** Alias for e_control_id — used in multi-domain contexts */
  cert_id: "ISO-AUD-2025-0847",
  company: "TÜV Energy Solutions",
};

// ── Internationalized demo cases across 5 domains and 5 countries ──────────

export const DEMO_CASES = [
  {
    id: "CASE-001",
    domain: "energy",
    company: {
      name: "EuroTech Manufacturing GmbH",
      address: "Industriestraße 24, 80939 Munich, Germany",
      nace_code: "C10.13",
      industry: "Food Processing & Manufacturing",
      employees: 245,
      building_area_m2: 12400,
    },
    auditor: {
      name: "Dr. Stefan Gruber",
      cert_id: "ISO-AUD-2025-0847",
      company: "TÜV Energy Solutions",
    },
    standards: ["ISO 50001", "EN 16247-1"],
  },
  {
    id: "CASE-002",
    domain: "food_safety",
    company: {
      name: "Pacific Fresh Foods Inc.",
      address: "1200 Embarcadero Rd, San Francisco, CA 94107, USA",
      nace_code: "I56.10",
      industry: "Food Service & Restaurant Chain",
      employees: 180,
      building_area_m2: 3200,
    },
    auditor: {
      name: "Sarah Chen, CFS",
      cert_id: "FSMA-AUD-2025-1234",
      company: "SafeFood Consultants LLC",
    },
    standards: ["FDA FSMA", "HACCP", "SQF"],
  },
  {
    id: "CASE-003",
    domain: "construction",
    company: {
      name: "Nordic Build AS",
      address: "Bygdøy allé 45, 0265 Oslo, Norway",
      nace_code: "F41.20",
      industry: "Commercial Construction",
      employees: 520,
      building_area_m2: 45000,
    },
    auditor: {
      name: "Erik Lindqvist, CSP",
      cert_id: "ISO45001-AUD-2025-0391",
      company: "Scandinavian Safety Group",
    },
    standards: ["ISO 45001", "Eurocodes"],
  },
  {
    id: "CASE-004",
    domain: "fire_safety",
    company: {
      name: "Sakura Hotel Group",
      address: "2-4-1 Nihonbashi, Chuo-ku, Tokyo 103-0027, Japan",
      nace_code: "I55.10",
      industry: "Hospitality & Hotels",
      employees: 340,
      building_area_m2: 18500,
    },
    auditor: {
      name: "Yuki Tanaka, PE",
      cert_id: "NFPA-CFPS-2025-0712",
      company: "Asia Fire Safety Consulting",
    },
    standards: ["NFPA 72", "ISO 7240"],
  },
  {
    id: "CASE-005",
    domain: "environmental",
    company: {
      name: "GreenPort Logistics Ltd.",
      address: "Europaweg 200, 3199 LC Rotterdam, Netherlands",
      nace_code: "H52.10",
      industry: "Warehousing & Logistics",
      employees: 890,
      building_area_m2: 62000,
    },
    auditor: {
      name: "Anna van der Berg, MSc",
      cert_id: "ISO14001-AUD-2025-0568",
      company: "EcoAudit Europe BV",
    },
    standards: ["ISO 14001", "EU EIA Directive"],
  },
];

export type EnergyRowStatus = "confirmed" | "anomaly" | "estimated" | "missing";

export interface EnergyRow {
  month: string;
  strom_kwh: number | null;
  gas_kwh: number | null;
  fernwaerme_kwh: number | null;
  status: EnergyRowStatus;
  anomaly_note?: string;
  missing_note?: string;
  estimated_note?: string;
}

export const DEMO_ENERGY_DATA: EnergyRow[] = [
  { month: "Jan 25", strom_kwh: 34200, gas_kwh: 62400, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Feb 25", strom_kwh: 31800, gas_kwh: 71200, fernwaerme_kwh: null, status: "confirmed" },
  {
    month: "Mar 25", strom_kwh: 41500, gas_kwh: 55000, fernwaerme_kwh: null, status: "anomaly",
    anomaly_note: "38% above monthly average — suspected refrigerant leak in compressor #2",
  },
  { month: "Apr 25", strom_kwh: 30100, gas_kwh: 48300, fernwaerme_kwh: null, status: "confirmed" },
  { month: "May 25", strom_kwh: 29400, gas_kwh: 28700, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Jun 25", strom_kwh: 35600, gas_kwh: 18200, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Jul 25", strom_kwh: 38200, gas_kwh: 15400, fernwaerme_kwh: null, status: "confirmed" },
  {
    month: "Aug 25", strom_kwh: null, gas_kwh: null, fernwaerme_kwh: null, status: "missing",
    missing_note: "Electricity bill missing — request from energy provider portal",
  },
  { month: "Sep 25", strom_kwh: 33100, gas_kwh: 22800, fernwaerme_kwh: null, status: "confirmed" },
  {
    month: "Oct 25", strom_kwh: 34800, gas_kwh: 45200, fernwaerme_kwh: null, status: "estimated",
    estimated_note: "Invoice illegible — estimated from year-over-year comparison",
  },
  { month: "Nov 25", strom_kwh: 36200, gas_kwh: 67400, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Dec 25", strom_kwh: 35100, gas_kwh: 84900, fernwaerme_kwh: null, status: "confirmed" },
];

export const DEMO_TOTALS = {
  strom_kwh: 430000,
  gas_kwh: 519600,
  fernwaerme_kwh: 0,
  total_kwh: 949600,
  readiness_score: 83,
  complete_months: 10,
  estimated_months: 1,
  missing_months: 1,
};

export const DEMO_BENCHMARKS = {
  industry: "Food Processing (NACE C10.13)",
  electricity_kwh_per_m2: 130,
  actual_electricity_kwh_per_m2: 153,
  deviation_pct: 17.7,
  source: "EU Energy Efficiency Benchmark 2025",
};

export interface Measure {
  measure_id: string;
  title: string;
  description: string;
  annual_saving_kwh: number;
  annual_saving_eur: number;
  investment_eur: number;
  payback_years: number;
  priority: string;
  evidence: {
    measurement: string;
    method: string;
    price_basis: string;
    confidence: number;
    confidence_note: string;
    nameplate?: string;
  };
}

export const DEMO_MEASURES: Measure[] = [
  {
    measure_id: "M1",
    title: "Refrigerant Leak Repair + VFD for Compressor #2",
    description: "Repair refrigerant leak and install variable frequency drive (VFD) on compressor #2",
    annual_saving_kwh: 52000,
    annual_saving_eur: 9360,
    investment_eur: 28000,
    payback_years: 3.0,
    priority: "high",
    evidence: {
      measurement: "Power measurement: 37.2 kW (2025-02-14, Photo #007)",
      nameplate: "Nameplate: 45 kW (ORC compressor, year 2012)",
      method: "ISO 50002 §6.3, VFD savings rate 47%",
      price_basis: "€0.18/kWh (market average 2025Q1)",
      confidence: 82,
      confidence_note: "Load profile missing — 24h measurement recommended",
    },
  },
  {
    measure_id: "M2",
    title: "LED Lighting Retrofit — Production + Warehouse",
    description: "Replace all fluorescent tubes with LED systems in production hall and warehouse area",
    annual_saving_kwh: 28000,
    annual_saving_eur: 5040,
    investment_eur: 10500,
    payback_years: 2.1,
    priority: "high",
    evidence: {
      measurement: "Inventory: 87 fluorescent tubes T8 58W, operating time 3,200h/year",
      method: "EN 12464-1, replacement calculation LED 20W per tube",
      price_basis: "€0.18/kWh (market average 2025Q1)",
      confidence: 91,
      confidence_note: "Complete count, high confidence",
    },
  },
  {
    measure_id: "M3",
    title: "Compressed Air System: Leak Repair + Pressure Optimization",
    description: "Seal identified compressed air leaks (~18% leak rate) and reduce network pressure from 8 to 6.5 bar",
    annual_saving_kwh: 18000,
    annual_saving_eur: 3240,
    investment_eur: 2400,
    payback_years: 0.7,
    priority: "very high",
    evidence: {
      measurement: "Ultrasonic leak detection: 12 leaks identified, leak rate 18%",
      method: "ISO 11011, compressor power 55 kW",
      price_basis: "€0.18/kWh (market average 2025Q1)",
      confidence: 88,
      confidence_note: "Complete leak detection, savings well quantifiable",
    },
  },
  {
    measure_id: "M4",
    title: "Boiler Flue Gas Heat Recovery",
    description: "Install heat exchanger in boiler flue gas stream for feedwater preheating",
    annual_saving_kwh: 35000,
    annual_saving_eur: 6300,
    investment_eur: 32000,
    payback_years: 5.1,
    priority: "medium",
    evidence: {
      measurement: "Flue gas temperature: 185°C (measurement 2025-02-14), boiler capacity 320 kW",
      method: "ISO 50002, heat recovery efficiency 65%",
      price_basis: "€0.085/kWh gas (market average 2025Q1)",
      confidence: 79,
      confidence_note: "Flue gas volume estimated from boiler operating hours",
    },
  },
  {
    measure_id: "M5",
    title: "HVAC System: VFD Retrofit for Supply/Exhaust Fans",
    description: "Install variable frequency drives on supply and exhaust fans of central ventilation system",
    annual_saving_kwh: 12000,
    annual_saving_eur: 2160,
    investment_eur: 14000,
    payback_years: 6.5,
    priority: "low",
    evidence: {
      measurement: "Fan power: 2× 15 kW, operating time 4,200h/year",
      method: "EN 13779, VFD savings rate at part load 40%",
      price_basis: "€0.18/kWh (market average 2025Q1)",
      confidence: 74,
      confidence_note: "Load profile partially estimated",
    },
  },
];

export type LogType = "info" | "ok" | "warn" | "error";

export interface LogEntry {
  delay_ms: number;
  type: LogType;
  text: string;
}

export const DEMO_PROCESSING_LOG: LogEntry[] = [
  { delay_ms: 300, type: "info", text: "Analyzing file formats..." },
  { delay_ms: 700, type: "ok", text: "3 JPEG image files detected (utility invoice format)" },
  { delay_ms: 1100, type: "info", text: "Extracting fields: billing period, kWh, peak demand, price..." },
  { delay_ms: 1600, type: "warn", text: "Unit discrepancy in Excel: MWh → kWh converted (×1000)" },
  { delay_ms: 2000, type: "ok", text: "Natural gas PDF extracted: December 84,900 kWh" },
  { delay_ms: 2400, type: "warn", text: "⚠ March 2025: 41,500 kWh — 38% above monthly average" },
  { delay_ms: 2800, type: "info", text: "Gap analysis: checking all 12 billing months..." },
  { delay_ms: 3200, type: "error", text: "✗ August 2025: electricity bill missing — request from energy provider portal" },
  { delay_ms: 3600, type: "ok", text: "✓ Processing complete — data readiness: 83%" },
];

export const STAGED_FILES_DEMO = [
  { name: "Utility_Electricity_Jan-Apr.jpg", size: "847 KB", type: "JPEG", icon: "📄" },
  { name: "Utility_Electricity_May-Aug.jpg", size: "1.2 MB", type: "JPEG", icon: "📄" },
  { name: "Utility_Electricity_Sep-Dec.jpg", size: "934 KB", type: "JPEG", icon: "📄" },
  { name: "Consumption_2025_internal.xlsx", size: "234 KB", type: "XLSX", icon: "📊" },
  { name: "NaturalGas_Annual_2025.pdf", size: "612 KB", type: "PDF", icon: "📑" },
];
