import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';

class PurchaseOrder extends Model {
  public id!: string;
  public orderNumber!: string;
  public productId!: string;
  public supplier!: string;
  public quantity!: number;
  public unitPrice?: number;
  public totalAmount?: number;
  public orderDate!: Date;
  public expectedDeliveryDate!: Date;
  public actualDeliveryDate?: Date;
  public status!: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  public leadTimeDays!: number;
  public actualLeadTimeDays?: number;
  public notes?: string;
  public createdBy?: string;
  public approvedBy?: string;
  public approvalDate?: Date;
  public trackingNumber?: string;
  public invoiceNumber?: string;
}

PurchaseOrder.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique purchase order number'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    },
    comment: 'Product being ordered'
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Supplier name'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Order quantity in kg'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Price per kg'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Total order amount'
  },
  orderDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date order was placed'
  },
  expectedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Expected delivery date based on lead time'
  },
  actualDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Actual delivery date when received'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current status of the order'
  },
  leadTimeDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Expected lead time in days'
  },
  actualLeadTimeDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual lead time in days (calculated after delivery)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the order'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who created the order'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who approved the order'
  },
  approvalDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date order was approved'
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Shipment tracking number'
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Supplier invoice number'
  }
}, {
  sequelize,
  modelName: 'PurchaseOrder',
  tableName: 'PurchaseOrders',
  timestamps: true,
  hooks: {
    // Calculate actual lead time when delivered
    beforeUpdate: async (order) => {
      if (order.actualDeliveryDate && !order.actualLeadTimeDays && order.orderDate) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const leadTime = Math.ceil(
          (order.actualDeliveryDate.getTime() - new Date(order.orderDate).getTime()) / msPerDay
        );
        order.actualLeadTimeDays = leadTime;
      }
    }
  }
});

export default PurchaseOrder;