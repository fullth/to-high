import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InquiryDocument, InquiryType } from '../../database/inquiry.schema';

@Injectable()
export class InquiryService {
  constructor(
    @InjectModel(InquiryDocument.name)
    private readonly inquiryModel: Model<InquiryDocument>,
  ) {}

  async create(userId: string, type: InquiryType, message: string, email?: string) {
    const inquiry = await this.inquiryModel.create({
      userId,
      type,
      email,
      messages: [{ role: 'user', content: message, createdAt: new Date() }],
    });
    return { inquiryId: inquiry._id, messages: inquiry.messages };
  }

  async addMessage(inquiryId: string, userId: string, content: string) {
    const inquiry = await this.inquiryModel.findOne({ _id: inquiryId, userId });
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');
    if (inquiry.status === 'closed') throw new Error('종료된 문의입니다.');

    inquiry.messages.push({ role: 'user', content, createdAt: new Date() });
    await inquiry.save();
    return { messages: inquiry.messages };
  }

  async getUserInquiries(userId: string) {
    return this.inquiryModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getInquiry(inquiryId: string, userId: string) {
    const inquiry = await this.inquiryModel.findOne({ _id: inquiryId, userId }).lean();
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');
    return inquiry;
  }

  // 관리자용
  async getAllInquiries() {
    return this.inquiryModel.find().sort({ updatedAt: -1 }).lean();
  }

  async adminReply(inquiryId: string, content: string) {
    const inquiry = await this.inquiryModel.findById(inquiryId);
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');

    inquiry.messages.push({ role: 'admin', content, createdAt: new Date() });
    await inquiry.save();
    return { messages: inquiry.messages };
  }

  async closeInquiry(inquiryId: string) {
    const inquiry = await this.inquiryModel.findById(inquiryId);
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');

    inquiry.status = 'closed';
    await inquiry.save();
    return { status: inquiry.status };
  }
}
