import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { hashPassword } from '../utils/crypto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
      },
    });
  }

  @Post()
  async create(
    @Body() body: { username: string; password?: string; role: string; name: string }
  ) {
    if (!body.username || !body.role || !body.name) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }

    const exists = await this.prisma.user.findUnique({
      where: { username: body.username.toLowerCase().trim() },
    });

    if (exists) {
      throw new HttpException('Foydalanuvchi nomi band', HttpStatus.BAD_REQUEST);
    }

    // Default password is username if not provided
    const password = body.password || body.username;
    const hashed = hashPassword(password);

    return this.prisma.user.create({
      data: {
        username: body.username.toLowerCase().trim(),
        password: hashed,
        role: body.role,
        name: body.name,
      },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
      },
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { username?: string; password?: string; role?: string; name?: string }
  ) {
    const data: any = {};
    if (body.username) data.username = body.username.toLowerCase().trim();
    if (body.role) data.role = body.role;
    if (body.name) data.name = body.name;
    if (body.password) {
      data.password = hashPassword(body.password);
    }

    if (body.username) {
      const exists = await this.prisma.user.findFirst({
        where: {
          username: body.username.toLowerCase().trim(),
          NOT: { id },
        },
      });
      if (exists) {
        throw new HttpException('Foydalanuvchi nomi band', HttpStatus.BAD_REQUEST);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Prevent deleting the main admin if necessary, but we can do a simple delete
    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }
}
