import { Controller, Get, Put, Body } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface UpdateSettingsDto {
  storeName?: string;
  phone?: string;
  address?: string;
  employee?: string;
}

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    let settings = await this.prisma.settings.findFirst({
      where: { id: 'singleton' },
    });
    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {
          id: 'singleton',
          storeName: "Авто Эҳтиёт Қисмлари До'кони",
          phone: "+998 90 123 45 67",
          address: "Тошкент шаҳри",
          employee: "Сотувчи",
        },
      });
    }
    return settings;
  }

  @Put()
  @Put(':id')
  async update(@Body() body: UpdateSettingsDto) {
    return this.prisma.settings.upsert({
      where: { id: 'singleton' },
      update: body,
      create: {
        id: 'singleton',
        storeName: body.storeName || "Авто Эҳтиёт Қисмлари До'кони",
        phone: body.phone || "+998 90 123 45 67",
        address: body.address || "Тошкент шаҳри",
        employee: body.employee || "Сотувчи",
      },
    });
  }
}
