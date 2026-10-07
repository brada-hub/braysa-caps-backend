import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { SharedModule } from './contexts/shared/shared.module';
import { InventoryModule } from './contexts/inventory/inventory.module';
import { CashRegisterModule } from './contexts/cash-register/cash-register.module';
import { SalesModule } from './contexts/sales/sales.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SharedModule,
    InventoryModule,
    CashRegisterModule,
    SalesModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
