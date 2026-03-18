import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AdminAccessRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  walletAddress: string;
  name: string;
  role?: AdminAccessRole;
  customRoleName?: string | null;
  isActive?: boolean;
  tokenType?: string;
}

const ADMIN_AUTH_TOKEN_TYPE = 'admin_auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    if (payload.tokenType !== ADMIN_AUTH_TOKEN_TYPE) {
      throw new UnauthorizedException('Invalid admin token type');
    }

    if (
      !payload.sub ||
      !payload.walletAddress ||
      !payload.name ||
      !payload.role
    ) {
      throw new UnauthorizedException('Invalid admin token payload');
    }
    if (payload.isActive === false) {
      throw new UnauthorizedException('Admin access is disabled');
    }

    return {
      id: payload.sub,
      walletAddress: payload.walletAddress,
      name: payload.name,
      role: payload.role,
      customRoleName: payload.customRoleName ?? null,
    };
  }
}
