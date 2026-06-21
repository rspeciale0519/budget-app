import type { SignRule } from "@prisma/client";

export interface ColumnMap {
  date: string;
  description: string;
  merchant?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  runningBalance?: string;
}

export interface MappingConfig {
  columnMap: ColumnMap;
  signRule: SignRule;
  dateFormat: string;
}
