import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyToken } from '../../../../D-auth/utils/jwt';

/**
 * AdminGuard — authenticates JWT then enforces role === 'admin'.
 * Combines DAuthGuard + RolesGuard in one for convenience on admin routes.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();

    const authHeader = req.headers['authorization'] as string;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    if (!token)
      throw new UnauthorizedException('No authentication token provided');

    const decoded = verifyToken(token);
    if (!decoded) throw new UnauthorizedException('Invalid or expired token');

    (req as any).user = decoded;

    if ((decoded as any).role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
