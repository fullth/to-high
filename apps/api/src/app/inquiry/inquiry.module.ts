import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InquiryDocument, InquirySchema } from '../../database/inquiry.schema';
import { InquiryService } from './inquiry.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InquiryDocument.name, schema: InquirySchema },
    ]),
  ],
  providers: [InquiryService],
  exports: [InquiryService],
})
export class InquiryModule {}
