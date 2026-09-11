"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TranscodingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscodingProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_constants_1 = require("../queue/queue.constants");
let TranscodingProcessor = TranscodingProcessor_1 = class TranscodingProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(TranscodingProcessor_1.name);
    async process(job) {
        this.logger.log(`Processing video transcoding job ${job.id} - ${job.name}`);
        try {
            const { videoId, inputPath } = job.data;
            this.logger.log(`Transcoding video ${videoId} from ${inputPath}`);
            return { status: 'completed', videoId };
        }
        catch (error) {
            this.logger.error(`Error processing video transcoding job ${job.id}: ${error.message}`);
            throw error;
        }
    }
};
exports.TranscodingProcessor = TranscodingProcessor;
exports.TranscodingProcessor = TranscodingProcessor = TranscodingProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_constants_1.QUEUE_TRANSCODING)
], TranscodingProcessor);
//# sourceMappingURL=transcoding.processor.js.map