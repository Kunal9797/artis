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
exports.updateProductAverageConsumption = exports.deleteAllProducts = exports.searchProducts = exports.deleteProduct = exports.getProduct = exports.updateProduct = exports.getProductByArtisCode = exports.bulkCreateProducts = exports.createProduct = exports.getAllProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const XLSX = __importStar(require("xlsx"));
const database_1 = __importDefault(require("../config/database"));
const sequelize_1 = require("sequelize");
const Transaction_1 = __importDefault(require("../models/Transaction"));
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
    const t = yield database_1.default.transaction();
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
        t = yield database_1.default.transaction();
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
                    [sequelize_1.Op.contains]: [artisCode]
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
    const t = yield database_1.default.transaction();
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
                    id: { [sequelize_1.Op.ne]: req.params.id },
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
    const t = yield database_1.default.transaction();
    try {
        const { id } = req.params;
        const product = yield Product_1.default.findByPk(id, { transaction: t });
        if (!product) {
            yield t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }
        yield product.destroy({ transaction: t });
        yield t.commit();
        res.json({ message: 'Product deleted successfully' });
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
                [sequelize_1.Op.or]: [
                    { artisCodes: { [sequelize_1.Op.contains]: [query] } },
                    { name: { [sequelize_1.Op.iLike]: `%${query}%` } },
                    { supplierCode: { [sequelize_1.Op.iLike]: `%${query}%` } },
                    { supplier: { [sequelize_1.Op.iLike]: `%${query}%` } }
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
    const t = yield database_1.default.transaction();
    try {
        yield Product_1.default.destroy({
            where: {},
            transaction: t
        });
        yield t.commit();
        res.json({ message: 'All products deleted successfully' });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error deleting all products:', error);
        res.status(500).json({ error: 'Error deleting all products' });
    }
});
exports.deleteAllProducts = deleteAllProducts;
const updateProductAverageConsumption = (productId, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.findByPk(productId, { transaction });
        if (!product) {
            throw new Error('Product not found');
        }
        const outTransactions = yield Transaction_1.default.findAll({
            where: {
                productId,
                type: 'OUT',
                includeInAvg: true
            },
            transaction,
            attributes: ['quantity']
        });
        console.log(`Found ${outTransactions.length} OUT transactions for product ${productId}`);
        const totalOutQuantity = outTransactions.reduce((sum, t) => {
            const qty = Number(t.quantity);
            console.log(`Transaction quantity: ${qty}`);
            return sum + qty;
        }, 0);
        console.log(`Total OUT quantity: ${totalOutQuantity}`);
        const avgConsumption = outTransactions.length > 0
            ? Number((totalOutQuantity / outTransactions.length).toFixed(2))
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
