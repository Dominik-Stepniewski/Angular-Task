import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { InvalidAnnotationError } from '../../domain/errors/invalid-annotation.error';

interface JsonResponse {
  status(code: number): { json(body: unknown): void };
}

@Catch(InvalidAnnotationError)
export class InvalidAnnotationFilter implements ExceptionFilter {
  catch(exception: InvalidAnnotationError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<JsonResponse>();
    const body = new BadRequestException(exception.message).getResponse();
    res.status(400).json(body);
  }
}
