export const DEMO_COMPANY = {
  name: "Mühlviertler Feinkost GmbH",
  address: "Linzer Straße 14, 4240 Freistadt",
  nace_code: "C10.13",
  industry: "Fleischverarbeitung",
  employees: 45,
  building_area_m2: 2800,
  annual_turnover_eur: 4200000,
  audit_year: 2023,
};

export const DEMO_AUDITOR = {
  name: "Mag. Stefan Gruber",
  e_control_id: "AT-2019-0847",
  company: "IfEA Institut für Energieausweis GmbH",
};

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
  { month: "Jan 23", strom_kwh: 34200, gas_kwh: 62400, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Feb 23", strom_kwh: 31800, gas_kwh: 71200, fernwaerme_kwh: null, status: "confirmed" },
  {
    month: "Mär 23", strom_kwh: 41500, gas_kwh: 55000, fernwaerme_kwh: null, status: "anomaly",
    anomaly_note: "38% über Monatsdurchschnitt — vermutlich Kältemittelverlust Kompressor #2",
  },
  { month: "Apr 23", strom_kwh: 30100, gas_kwh: 48300, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Mai 23", strom_kwh: 29400, gas_kwh: 28700, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Jun 23", strom_kwh: 35600, gas_kwh: 18200, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Jul 23", strom_kwh: 38200, gas_kwh: 15400, fernwaerme_kwh: null, status: "confirmed" },
  {
    month: "Aug 23", strom_kwh: null, gas_kwh: null, fernwaerme_kwh: null, status: "missing",
    missing_note: "Stromrechnung fehlt — beim Energie AG Kundenportal anfordern",
  },
  { month: "Sep 23", strom_kwh: 33100, gas_kwh: 22800, fernwaerme_kwh: null, status: "confirmed" },
  {
    month: "Okt 23", strom_kwh: 34800, gas_kwh: 45200, fernwaerme_kwh: null, status: "estimated",
    estimated_note: "Rechnung unleserlich — Schätzwert aus Vorjahresvergleich",
  },
  { month: "Nov 23", strom_kwh: 36200, gas_kwh: 67400, fernwaerme_kwh: null, status: "confirmed" },
  { month: "Dez 23", strom_kwh: 35100, gas_kwh: 84900, fernwaerme_kwh: null, status: "confirmed" },
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
  industry: "Fleischverarbeitung (ÖNACE C10.13)",
  electricity_kwh_per_m2: 130,
  actual_electricity_kwh_per_m2: 153,
  deviation_pct: 17.7,
  source: "Statistik Austria 2023",
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
    title: "Kältemittel-Leck Behebung + VFD Kompressor #2",
    description: "Reparatur des Kältemittelverlusts und Installation eines Frequenzumrichters (VFD) an Kompressor #2",
    annual_saving_kwh: 52000,
    annual_saving_eur: 9360,
    investment_eur: 28000,
    payback_years: 3.0,
    priority: "hoch",
    evidence: {
      measurement: "Leistungsmessung: 37,2 kW (2024-11-14, Foto #007)",
      nameplate: "Typenschild: 45 kW (ORC-Kompressor, Baujahr 2012)",
      method: "DIN 17463 §3.2, VFD-Einsparrate 47%",
      price_basis: "€0,18/kWh (E-Control 2024Q3)",
      confidence: 82,
      confidence_note: "Lastprofil fehlt — 24h-Messung empfohlen",
    },
  },
  {
    measure_id: "M2",
    title: "LED-Beleuchtungsumrüstung Produktion + Lager",
    description: "Ersatz aller Leuchtstoffröhren durch LED-Systeme in Produktionshalle und Lagerbereich",
    annual_saving_kwh: 28000,
    annual_saving_eur: 5040,
    investment_eur: 10500,
    payback_years: 2.1,
    priority: "hoch",
    evidence: {
      measurement: "Bestandsaufnahme: 87 Leuchtstoffröhren T8 58W, Betriebszeit 3.200h/Jahr",
      method: "EN 12464-1, Ersatzrechnung LED 20W je Röhre",
      price_basis: "€0,18/kWh (E-Control 2024Q3)",
      confidence: 91,
      confidence_note: "Zählung vollständig, hohe Konfidenz",
    },
  },
  {
    measure_id: "M3",
    title: "Druckluftanlage: Leckleitungsreparatur + Druckoptimierung",
    description: "Abdichtung identifizierter Druckluftverluste (~18% Leckrate) und Reduzierung Netzdruck von 8 auf 6,5 bar",
    annual_saving_kwh: 18000,
    annual_saving_eur: 3240,
    investment_eur: 2400,
    payback_years: 0.7,
    priority: "sehr hoch",
    evidence: {
      measurement: "Ultraschall-Leckdetektion: 12 Lecks identifiziert, Leckrate 18%",
      method: "VALERI-Berechnungsmodell §4.2, Kompressorleistung 55 kW",
      price_basis: "€0,18/kWh (E-Control 2024Q3)",
      confidence: 88,
      confidence_note: "Leckdetektion vollständig, Einsparung gut quantifizierbar",
    },
  },
  {
    measure_id: "M4",
    title: "Kessel-Abgaswärmerückgewinnung",
    description: "Installation eines Wärmetauschers im Abgasstrom des Dampfkessels zur Warmwasservorwärmung",
    annual_saving_kwh: 35000,
    annual_saving_eur: 6300,
    investment_eur: 32000,
    payback_years: 5.1,
    priority: "mittel",
    evidence: {
      measurement: "Abgastemperatur: 185°C (Messung 2024-11-14), Kesselleistung 320 kW",
      method: "DIN 4709, Wärmerückgewinnungsgrad 65%",
      price_basis: "€0,085/kWh Gas (E-Control 2024Q3)",
      confidence: 79,
      confidence_note: "Abgasmenge geschätzt aus Kesselbetriebsstunden",
    },
  },
  {
    measure_id: "M5",
    title: "Lüftungsanlage: VFD-Nachrüstung Zu-/Abluft",
    description: "Installation von Frequenzumrichtern an Zu- und Abluftventilator der zentralen Lüftungsanlage",
    annual_saving_kwh: 12000,
    annual_saving_eur: 2160,
    investment_eur: 14000,
    payback_years: 6.5,
    priority: "niedrig",
    evidence: {
      measurement: "Ventilatorleistung: 2× 15 kW, Betriebszeit 4.200h/Jahr",
      method: "DIN EN 13779, VFD-Einsparrate Teillastbetrieb 40%",
      price_basis: "€0,18/kWh (E-Control 2024Q3)",
      confidence: 74,
      confidence_note: "Lastprofil teilweise geschätzt",
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
  { delay_ms: 300, type: "info", text: "Analysiere Dateiformate..." },
  { delay_ms: 700, type: "ok", text: "3 JPEG-Bilddateien erkannt (Energie AG Rechnungsformat)" },
  { delay_ms: 1100, type: "info", text: "Extrahiere Felder: Abrechnungszeitraum, kWh, Leistungsspitze, Preis..." },
  { delay_ms: 1600, type: "warn", text: "Einheit-Diskrepanz in Excel: MWh → kWh konvertiert (×1000)" },
  { delay_ms: 2000, type: "ok", text: "Erdgas-PDF extrahiert: Dezember 84.900 kWh" },
  { delay_ms: 2400, type: "warn", text: "⚠ März 2023: 41.500 kWh — 38% über Monatsdurchschnitt" },
  { delay_ms: 2800, type: "info", text: "Lückenanalyse: Prüfe alle 12 Abrechnungsmonate..." },
  { delay_ms: 3200, type: "error", text: "✗ August 2023: Stromrechnung fehlt — beim Energie AG Kundenportal anfordern" },
  { delay_ms: 3600, type: "ok", text: "✓ Verarbeitung abgeschlossen — Datenbereitschaft: 83%" },
];

export const STAGED_FILES_DEMO = [
  { name: "EnergyAG_Strom_Jan-Apr.jpg", size: "847 KB", type: "JPEG", icon: "📄" },
  { name: "EnergyAG_Strom_Mai-Aug.jpg", size: "1,2 MB", type: "JPEG", icon: "📄" },
  { name: "EnergyAG_Strom_Sep-Dez.jpg", size: "934 KB", type: "JPEG", icon: "📄" },
  { name: "Verbrauch_2023_intern.xlsx", size: "234 KB", type: "XLSX", icon: "📊" },
  { name: "Erdgas_Jahresabrechnung_2023.pdf", size: "612 KB", type: "PDF", icon: "📑" },
];
