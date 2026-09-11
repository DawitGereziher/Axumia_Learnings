"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("../../../../D-auth/utils/jwt");
let DAuthGuard = class DAuthGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'];
        const altHeader = req.headers['x-auth-token'];
        let token = null;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
        else if (altHeader) {
            token = altHeader;
        }
        if (!token)
            throw new common_1.UnauthorizedException('No authentication token provided');
        const decoded = (0, jwt_1.verifyToken)(token);
        if (!decoded)
            throw new common_1.UnauthorizedException('Invalid or expired token');
        req.user = decoded;
        return true;
    }
};
exports.DAuthGuard = DAuthGuard;
exports.DAuthGuard = DAuthGuard = __decorate([
    (0, common_1.Injectable)()
], DAuthGuard);
//# sourceMappingURL=d-auth.guard.js.map