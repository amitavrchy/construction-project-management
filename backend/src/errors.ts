import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    let status = 400, message = 'The request could not be completed';
    if (error instanceof HttpException) { status = error.getStatus(); message = error.message; }
    else if (error instanceof ZodError) message = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    else if (error instanceof Prisma.PrismaClientKnownRequestError) { status = 409; message = error.code === 'P2002' ? 'A record with this reference already exists' : 'The record changed. Refresh and try again.'; }
    else if (error instanceof Error) message = error.message;
    host.switchToHttp().getResponse().status(status).json({ message, statusCode: status });
  }
}
