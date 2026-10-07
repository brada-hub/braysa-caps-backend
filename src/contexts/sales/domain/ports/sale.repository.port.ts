import { Sale } from '../entities/sale.entity';

export const SALE_REPOSITORY = 'SALE_REPOSITORY';
export const SALE_REPOSITORY_PORT = SALE_REPOSITORY;

export interface ISaleRepository {
  save(sale: Sale): Promise<void>;
  findById(tenantId: string, id: string): Promise<Sale | null>;
}
