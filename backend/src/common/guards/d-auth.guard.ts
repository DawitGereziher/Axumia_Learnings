import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyToken } from '../../../../D-auth/utils/jwt';

@Injectable()
export class DAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();

    const authHeader = req.headers['authorization'] as string;
    const altHeader = req.headers['x-auth-token'] as string;

    let token: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (altHeader) {
      token = altHeader;
    }

    if (!token)
      throw new UnauthorizedException('No authentication token provided');

    const decoded = verifyToken(token);
    if (!decoded) throw new UnauthorizedException('Invalid or expired token');

    // Attach decoded payload to request so controllers can access it
    (req as any).user = decoded;
    return true;
  }
}
