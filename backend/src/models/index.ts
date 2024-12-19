import User from './User';
import SKU from './SKU';
import InventoryMovement from './InventoryMovement';

// Define associations
InventoryMovement.belongsTo(SKU, { as: 'sku', foreignKey: 'skuId' });
InventoryMovement.belongsTo(SKU, { as: 'fromSku', foreignKey: 'fromSkuId' });
SKU.hasMany(InventoryMovement, { as: 'movements', foreignKey: 'skuId' });

export {
  User,
  SKU,
  InventoryMovement
}; 