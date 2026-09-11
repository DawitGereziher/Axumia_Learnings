import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_TRANSCODING } from '../queue/queue.constants';

@Processor(QUEUE_TRANSCODING)
export class TranscodingProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscodingProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing video transcoding job ${job.id} - ${job.name}`);

    // Video transcoding processing logic (e.g. ffmpeg conversion, HLS streaming)
    try {
      const { videoId, inputPath } = job.data;
      this.logger.log(`Transcoding video ${videoId} from ${inputPath}`);
      return { status: 'completed', videoId };
    } catch (error: any) {
      this.logger.error(
        `Error processing video transcoding job ${job.id}: ${error.message}`,
      );
      throw error;
    }
  }
}
