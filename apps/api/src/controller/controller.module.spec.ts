import { MODULE_METADATA } from '@nestjs/common/constants';
import { PaymentModule } from '../app/payment/payment.module';
import { isServiceEnabled } from '../common/service-visibility';
import { PaymentController } from './payment/payment.controller';
import { ControllerModule } from './controller.module';

describe('ControllerModule service visibility', () => {
  it('출시 플래그가 없으면 결제 모듈과 컨트롤러를 등록하지 않는다', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ControllerModule,
    ) as unknown as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ControllerModule,
    ) as unknown as unknown[];

    expect(imports).not.toContain(PaymentModule);
    expect(controllers).not.toContain(PaymentController);
  });

  it('출시 플래그는 true 문자열일 때만 활성화한다', () => {
    expect(isServiceEnabled('ENABLE_PAYMENT_SERVICE', {})).toBe(false);
    expect(
      isServiceEnabled('ENABLE_PAYMENT_SERVICE', {
        ENABLE_PAYMENT_SERVICE: 'true',
      }),
    ).toBe(true);
    expect(
      isServiceEnabled('ENABLE_PAYMENT_SERVICE', {
        ENABLE_PAYMENT_SERVICE: 'false',
      }),
    ).toBe(false);
  });
});
