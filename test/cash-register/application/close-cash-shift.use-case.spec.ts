import { CloseCashShiftUseCase } from '../../../src/contexts/cash-register/application/use-cases/close-cash-shift.use-case';
import { ICashShiftRepository } from '../../../src/contexts/cash-register/domain/repositories/cash-shift.repository.interface';
import { CashShift } from '../../../src/contexts/cash-register/domain/entities/cash-shift.entity';
import { EntityNotFoundException } from '../../../src/contexts/shared/domain/domain.exception';

describe('CloseCashShiftUseCase', () => {
  let useCase: CloseCashShiftUseCase;
  let mockRepository: jest.Mocked<ICashShiftRepository>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const shiftId = '00000000-0000-0000-0000-000000000010';
  const cashierId = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findActiveByCashier: jest.fn(),
      save: jest.fn(),
    };
    useCase = new CloseCashShiftUseCase(mockRepository);
  });

  it('should successfully close shift, calculate arqueo and return result', async () => {
    const shift = CashShift.open({
      tenantId,
      cashierId,
      initialAmount: 150.0,
    });
    // simulate sales: 250 cash, 100 digital
    shift.recordSale(250.0, 100.0);
    // Theoretical = 150 + 250 = 400.00

    mockRepository.findById.mockResolvedValue(shift);
    mockRepository.save.mockResolvedValue(undefined);

    const result = await useCase.execute({
      tenantId,
      shiftId,
      declaredPhysicalCash: 410.0, // 10 surplus
    });

    expect(result.status).toBe('CLOSED');
    expect(result.initialAmount).toBe(150.0);
    expect(result.totalCashSales).toBe(250.0);
    expect(result.totalDigitalSales).toBe(100.0);
    expect(result.theoreticalAmount).toBe(400.0);
    expect(result.declaredPhysicalCash).toBe(410.0);
    expect(result.difference).toBe(10.0);
    expect(result.arqueoResult).toBe('SOBRANTE');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw EntityNotFoundException if shift is not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId,
        shiftId,
        declaredPhysicalCash: 200.0,
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
