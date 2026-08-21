import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class ChatRequestLimitService {
  private readonly activeSessionRequests = new Set<string>();

  acquire(sessionId: string): () => void {
    if (this.activeSessionRequests.has(sessionId)) {
      throw new HttpException(
        '이 이야기에 대한 응답을 만들고 있어요. 잠시 후 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.activeSessionRequests.add(sessionId);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeSessionRequests.delete(sessionId);
    };
  }
}
