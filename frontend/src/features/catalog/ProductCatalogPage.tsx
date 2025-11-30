import { useMemo, useState } from 'react';
import styles from './ProductCatalogPage.module.css';
import {
  useCatalogProducts,
  importPriceList,
  usePriceListHistory,
  updateProductRequest,
  updatePriceItemRequest,
  usePriceHistory
} from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';

const columns = [
  { key: 'categoryName', label: 'Category' },
  { key: 'name', label: 'Product' },
  { key: 'hsnCode', label: 'HSN' },
  { key: 'packSize', label: 'Pack' },
  { key: 'ratio', label: 'Ratio' },
  { key: 'discountPercent', label: 'Discount %' },
  { key: 'priceWithoutTax', label: 'Price w/o Tax' },
  { key: 'price', label: 'DPL' },
  { key: 'priceWithTax', label: 'DPL with Tax' },
  { key: 'promo', label: 'Promo' },
  { key: 'mrp', label: 'MRP' },
  { key: 'status', label: 'Status' }
];

export const ProductCatalogPage = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'updatedAt'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPack, setFilterPack] = useState('');
  const [filterDiscountMin, setFilterDiscountMin] = useState('');
  const productsQuery = useCatalogProducts({
    search,
    sortBy,
    sortDir,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined
  });
  const historyQuery = usePriceListHistory(10);
  const priceHistoryQuery = usePriceHistory(editProduct?.id, 10);

  const filteredProducts = useMemo(() => {
    if (!productsQuery.data) return [];
    return productsQuery.data.filter((p: any) => {
      const catOk = filterCategory ? (p.categoryName ?? '').toLowerCase().includes(filterCategory.toLowerCase()) : true;
      const packOk = filterPack ? (p.packSize ?? '').toLowerCase().includes(filterPack.toLowerCase()) : true;
      const discOk =
        filterDiscountMin !== ''
          ? Number(p.discountPercent ?? 0) >= Number(filterDiscountMin)
          : true;
      return catOk && packOk && discOk;
    });
  }, [productsQuery.data, filterCategory, filterPack, filterDiscountMin]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadStatus('Uploading...');
      const result = await importPriceList(file);
      setUploadErrors(result.errors ?? []);
      setUploadStatus(
        `Upload complete. Inserted ${result.inserted ?? 0}, updated ${result.updated ?? 0}` +
          (result.errors?.length ? `, ${result.errors.length} errors` : '')
      );
      void productsQuery.refetch();
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      event.target.value = '';
    }
  };

  const handleEditSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editProduct) return;
    setEditStatus('Saving...');
    try {
      await updateProductRequest(editProduct.id, {
        name: editProduct.name,
        hsnCode: editProduct.hsnCode,
        packSize: editProduct.packSize,
        ratio: editProduct.ratio,
        basePrice: editProduct.basePrice ? Number(editProduct.basePrice) : null,
        status: editProduct.status
      });
      if (editProduct.priceListId) {
        await updatePriceItemRequest(editProduct.id, {
          priceListId: editProduct.priceListId,
          price: editProduct.price ? Number(editProduct.price) : null,
          discountPercent: editProduct.discountPercent ? Number(editProduct.discountPercent) : null,
          priceWithoutTax: editProduct.priceWithoutTax ? Number(editProduct.priceWithoutTax) : null,
          priceWithTax: editProduct.priceWithTax ? Number(editProduct.priceWithTax) : null,
          promo: editProduct.promo ? Number(editProduct.promo) : null,
          mrp: editProduct.mrp ? Number(editProduct.mrp) : null
        });
      }
      setEditStatus('Saved');
      setEditProduct(null);
      void productsQuery.refetch();
    } catch (error) {
      setEditStatus(error instanceof Error ? error.message : 'Save failed');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Catalog</p>
          <h3>Price list & products</h3>
        </div>
        <div className={styles.controls}>
          <input
            placeholder="Search product or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <input
            placeholder="Category filter"
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
          />
          <input
            placeholder="Pack filter"
            value={filterPack}
            onChange={(event) => setFilterPack(event.target.value)}
          />
          <input
            type="number"
            placeholder="Min discount %"
            value={filterDiscountMin}
            onChange={(event) => setFilterDiscountMin(event.target.value)}
          />
          <input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as any)}>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="updatedAt">Updated</option>
          </select>
          <select value={sortDir} onChange={(event) => setSortDir(event.target.value as any)}>
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>

      {isAdmin && (
        <section className={styles.panel}>
          <div className={styles.upload}>
            <strong>Superadmin upload:</strong>
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} />
            {uploadStatus && <span className={styles.message}>{uploadStatus}</span>}
          </div>
          <p className={styles.message}>
            Columns supported: Category Name, Product Name, HSN, QTY, KGS/Ml/LTr, Ratio, Discount %, Price without Tax,
            DPL, DPL With Tax, Promo, MRP.
          </p>
          {uploadErrors.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadErrors.map((err) => (
                    <tr key={`${err.row}-${err.message}`}>
                      <td>{err.row}</td>
                      <td>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className={styles.panel}>
        {productsQuery.isLoading && <p className={styles.message}>Loading products...</p>}
        {productsQuery.error instanceof Error && <p className={styles.error}>{productsQuery.error.message}</p>}
        {filteredProducts && filteredProducts.length === 0 && !productsQuery.isLoading && !productsQuery.error && (
          <p className={styles.empty}>No products found. Upload a price list or adjust your search/filters.</p>
        )}
        {filteredProducts && filteredProducts.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p: any) => (
                  <tr key={p.id} onClick={() => isAdmin && setEditProduct(p)}>
                    <td>{p.categoryName ?? '-'}</td>
                    <td>{p.name || p.productName || '-'}</td>
                    <td>{p.hsnCode ?? '-'}</td>
                    <td>{p.packSize ?? '-'}</td>
                    <td>{p.ratio ?? '-'}</td>
                    <td>{p.discountPercent ?? '-'}</td>
                    <td>{p.priceWithoutTax ?? '-'}</td>
                    <td>{p.price ?? '-'}</td>
                    <td>{p.priceWithTax ?? '-'}</td>
                    <td>{p.promo ?? '-'}</td>
                    <td>{p.mrp ?? '-'}</td>
                    <td>{p.status ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className={styles.panel}>
          <div className={styles.historyHeader}>
            <strong>Import history</strong>
            {historyQuery.isLoading && <span className={styles.message}>Loading…</span>}
            {historyQuery.error instanceof Error && <span className={styles.error}>{historyQuery.error.message}</span>}
          </div>
          {historyQuery.data && historyQuery.data.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Currency</th>
                    <th>Valid From</th>
                    <th>Valid To</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data.map((row: any) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.currency}</td>
                      <td>{row.validFrom ?? '-'}</td>
                      <td>{row.validTo ?? '-'}</td>
                      <td>{row.createdAt ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !historyQuery.isLoading &&
            !historyQuery.error && <p className={styles.message}>No imports recorded yet.</p>
          )}
        </section>
      )}

      {isAdmin && editProduct && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h4>Edit product</h4>
              <button className={styles.close} onClick={() => setEditProduct(null)}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleEditSave}>
              <input
                value={editProduct.name ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, name: e.target.value }))}
                placeholder="Name"
                required
              />
              <input
                value={editProduct.hsnCode ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, hsnCode: e.target.value }))}
                placeholder="HSN"
              />
              <input
                value={editProduct.packSize ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, packSize: e.target.value }))}
                placeholder="Pack size"
              />
              <input
                value={editProduct.ratio ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, ratio: e.target.value }))}
                placeholder="Ratio"
              />
              <input
                type="number"
                value={editProduct.basePrice ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, basePrice: e.target.value }))}
                placeholder="Base price"
              />
              <input
                type="number"
                value={editProduct.price ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, price: e.target.value }))}
                placeholder="DPL price"
              />
              <input
                type="number"
                value={editProduct.priceWithoutTax ?? ''}
                onChange={(e) =>
                  setEditProduct((p: any) => ({ ...p, priceWithoutTax: e.target.value }))
                }
                placeholder="Price w/o tax"
              />
              <input
                type="number"
                value={editProduct.priceWithTax ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, priceWithTax: e.target.value }))}
                placeholder="Price with tax"
              />
              <input
                type="number"
                value={editProduct.discountPercent ?? ''}
                onChange={(e) =>
                  setEditProduct((p: any) => ({ ...p, discountPercent: e.target.value }))
                }
                placeholder="Discount %"
              />
              <input
                type="number"
                value={editProduct.promo ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, promo: e.target.value }))}
                placeholder="Promo"
              />
              <input
                type="number"
                value={editProduct.mrp ?? ''}
                onChange={(e) => setEditProduct((p: any) => ({ ...p, mrp: e.target.value }))}
                placeholder="MRP"
              />
              <label className={styles.toggle}>
                Status
                <select
                  value={editProduct.status ?? 'active'}
                  onChange={(e) => setEditProduct((p: any) => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className={styles.modalActions}>
                <button type="button" className="btn secondary" onClick={() => setEditProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save
                </button>
              </div>
              {editStatus && <p className={styles.message}>{editStatus}</p>}
            </form>
            <div className={styles.history}>
              <h5>Price history</h5>
              {priceHistoryQuery.isLoading && <p className={styles.message}>Loading…</p>}
              {priceHistoryQuery.error instanceof Error && (
                <p className={styles.error}>{priceHistoryQuery.error.message}</p>
              )}
              {priceHistoryQuery.data && priceHistoryQuery.data.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Price list</th>
                        <th>Price</th>
                        <th>Disc %</th>
                        <th>Price w/o tax</th>
                        <th>Price with tax</th>
                        <th>Promo</th>
                        <th>MRP</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceHistoryQuery.data.map((h: any) => (
                        <tr key={h.id}>
                          <td>{h.priceListName ?? h.priceListId ?? '-'}</td>
                          <td>{h.price ?? '-'}</td>
                          <td>{h.discountPercent ?? '-'}</td>
                          <td>{h.priceWithoutTax ?? '-'}</td>
                          <td>{h.priceWithTax ?? '-'}</td>
                          <td>{h.promo ?? '-'}</td>
                          <td>{h.mrp ?? '-'}</td>
                          <td>{new Date(h.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !priceHistoryQuery.isLoading && <p className={styles.message}>No history yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
