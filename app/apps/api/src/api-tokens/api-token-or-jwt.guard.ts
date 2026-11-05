import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTokensService, isApiToken } from './api-tokens.service';

/**
 * Accepts either an `Authorization: Bearer oib_…` API token or the regular
 * JWT (header, query or cookie). Both paths leave the same `TokenPayload` on
 * `req.user`, so controllers do not care which one was used.
 */
@Injectable()
export class ApiTokenOrJwtGuard extends AuthGuard('jwt') {
  constructor(private readonly apiTokensService: ApiTokensService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: unknown = request.headers?.authorization;
    const bearer =
      typeof header === 'string' && header.toLowerCase().startsWith('bearer ')
        ? header.slice(7).trim()
        : null;

    if (bearer && isApiToken(bearer)) {
      const payload = await this.apiTokensService.validate(bearer);
      if (!payload) {
        throw new UnauthorizedException('Invalid or revoked API token');
      }
      request.user = payload;
      request.authMethod = 'api-token';
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }
}
