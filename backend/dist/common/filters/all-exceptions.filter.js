"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            }
            else if (typeof res === 'object' && res !== null) {
                const body = res;
                message = body.message ?? exception.message;
            }
            error = common_1.HttpStatus[status] ?? 'Error';
        }
        else if (isPrismaError(exception)) {
            switch (exception.code) {
                case 'P2002':
                    status = common_1.HttpStatus.CONFLICT;
                    message = 'A record with this value already exists';
                    error = 'Conflict';
                    break;
                case 'P2025':
                    status = common_1.HttpStatus.NOT_FOUND;
                    message = 'Record not found';
                    error = 'Not Found';
                    break;
                case 'P2003':
                    status = common_1.HttpStatus.BAD_REQUEST;
                    message = 'Invalid reference: related record does not exist';
                    error = 'Bad Request';
                    break;
                default:
                    status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                    message = 'Database error';
                    error = 'Internal Server Error';
                    this.logger.error(`Prisma error ${exception.code}: ${exception.message}`, exception.meta);
            }
        }
        else {
            this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
            if (process.env.NODE_ENV !== 'production') {
                message = exception instanceof Error ? exception.message : String(exception);
            }
        }
        response.status(status).json({
            statusCode: status,
            error,
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
function isPrismaError(err) {
    if (typeof err !== 'object' || err === null)
        return false;
    const obj = err;
    return typeof obj.code === 'string' && obj.code.startsWith('P');
}
//# sourceMappingURL=all-exceptions.filter.js.map