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

  async create(userId: string | null, type: InquiryType, message: string, email?: string) {
    const data: any = {
      type,
      email,
      messages: [{ role: 'user', content: message, createdAt: new Date() }],
    };
    if (userId) {
      data.userId = userId;
    }
    const inquiry = await this.inquiryModel.create(data);
    return { inquiryId: inquiry._id.toString(), messages: inquiry.messages };
  }

  async addMessage(inquiryId: string, userId: string | null, content: string) {
    // 비회원인 경우 inquiryId만으로 조회
    const query = userId ? { _id: inquiryId, userId } : { _id: inquiryId };
    const inquiry = await this.inquiryModel.findOne(query);
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
