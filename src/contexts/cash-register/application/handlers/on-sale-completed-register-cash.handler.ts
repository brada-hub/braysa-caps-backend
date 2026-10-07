import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SaleCompletedDomainEvent } from '../../../../shared/domain/events/sale-completed.domain-event';
import {
  CASH_SHIFT_REPOSITORY_PORT,
} from '../../domain/ports/cash-shift.repository.port';
import type { ICashShiftRepository } from '../../domain/ports/cash-shift.repository.port';

@Injectable()
export class OnSaleCompletedRegisterCashHandler {
  private readonly logger = new Logger(OnSaleCompletedRegisterCashHandler.name);

  constructor(
    @Inject(CASH_SHIFT_REPOSITORY_PORT)
    private readonly cashShiftRepository: ICashShiftRepository,
  ) {}

  @OnEvent(SaleCompletedDomainEvent.EVENT_NAME)
  async handle(event: SaleCompletedDomainEvent): Promise<void> {
    if (!event.cashShiftId) {
      return;
    }

    this.logger.log(
      `Handling ${event.eventName}: Registering sale cash/digital payments into cash shift ${event.cashShiftId}`,
    );

    const shift = await this.cashShiftRepository.findById(
      event.tenantId,
      event.cashShiftId,
    );

    if (!shift) {
      this.logger.error(
        `Cash shift ${event.cashShiftId} not found while recording sale ${event.saleId}`,
      );
      return;
    }

    let cashTotal = 0.0;
    let digitalTotal = 0.0;

    for (const payment of event.payments) {
      const method = payment.method || payment.paymentMethod;
      const amount = payment.amount ?? payment.amountPaid ?? 0.0;

      if (method === 'CASH') {
        cashTotal += amount;
      } else {
        digitalTotal += amount;
      }
    }

    // Actualiza los balances del turno de caja
    shift.recordSale(cashTotal, digitalTotal);

    await this.cashShiftRepository.save(shift);
  }
}
