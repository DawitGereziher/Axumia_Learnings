import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
export declare class CustomThrottlerGuard extends ThrottlerGuard {
    protected throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: any): Promise<void>;
}
