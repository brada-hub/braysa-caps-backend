import { RegisterCashMovementUseCase } from '../../../src/contexts/cash-register/application/use-cases/register-cash-movement.use-case';
import { ICashShiftRepository } from '../../../src/contexts/cash-register/domain/ports/cash-shift.repository.port';
import { CashShift } from '../../../src/contexts/cash-register/domain/aggregates/cash-shift.aggregate';
import { EntityNotFoundException } from '../../../src/contexts/shared/domain/domain.exception';

describe('RegisterCashMovementUseCase', () => {
  let useCase: RegisterCashMovementUseCase;
  let mockRepository: jest.Mocked<ICashShiftRepository>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const shiftId = '00000000-0000-0000-0000-000000000010';
  const cashierId = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findActiveByCashier: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new RegisterCashMovementUseCase(mockRepository);
  });

  it('should successfully register a manual expense (egreso menor) and update theoretical cash', async () => {
    // Base: 200.00
    const shift = CashShift.open({ tenantId, cashierId, initialAmount: 200.0 });
    mockRepository.findById.mockResolvedValue(shift);

    // Minor expense: 35.00 for cleaning supplies
    // Expected theoretical = 200 - 35 = 165.00
    const result = await useCase.execute({
      tenantId,
      shiftId,
      type: 'EXPENSE',
      amount: 35.0,
      reason: 'Artículos de limpieza',
    });

    expect(result.type).toBe('EXPENSE');
    expect(result.amount).toBe(35.0);
    expect(result.reason).toBe('Artículos de limpieza');
    expect(result.manualExpenses).toBe(35.0);
    expect(result.theoreticalAmount).toBe(165.0);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should successfully register a manual income and update theoretical cash', async () => {
    const shift = CashShift.open({ tenantId, cashierId, initialAmount: 100.0 });
    mockRepository.findById.mockResolvedValue(shift);

    // Manual income: 50.00
    // Expected theoretical = 100 + 50 = 150.00
    const result = await useCase.execute({
      tenantId,
      shiftId,
      type: 'INCOME',
      amount: 50.0,
      reason: 'Aporte de sencillo por administración',
    });

    expect(result.type).toBe('INCOME');
    expect(result.amount).toBe(50.0);
    expect(result.manualIncome).toBe(50.0);
    expect(result.theoreticalAmount).toBe(150.0);
  });

  it('should throw EntityNotFoundException if shift does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId,
        shiftId,
        type: 'INCOME',
        amount: 20.0,
        reason: 'Test',
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
