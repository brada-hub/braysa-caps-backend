import { CashShift } from '../aggregates/cash-shift.aggregate';

export const CASH_SHIFT_REPOSITORY = 'CASH_SHIFT_REPOSITORY';
export const CASH_SHIFT_REPOSITORY_PORT = CASH_SHIFT_REPOSITORY;

export interface ICashShiftRepository {
  findById(tenantId: string, id: string): Promise<CashShift | null>;
  findActiveByCashier(
    tenantId: string,
    cashierId: string,
  ): Promise<CashShift | null>;
  save(shift: CashShift): Promise<void>;
}
