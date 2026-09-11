"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscodingModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const transcoding_processor_1 = require("./transcoding.processor");
const queue_constants_1 = require("../queue/queue.constants");
let TranscodingModule = class TranscodingModule {
};
exports.TranscodingModule = TranscodingModule;
exports.TranscodingModule = TranscodingModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: queue_constants_1.QUEUE_TRANSCODING })],
        providers: [transcoding_processor_1.TranscodingProcessor],
        exports: [transcoding_processor_1.TranscodingProcessor],
    })
], TranscodingModule);
//# sourceMappingURL=transcoding.module.js.map