import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class DAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
