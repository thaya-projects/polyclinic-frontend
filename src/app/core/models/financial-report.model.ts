// ReportsController (financiero) — a diferencia de ClinicReportController,
// estos 4 endpoints ya respetan BranchAccess server-side: no aceptan ni
// necesitan branch_id como filtro.

export interface ReportByBranchAmount {
  branch_id: string;
  amount: number;
}

export interface ProductionReportQuery {
  from: string;
  to: string;
  professional_id?: string;
}
export interface ProductionReportItem {
  source: 'invoice_item' | 'treatment_plan_item';
  professional_id: string;
  date: string;
  description: string;
  amount: number;
  reference_id: string;
  parent_id: string | null;
  branch_id: string | null;
}
// Combina facturado + tratamientos completados SIN deduplicar (puede
// duplicar si el mismo trabajo generó ambos) y sin separar por moneda.
export interface ProductionReport {
  professional_id: string | null;
  from: string;
  to: string;
  total_amount: number;
  items: ProductionReportItem[];
  by_branch: ReportByBranchAmount[];
}

export interface MonthlyBreakdownAmount {
  year: number;
  month: number;
  amount: number;
}

export interface MaterialsSpendByMaterial {
  material_id: string;
  material_code: string;
  material_name: string;
  amount: number;
}
export interface MaterialsSpendByCurrency {
  currency: string;
  total_spend: number;
  monthly_breakdown: MonthlyBreakdownAmount[];
  by_material: MaterialsSpendByMaterial[];
  by_branch: ReportByBranchAmount[];
}
export interface MaterialsSpendReportQuery {
  from: string;
  to: string;
}
export interface MaterialsSpendReport {
  from: string;
  to: string;
  by_currency: MaterialsSpendByCurrency[];
}

export interface ExpensesByCategory {
  category: string;
  amount: number;
}
export interface ExpensesByCurrency {
  currency: string;
  total_amount: number;
  monthly_breakdown: MonthlyBreakdownAmount[];
  by_category: ExpensesByCategory[];
  by_branch: ReportByBranchAmount[];
}
export interface ExpensesReportQuery {
  from: string;
  to: string;
}
export interface ExpensesReport {
  from: string;
  to: string;
  by_currency: ExpensesByCurrency[];
}

export interface BalanceReportQuery {
  from: string;
  to: string;
}
export interface BalanceByBranch {
  branch_id: string;
  income: number;
  material_spend: number;
  operating_expenses: number;
  net_balance: number;
}
// net_balance solo usa los montos en la moneda local del tenant; los
// montos en otra moneda quedan aparte, sin convertir (no hay tipo de
// cambio en ningún lado del sistema).
export interface BalanceReport {
  from: string;
  to: string;
  currency: string;
  income: number;
  material_spend: number;
  operating_expenses: number;
  net_balance: number;
  by_branch: BalanceByBranch[];
  other_currency_material_spend: number;
  other_currency_expenses: number;
  income_detail: ProductionReport;
  material_spend_detail: MaterialsSpendReport;
  expenses_detail: ExpensesReport;
}
