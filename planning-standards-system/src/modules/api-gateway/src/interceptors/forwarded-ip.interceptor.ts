import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ForwardedIpInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    let clientIp = '';

    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      clientIp = (forwardedFor as string).split(',')[0].trim();
    } else if (request.headers['x-real-ip']) {
      clientIp = request.headers['x-real-ip'] as string;
    } else if (request.socket?.remoteAddress) {
      clientIp = request.socket.remoteAddress;
    }

    request.clientIp = clientIp;

    return next.handle();
  }
}
