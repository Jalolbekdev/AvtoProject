import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { hashPassword, generateToken } from '../utils/crypto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('login')
  async login(
    @Body() body: { username?: string; password?: string }
  ) {
    const { username, password } = body;
    if (!username || !password) {
      throw new HttpException('Username and password are required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!user) {
      throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.UNAUTHORIZED);
    }

    const hashed = hashPassword(password);
    if (user.password !== hashed) {
      throw new HttpException('Noto\'g\'ri parol', HttpStatus.UNAUTHORIZED);
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    };
  }
}
