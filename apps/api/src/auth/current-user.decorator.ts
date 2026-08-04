import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../users/user.entity';

// Reads the User row JwtStrategy.validate() attached to the request -
// reused by any JwtAuthGuard-protected route (AuthController.me today,
// PinterestController later) instead of each one destructuring req.user by
// hand.
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    return request.user;
  },
);
