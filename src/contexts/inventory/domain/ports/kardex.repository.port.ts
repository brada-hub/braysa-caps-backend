import { KardexMovement } from '../entities/kardex-movement.entity';

export const KARDEX_REPOSITORY_PORT = 'KARDEX_REPOSITORY_PORT';

export interface IKardexRepository {
  save(movement: KardexMovement): Promise<void>;
  findByVariantId(tenantId: string, variantId: string): Promise<KardexMovement[]>;
  findByTenantId?(tenantId: string): Promise<KardexMovement[]>;
}
