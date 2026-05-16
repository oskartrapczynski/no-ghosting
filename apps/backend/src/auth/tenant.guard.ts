import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";

/**
 * Reads tenantId from the `x-tenant-id` header and attaches it to the request.
 * Foundation only — must be replaced with real auth (JWT / session) that
 * derives tenantId from a verified principal before SaaS launch.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId || typeof tenantId !== "string") {
      throw new UnauthorizedException("Missing x-tenant-id header");
    }
    req.tenantId = tenantId;
    return true;
  }
}
