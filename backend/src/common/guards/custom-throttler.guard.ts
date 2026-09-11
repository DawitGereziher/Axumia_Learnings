import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const timeToWait = Math.ceil((throttlerLimitDetail.timeToBlockExpire || 60000) / 1000);
    throw new ThrottlerException(
      `Too many requests, please try again in ${timeToWait} seconds.`,
    );
  }
}
