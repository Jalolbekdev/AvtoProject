import { Controller, Get, Post, Patch, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface SaleItemDto {
  productId: string;
  name: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
}

interface CreateSaleDto {
  customerId?: string;
  items: SaleItemDto[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: string;
  downPayment?: number;
  remainingDebt?: number;
  employee?: string;
}

interface ProcessPaymentDto {
  customerId: string;
  paymentAmount: number;
  paymentType?: string;
  updatedSales?: Array<{
    id: string;
    downPayment: number;
    remainingDebt: number;
  }>;
}

@Controller('api/sales')
export class SalesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    const sales = await this.prisma.sale.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return sales.map(s => ({
      ...s,
      createdAt: s.createdAt.getTime(),
    }));
  }

  @Post()
  async create(@Body() body: CreateSaleDto) {
    const sale = await this.prisma.$transaction(async (tx) => {
      // 1. Update product quantities in stock
      for (const item of body.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (prod) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: Math.max(0, prod.quantity - item.quantity),
            },
          });
        }
      }

      // 2. Fetch active employee from settings if not supplied in body
      let employeeName = body.employee;
      if (!employeeName) {
        const settings = await tx.settings.findFirst({
          where: { id: 'singleton' },
        });
        employeeName = settings?.employee || 'Сотувчи';
      }

      // 3. Generate invoice number
      const count = await tx.sale.count();
      const invoiceNumber = '#' + String(count + 1001);

      // 4. Record sale
      return tx.sale.create({
        data: {
          invoiceNumber,
          employee: employeeName,
          customerId: body.customerId || null,
          subtotal: body.subtotal,
          discount: body.discount,
          total: body.total,
          paymentType: body.paymentType,
          downPayment: body.downPayment ?? null,
          remainingDebt: body.remainingDebt ?? null,
          items: {
            create: body.items.map(i => ({
              productId: i.productId,
              name: i.name,
              unitPrice: i.unitPrice,
              purchasePrice: i.purchasePrice,
              quantity: i.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    });

    return {
      ...sale,
      createdAt: sale.createdAt.getTime(),
    };
  }

  @Patch('payment')
  async processPayment(@Body() body: ProcessPaymentDto) {
    if (!body.customerId || !body.paymentAmount || body.paymentAmount <= 0) {
      throw new BadRequestException("Mijoz ID si va to'lov summasi ko'rsatilishi shart!");
    }

    await this.prisma.$transaction(async (tx) => {
      if (body.updatedSales && body.updatedSales.length > 0) {
        for (const item of body.updatedSales) {
          await tx.sale.update({
            where: { id: item.id },
            data: {
              downPayment: item.downPayment,
              remainingDebt: item.remainingDebt,
            },
          });
        }
      } else {
        const customerSales = await tx.sale.findMany({
          where: {
            customerId: body.customerId,
            remainingDebt: { gt: 0 },
          },
          orderBy: { createdAt: 'asc' },
        });

        const totalDebt = customerSales.reduce((sum, s) => sum + (s.remainingDebt ?? 0), 0);

        if (totalDebt > 0) {
          for (const sale of customerSales) {
            const saleDebt = sale.remainingDebt ?? 0;
            const salePortion = (saleDebt / totalDebt) * body.paymentAmount;
            const newRemainingDebt = Math.max(0, saleDebt - salePortion);
            const newDownPayment = (sale.downPayment ?? 0) + salePortion;

            await tx.sale.update({
              where: { id: sale.id },
              data: {
                downPayment: newDownPayment,
                remainingDebt: newRemainingDebt,
              },
            });
          }
        }
      }

      await tx.debtPayment.create({
        data: {
          customerId: body.customerId,
          amount: body.paymentAmount,
        },
      });
    });

    const updatedSales = await this.prisma.sale.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return updatedSales.map(s => ({
      ...s,
      createdAt: s.createdAt.getTime(),
    }));
  }
}

