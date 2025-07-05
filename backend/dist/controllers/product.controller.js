"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductAverageConsumption = exports.getDeletedProducts = exports.recoverProduct = exports.deleteAllProducts = exports.searchProducts = exports.deleteProduct = exports.getProduct = exports.updateProduct = exports.getProductByArtisCode = exports.bulkCreateProducts = exports.createProduct = exports.getAllProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const XLSX = __importStar(require("xlsx"));
const sequelize_1 = __importDefault(require("../config/sequelize"));
const sequelize_2 = require("sequelize");
const Transaction_1 = __importDefault(require("../models/Transaction"));
const audit_service_1 = require("../services/audit.service");
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.findAll();
        const sanitizedProducts = products.map(product => (Object.assign(Object.assign({}, product.toJSON()), { catalogs: product.catalogs || [] })));
        res.json(sanitizedProducts);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});
exports.getAllProducts = getAllProducts;
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_1.default.transaction();
    try {
        const { artisCode, supplierCode, name, category, supplier, gsm, catalogs = [] } = req.body;
        if (!artisCode || !supplierCode || !supplier) {
            yield t.rollback();
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['artisCode', 'supplierCode', 'supplier']
            });
        }
        // Check if product exists with same supplier/supplierCode
        const existingProduct = yield Product_1.default.findOne({
            where: {
                supplierCode,
                supplier
            },
            transaction: t
        });
        if (existingProduct) {
            // Check if artisCode already exists in this product
            if (existingProduct.artisCodes.includes(artisCode)) {
                yield t.rollback();
                return res.status(400).json({
                    error: 'Artis code already exists for this product'
                });
            }
            // Merge artisCodes and catalogs arrays
            const mergedCatalogs = [...new Set([...(existingProduct.catalogs || []), ...catalogs])];
            // Add new artisCode to existing product
            yield existingProduct.update({
                artisCodes: [...existingProduct.artisCodes, artisCode],
                catalogs: mergedCatalogs
            }, { transaction: t });
            yield t.commit();
            return res.json(existingProduct);
        }
        // Create new product with artisCode in array
        const product = yield Product_1.default.create({
            artisCodes: [artisCode],
            name,
            category,
            supplierCode,
            supplier,
            gsm,
            catalogs: catalogs || [],
        }, { transaction: t });
        yield t.commit();
        res.status(201).json(product);
    }
    catch (error) {
        yield t.rollback();
        console.error('Error creating product:', error);
        res.status(500).json({
            error: 'Error creating product',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.createProduct = createProduct;
const bulkCreateProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const updateMode = req.query.mode === 'update';
    const skippedProducts = [];
    const validProducts = [];
    const updatedProducts = [];
    let t;
    try {
        t = yield sequelize_1.default.transaction();
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        // First pass: group rows by supplierCode and supplier
        const groupedProducts = new Map();
        for (const row of data) {
            try {
                const artisCode = ((_a = row['OUR CODE']) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                const supplierCode = ((_b = row['DESIGN CODE']) === null || _b === void 0 ? void 0 : _b.toString()) || '';
                const supplier = ((_c = row.SUPPLIER) === null || _c === void 0 ? void 0 : _c.toString()) || '';
                if (!artisCode || !supplierCode || !supplier) {
                    skippedProducts.push({
                        artisCode: artisCode || 'unknown',
                        reason: 'Missing required fields'
                    });
                    continue;
                }
                const key = `${supplierCode}:${supplier}`;
                if (!groupedProducts.has(key)) {
                    groupedProducts.set(key, {
                        name: ((_d = row.NAME) === null || _d === void 0 ? void 0 : _d.toString()) || '',
                        artisCodes: [artisCode],
                        supplierCode,
                        supplier,
                        category: ((_e = row.CATEGORY) === null || _e === void 0 ? void 0 : _e.toString()) || null,
                        catalogs: row.CATALOGS ? row.CATALOGS.toString().split(',').map(c => c.trim()) : [],
                        gsm: ((_f = row.GSM) === null || _f === void 0 ? void 0 : _f.toString()) || null,
                        texture: ((_g = row.TEXTURE) === null || _g === void 0 ? void 0 : _g.toString()) || null,
                        thickness: ((_h = row.THICKNESS) === null || _h === void 0 ? void 0 : _h.toString()) || null,
                        currentStock: 0,
                        avgConsumption: 0,
                        lastUpdated: new Date()
                    });
                }
                else {
                    const existing = groupedProducts.get(key);
                    existing.artisCodes.push(artisCode);
                    if (row.CATALOGS) {
                        const newCatalogs = row.CATALOGS.toString().split(',').map(c => c.trim());
                        existing.catalogs = [...new Set([...existing.catalogs, ...newCatalogs])];
                    }
                }
            }
            catch (error) {
                console.error('Error processing row:', error);
                skippedProducts.push({
                    artisCode: ((_j = row['OUR CODE']) === null || _j === void 0 ? void 0 : _j.toString()) || 'unknown',
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Process grouped products
        for (const product of groupedProducts.values()) {
            try {
                const existing = yield Product_1.default.findOne({
                    where: {
                        supplierCode: product.supplierCode,
                        supplier: product.supplier
                    },
                    transaction: t
                });
                if (existing) {
                    if (updateMode) {
                        const mergedArtisCodes = [...new Set([...existing.artisCodes, ...product.artisCodes])];
                        const mergedCatalogs = [...new Set([...(existing.catalogs || []), ...product.catalogs])];
                        yield existing.update(Object.assign(Object.assign({}, product), { artisCodes: mergedArtisCodes, catalogs: mergedCatalogs }), { transaction: t });
                        updatedProducts.push(existing);
                    }
                    else {
                        skippedProducts.push({
                            artisCode: product.artisCodes.join(', '),
                            reason: 'Product exists and update mode is off'
                        });
                    }
                }
                else {
                    validProducts.push(product);
                }
            }
            catch (error) {
                console.error('Error processing product:', error);
                skippedProducts.push({
                    artisCode: product.artisCodes.join(', '),
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        if (validProducts.length > 0) {
            yield Product_1.default.bulkCreate(validProducts, {
                transaction: t,
                validate: true
            });
        }
        yield t.commit();
        return res.json({
            message: 'Import completed',
            created: {
                count: validProducts.length,
                products: validProducts
            },
            updated: {
                count: updatedProducts.length,
                products: updatedProducts
            },
            skipped: {
                count: skippedProducts.length,
                products: skippedProducts
            }
        });
    }
    catch (error) {
        console.error('Bulk import error:', error);
        if (t)
            yield t.rollback();
        return res.status(500).json({
            error: 'Error processing file',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkCreateProducts = bulkCreateProducts;
const getProductByArtisCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { artisCode } = req.params;
        const product = yield Product_1.default.findOne({
            where: {
                artisCodes: {
                    [sequelize_2.Op.contains]: [artisCode]
                }
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error finding product:', error);
        res.status(500).json({ error: 'Failed to find product' });
    }
});
exports.getProductByArtisCode = getProductByArtisCode;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_1.default.transaction();
    try {
        const product = yield Product_1.default.findByPk(req.params.id, { transaction: t });
        if (!product) {
            yield t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }
        // Check if new supplierCode+supplier combination already exists
        if (req.body.supplierCode && req.body.supplier) {
            const duplicate = yield Product_1.default.findOne({
                where: {
                    id: { [sequelize_2.Op.ne]: req.params.id },
                    supplierCode: req.body.supplierCode,
                    supplier: req.body.supplier
                },
                transaction: t
            });
            if (duplicate) {
                yield t.rollback();
                return res.status(400).json({
                    error: 'Supplier code already exists for this supplier'
                });
            }
        }
        yield product.update(req.body, { transaction: t });
        yield t.commit();
        res.json(product);
    }
    catch (error) {
        yield t.rollback();
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Error updating product' });
    }
});
exports.updateProduct = updateProduct;
const getProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield Product_1.default.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Error fetching product' });
    }
});
exports.getProduct = getProduct;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const t = yield sequelize_1.default.transaction();
    try {
        const { id } = req.params;
        const { force, reason } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userName = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown';
        const product = yield Product_1.default.findByPk(id, { transaction: t });
        if (!product) {
            yield t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }
        // Check if product has transactions
        const transactionCount = yield Transaction_1.default.count({
            where: { productId: id },
            transaction: t
        });
        if (transactionCount > 0 && !force) {
            yield t.rollback();
            return res.status(400).json({
                error: 'Product has existing transactions',
                transactionCount,
                message: 'This product has transaction history. Use force=true to delete anyway.'
            });
        }
        // Soft delete by default
        product.deletedAt = new Date();
        product.deletedBy = userName;
        product.deletionReason = reason || 'No reason provided';
        yield product.save({ transaction: t });
        // Create audit log
        yield audit_service_1.AuditService.logProductDeletion(product, product.deletionReason || 'No reason provided', req);
        // Log the deletion
        console.log(`Product ${product.artisCodes[0]} soft deleted by ${userName}. Reason: ${product.deletionReason}`);
        yield t.commit();
        res.json({
            message: 'Product soft deleted successfully',
            deletedProduct: {
                id: product.id,
                artisCodes: product.artisCodes,
                name: product.name,
                deletedAt: product.deletedAt,
                deletedBy: product.deletedBy,
                reason: product.deletionReason
            }
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Error deleting product' });
    }
});
exports.deleteProduct = deleteProduct;
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.params;
        const products = yield Product_1.default.findAll({
            where: {
                [sequelize_2.Op.or]: [
                    { artisCodes: { [sequelize_2.Op.contains]: [query] } },
                    { name: { [sequelize_2.Op.iLike]: `%${query}%` } },
                    { supplierCode: { [sequelize_2.Op.iLike]: `%${query}%` } },
                    { supplier: { [sequelize_2.Op.iLike]: `%${query}%` } }
                ]
            }
        });
        res.json(products);
    }
    catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Error searching products' });
    }
});
exports.searchProducts = searchProducts;
const deleteAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // DISABLED FOR SAFETY - This function is too dangerous
    return res.status(403).json({
        error: 'Bulk product deletion is disabled for safety',
        message: 'This operation has been disabled to prevent accidental data loss. Please delete products individually if needed.'
    });
    // Original code commented out for reference:
    /*
    console.log('Delete All Products - Request received');
    console.log('User info:', req.user);
    
    const t = await sequelize.transaction();
    
    try {
      console.log('Starting product deletion');
      const result = await Product.destroy({
        where: {},
        truncate: true,
        cascade: true,
        transaction: t
      });
      
      console.log('Products deleted successfully, count:', result);
      await t.commit();
      res.json({ message: 'All products deleted successfully', count: result });
    } catch (error) {
      console.error('Error in deleteAllProducts:', error);
      await t.rollback();
      res.status(500).json({ error: 'Error deleting all products' });
    }
    */
});
exports.deleteAllProducts = deleteAllProducts;
const recoverProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const t = yield sequelize_1.default.transaction();
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userName = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown';
        const product = yield Product_1.default.findOne({
            where: {
                id,
                deletedAt: { [sequelize_2.Op.not]: null }
            },
            paranoid: false,
            transaction: t
        });
        if (!product) {
            yield t.rollback();
            return res.status(404).json({ error: 'Deleted product not found' });
        }
        // Recover the product
        product.deletedAt = undefined;
        product.deletedBy = undefined;
        product.deletionReason = undefined;
        yield product.save({ transaction: t });
        // Log the recovery
        yield audit_service_1.AuditService.log({
            action: 'RECOVER',
            entityType: 'Product',
            entityId: product.id,
            entityData: {
                artisCodes: product.artisCodes,
                name: product.name
            },
            reason: 'Product recovered from deletion',
            req
        });
        console.log(`Product ${product.artisCodes[0]} recovered by ${userName}`);
        yield t.commit();
        res.json({
            message: 'Product recovered successfully',
            product
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error recovering product:', error);
        res.status(500).json({ error: 'Error recovering product' });
    }
});
exports.recoverProduct = recoverProduct;
const getDeletedProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedProducts = yield Product_1.default.findAll({
            where: {
                deletedAt: { [sequelize_2.Op.not]: null }
            },
            paranoid: false,
            order: [['deletedAt', 'DESC']]
        });
        res.json(deletedProducts);
    }
    catch (error) {
        console.error('Error fetching deleted products:', error);
        res.status(500).json({ error: 'Error fetching deleted products' });
    }
});
exports.getDeletedProducts = getDeletedProducts;
const updateProductAverageConsumption = (productId, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.findByPk(productId, { transaction });
        if (!product) {
            throw new Error('Product not found');
        }
        // Get all OUT transactions that should be included in average calculation
        // This explicitly excludes any CORRECTION transactions as they don't have type='OUT'
        const outTransactions = yield Transaction_1.default.findAll({
            where: {
                productId,
                type: 'OUT',
                includeInAvg: true
            },
            order: [['date', 'ASC']], // Order by date ascending to find first usage
            transaction,
            attributes: ['quantity', 'date']
        });
        console.log(`Found ${outTransactions.length} OUT transactions for product ${productId}`);
        if (outTransactions.length === 0) {
            // No transactions, set average to 0
            yield product.update({ avgConsumption: 0 }, { transaction });
            return 0;
        }
        // Find the first transaction with non-zero quantity
        const firstNonZeroIndex = outTransactions.findIndex(t => Number(t.quantity) > 0);
        if (firstNonZeroIndex === -1) {
            // No non-zero transactions, set average to 0
            yield product.update({ avgConsumption: 0 }, { transaction });
            return 0;
        }
        // Get the date of the first non-zero transaction
        const firstUsageDate = outTransactions[firstNonZeroIndex].date;
        console.log(`First usage date: ${firstUsageDate}`);
        // Filter transactions to only include those after the first usage
        const relevantTransactions = outTransactions.filter(t => new Date(t.date) >= new Date(firstUsageDate));
        console.log(`Relevant transactions count: ${relevantTransactions.length}`);
        // Calculate total quantity from relevant transactions
        const totalOutQuantity = relevantTransactions.reduce((sum, t) => {
            const qty = Number(t.quantity);
            return sum + qty;
        }, 0);
        console.log(`Total OUT quantity: ${totalOutQuantity}`);
        // Group transactions by month to count unique months with data
        const monthsWithData = new Set();
        relevantTransactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            monthsWithData.add(monthKey);
        });
        const uniqueMonthsCount = monthsWithData.size;
        console.log(`Unique months with data: ${uniqueMonthsCount}`);
        // Calculate average based on unique months with data
        const avgConsumption = uniqueMonthsCount > 0
            ? Number((totalOutQuantity / uniqueMonthsCount).toFixed(2))
            : 0;
        console.log(`Calculated average consumption: ${avgConsumption}`);
        yield product.update({
            avgConsumption
        }, { transaction });
        return avgConsumption;
    }
    catch (error) {
        console.error('Error updating average consumption:', error);
        throw error;
    }
});
exports.updateProductAverageConsumption = updateProductAverageConsumption;
