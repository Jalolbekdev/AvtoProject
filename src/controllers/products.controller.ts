import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.product.findMany();
  }

  @Post()
  async create(
    @Body()
    body: {
      barcode?: string;
      name: string;
      model?: string;
      categoryId: string;
      purchasePrice: number;
      sellingPrice: number;
      quantity: number;
      image?: string;
    },
  ) {
    // Use provided barcode; if absent, auto-generate a unique one
    let barcode = body.barcode?.trim();
    if (!barcode) {
      const count = await this.prisma.product.count();
      barcode = '86' + String(count + 10001).padStart(5, '0');
    }

    return this.prisma.product.create({
      data: {
        barcode,
        name: body.name,
        model: body.model || null,
        categoryId: body.categoryId,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        quantity: body.quantity,
        image: body.image || null,
      },
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      model?: string;
      categoryId?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      quantity?: number;
      image?: string;
    },
  ) {
    return this.prisma.product.update({
      where: { id },
      data: body,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  @Post('batch')
  async createBatch(
    @Body()
    body: {
      products: Array<{
        barcode?: string;
        name: string;
        model?: string;
        categoryName?: string;
        categoryId?: string;
        purchasePrice: number;
        sellingPrice: number;
        quantity: number;
      }>;
    },
  ) {
    const categories = await this.prisma.category.findMany();
    const createdProducts: any[] = [];

    for (const item of body.products) {
      if (!item.name) continue;

      let categoryId = item.categoryId;

      // Resolve category via name if ID is absent
      if (!categoryId && item.categoryName) {
        const normalized = item.categoryName.trim().toLowerCase();
        let cat = categories.find(c => c.name.trim().toLowerCase() === normalized);
        if (!cat) {
          cat = await this.prisma.category.create({
            data: {
              name: item.categoryName.trim(),
            },
          });
          categories.push(cat);
        }
        categoryId = cat.id;
      }

      // Default category fallback
      if (!categoryId) {
        let defaultCat = categories[0];
        if (!defaultCat) {
          defaultCat = await this.prisma.category.create({
            data: {
              name: 'Умумий',
            },
          });
          categories.push(defaultCat);
        }
        categoryId = defaultCat.id;
      }

      let barcode = item.barcode?.toString().trim();
      if (!barcode) {
        const count = await this.prisma.product.count() + createdProducts.length;
        barcode = '86' + String(count + 10001).padStart(5, '0');
      }

      const existing = await this.prisma.product.findUnique({
        where: { barcode },
      });

      if (existing) {
        const updated = await this.prisma.product.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + (item.quantity || 0),
            purchasePrice: item.purchasePrice !== undefined ? item.purchasePrice : existing.purchasePrice,
            sellingPrice: item.sellingPrice !== undefined ? item.sellingPrice : existing.sellingPrice,
          },
        });
        createdProducts.push(updated);
      } else {
        const newProduct = await this.prisma.product.create({
          data: {
            barcode,
            name: item.name,
            model: item.model || null,
            categoryId,
            purchasePrice: item.purchasePrice || 0,
            sellingPrice: item.sellingPrice || 0,
            quantity: item.quantity || 0,
          },
        });
        createdProducts.push(newProduct);
      }
    }

    return createdProducts;
  }
}
