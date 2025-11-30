import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createCatalogProduct,
  fetchPriceListSummaries,
  importPriceListFromXlsx,
  fetchProductCatalog,
  fetchWarehousesForDistributor,
  fetchPriceHistory,
  updateCatalogProduct,
  updateProductPriceItem
} from './catalog.service';
import {
  createProductSchema,
  listPriceListSchema,
  listProductsSchema,
  listWarehousesSchema,
  updatePriceItemSchema,
  updateProductSchema,
  listImportHistorySchema,
  priceHistorySchema
} from './catalog.schemas';
import { requirePermission } from '../../middleware/permissions';
import multer from 'multer';

export const catalogRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

catalogRouter.get(
  '/products',
  requirePermission('catalog:read'),
  validateRequest(listProductsSchema),
  asyncHandler(async (req, res) => {
    const { search, categoryId, priceListId, minPrice, maxPrice, sortBy, sortDir, limit, offset } = req.query as Record<
      string,
      string
    >;
    const products = await fetchProductCatalog({
      search,
      categoryId,
      priceListId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy as any,
      sortDir: sortDir as any,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });
    res.json({ data: products });
  })
);

catalogRouter.post(
  '/products',
  authorize('admin'),
  requirePermission('catalog:write'),
  validateRequest(createProductSchema),
  asyncHandler(async (req, res) => {
    const product = await createCatalogProduct(req.body, req.user);
    res.status(201).json({ data: product });
  })
);

catalogRouter.patch(
  '/products/:id',
  authorize('admin'),
  requirePermission('catalog:write'),
  validateRequest(updateProductSchema),
  asyncHandler(async (req, res) => {
    const updated = await updateCatalogProduct(req.params.id, req.body, req.user);
    res.json({ data: updated });
  })
);

catalogRouter.patch(
  '/products/:productId/price-items',
  authorize('admin'),
  requirePermission('catalog:write'),
  validateRequest(updatePriceItemSchema),
  asyncHandler(async (req, res) => {
    await updateProductPriceItem(req.params.productId, req.body, req.user);
    res.status(204).send();
  })
);

catalogRouter.get(
  '/price-lists',
  requirePermission('catalog:read'),
  validateRequest(listPriceListSchema),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.query as Record<string, string>;
    const priceLists = await fetchPriceListSummaries(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
    res.json({ data: priceLists });
  })
);

catalogRouter.get(
  '/price-lists/imports',
  requirePermission('catalog:read'),
  validateRequest(listImportHistorySchema),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as Record<string, string>;
    const history = await fetchImportHistory(limit ? Number(limit) : undefined);
    res.json({ data: history });
  })
);

catalogRouter.get(
  '/products/:id/price-history',
  requirePermission('catalog:read'),
  validateRequest(priceHistorySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as Record<string, string>;
    const { limit } = req.query as Record<string, string>;
    const data = await fetchPriceHistory(id, limit ? Number(limit) : undefined);
    res.json({ data });
  })
);

catalogRouter.get(
  '/warehouses',
  requirePermission('inventory:read'),
  validateRequest(listWarehousesSchema),
  asyncHandler(async (req, res) => {
    const warehouses = await fetchWarehousesForDistributor(
      req.user,
      (req.query as Record<string, string>).distributorId
    );
    res.json({ data: warehouses });
  })
);

catalogRouter.post(
  '/price-lists/import',
  authorize('admin'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new Error('File is required');
    }
    const priceListId = (req.body?.priceListId as string) ?? undefined;
    const result = await importPriceListFromXlsx(req.file.buffer, {
      priceListId,
      user: req.user
    });
    res.status(201).json({ data: result });
  })
);
