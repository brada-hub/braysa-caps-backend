import 'dotenv/config';
import { PrismaClient, UserRole, MovementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TENANT_ID = 'e9b1b369-2f22-443b-b236-4767117f7eb0';

async function main() {
  console.log('🚀 Iniciando proceso de siembra de base de datos (Seed) para Ksera Caps...');

  // 1. Crear o actualizar Tenant
  console.log('📦 1. Sembrando Tenant principal...');
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {
      businessName: 'Ksera Caps',
      nitRut: '00000000',
      currency: 'BOB',
      isActive: true,
    },
    create: {
      id: TENANT_ID,
      businessName: 'Ksera Caps',
      nitRut: '00000000',
      currency: 'BOB',
      isActive: true,
    },
  });
  console.log(`   ✅ Tenant confirmado: ${tenant.businessName} (ID: ${tenant.id})`);

  // 2. Crear Usuarios (Administrador y Cajera)
  console.log('👥 2. Sembrando Usuarios del sistema...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const cashierPasswordHash = await bcrypt.hash('caja123', 10);

  const adminUser = await prisma.user.upsert({
    where: {
      uq_users_tenant_email: {
        tenantId: tenant.id,
        email: 'admin@ksera.bo',
      },
    },
    update: {
      name: 'Administrador Ksera',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: 'Administrador Ksera',
      email: 'admin@ksera.bo',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`   ✅ Usuario Admin: ${adminUser.email} (Rol: ${adminUser.role})`);

  const cashierUser = await prisma.user.upsert({
    where: {
      uq_users_tenant_email: {
        tenantId: tenant.id,
        email: 'cajera@ksera.bo',
      },
    },
    update: {
      name: 'Cajera Mostrador',
      passwordHash: cashierPasswordHash,
      role: UserRole.CASHIER,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: 'Cajera Mostrador',
      email: 'cajera@ksera.bo',
      passwordHash: cashierPasswordHash,
      role: UserRole.CASHIER,
      isActive: true,
    },
  });
  console.log(`   ✅ Usuario Cajero: ${cashierUser.email} (Rol: ${cashierUser.role})`);

  // 3. Crear Categorías de Gorras
  console.log('🏷️ 3. Sembrando Categorías...');
  const categoriesData = [
    {
      name: 'Gorras Planas (Snapback)',
      slug: 'gorras-planas-snapback',
    },
    {
      name: 'Gorras Curvas (Baseball / Trucker)',
      slug: 'gorras-curvas-baseball-trucker',
    },
    {
      name: 'Gorras Vintage / Retro',
      slug: 'gorras-vintage-retro',
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: {
        uq_categories_tenant_slug: {
          tenantId: tenant.id,
          slug: cat.slug,
        },
      },
      update: {
        name: cat.name,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        name: cat.name,
        slug: cat.slug,
        isActive: true,
      },
    });
    categoryMap.set(cat.slug, category.id);
    console.log(`   ✅ Categoría: ${category.name} (ID: ${category.id})`);
  }

  // 4. Crear Productos y Variantes Reales
  console.log('🧢 4. Sembrando Productos y Variantes de Gorras...');

  const productsCatalog = [
    {
      name: 'Gorra Yankees New Era',
      brand: 'New Era',
      categorySlug: 'gorras-planas-snapback',
      description: 'Gorra oficial New York Yankees con bordado 3D de alta densidad en relieve.',
      variants: [
        {
          sku: 'NY-SNAP-BLK',
          barcode: '7771000101',
          color: 'Negro',
          sizeOrModel: 'Snapback',
          currentStock: 15,
          currentUnitCost: 35.0,
          salePrice: 75.0,
          minStockThreshold: 3,
        },
        {
          sku: 'NY-CURV-NVY',
          barcode: '7771000102',
          color: 'Azul Marino',
          sizeOrModel: 'Curva',
          currentStock: 12,
          currentUnitCost: 35.0,
          salePrice: 75.0,
          minStockThreshold: 3,
        },
      ],
    },
    {
      name: 'Gorra Boston Red Sox',
      brand: 'New Era',
      categorySlug: 'gorras-curvas-baseball-trucker',
      description: 'Gorra clásica Boston Red Sox visera curva con bordado B frontal.',
      variants: [
        {
          sku: 'BOS-CURV-RED',
          barcode: '7771000201',
          color: 'Rojo',
          sizeOrModel: 'Curva',
          currentStock: 10,
          currentUnitCost: 38.0,
          salePrice: 80.0,
          minStockThreshold: 3,
        },
      ],
    },
    {
      name: 'Gorra Chicago Bulls',
      brand: 'Mitchell & Ness',
      categorySlug: 'gorras-planas-snapback',
      description: 'Gorra urbana Chicago Bulls NBA, visera plana con cierre snapback ajustable.',
      variants: [
        {
          sku: 'CHI-SNAP-BLKRED',
          barcode: '7771000301',
          color: 'Negro / Rojo',
          sizeOrModel: 'Snapback',
          currentStock: 10,
          currentUnitCost: 40.0,
          salePrice: 85.0,
          minStockThreshold: 3,
        },
      ],
    },
    {
      name: 'Gorra Trucker Lisa',
      brand: 'Ksera Blank',
      categorySlug: 'gorras-curvas-baseball-trucker',
      description: 'Gorra estilo camionero con malla trasera transpirable de alta resistencia.',
      variants: [
        {
          sku: 'TRK-LISA-BRN',
          barcode: '7771000401',
          color: 'Café / Malla Beige',
          sizeOrModel: 'Trucker',
          currentStock: 20,
          currentUnitCost: 25.0,
          salePrice: 50.0,
          minStockThreshold: 4,
        },
      ],
    },
  ];

  for (const prodData of productsCatalog) {
    const categoryId = categoryMap.get(prodData.categorySlug);
    if (!categoryId) {
      throw new Error(`Categoría no encontrada para el slug: ${prodData.categorySlug}`);
    }

    // Buscar si el producto ya existe por nombre y tenant
    let product = await prisma.product.findFirst({
      where: {
        tenantId: tenant.id,
        name: prodData.name,
      },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: categoryId,
          name: prodData.name,
          brand: prodData.brand,
          description: prodData.description,
          isActive: true,
        },
      });
      console.log(`   ➕ Producto Creado: ${product.name}`);
    } else {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          categoryId: categoryId,
          brand: prodData.brand,
          description: prodData.description,
          isActive: true,
        },
      });
      console.log(`   🔄 Producto Actualizado: ${product.name}`);
    }

    // Variantes
    for (const varData of prodData.variants) {
      const variant = await prisma.productVariant.upsert({
        where: {
          uq_variants_tenant_sku: {
            tenantId: tenant.id,
            sku: varData.sku,
          },
        },
        update: {
          productId: product.id,
          color: varData.color,
          sizeOrModel: varData.sizeOrModel,
          salePrice: varData.salePrice,
          currentUnitCost: varData.currentUnitCost,
          currentStock: varData.currentStock,
          minStockThreshold: varData.minStockThreshold,
          barcode: varData.barcode,
          isActive: true,
        },
        create: {
          tenantId: tenant.id,
          productId: product.id,
          sku: varData.sku,
          barcode: varData.barcode,
          color: varData.color,
          sizeOrModel: varData.sizeOrModel,
          salePrice: varData.salePrice,
          currentUnitCost: varData.currentUnitCost,
          currentStock: varData.currentStock,
          minStockThreshold: varData.minStockThreshold,
          isActive: true,
        },
      });

      console.log(
        `      ✨ Variante [${variant.sku}] - ${variant.color} ${variant.sizeOrModel} | Stock: ${variant.currentStock} | Precio: ${variant.salePrice} BOB`,
      );

      // Movimiento inicial de Kardex si no existe para garantizar trazabilidad
      const existingKardex = await prisma.inventoryKardex.findFirst({
        where: {
          tenantId: tenant.id,
          variantId: variant.id,
          movementType: MovementType.COMPRA,
        },
      });

      if (!existingKardex) {
        await prisma.inventoryKardex.create({
          data: {
            tenantId: tenant.id,
            variantId: variant.id,
            movementType: MovementType.COMPRA,
            quantity: variant.currentStock,
            previousStock: 0,
            newStock: variant.currentStock,
            unitCost: variant.currentUnitCost,
            userId: adminUser.id,
            referenceId: 'INICIAL-SEED',
            notes: 'Carga de stock inicial de apertura por Seed',
          },
        });
      }
    }
  }

  console.log('\n🎉 ¡Base de datos inicializada exitosamente con datos semilla de Ksera Caps!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
