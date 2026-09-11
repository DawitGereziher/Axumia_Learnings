export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
    isEmailVerified: boolean;
}
export declare const CurrentUser: (...dataOrPipes: (keyof AuthUser | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
