import { AuditLog } from '../models';
import { Request } from 'express';

interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  entityData?: any;
  reason?: string;
  req: Request;
}

export class AuditService {
  static async log(data: AuditLogData) {
    try {
      const user = (data.req as any).user;
      
      await AuditLog.create({
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityData: data.entityData,
        userId: user?.id || 'system',
        userName: user?.name || 'System',
        userRole: user?.role,
        reason: data.reason,
        ipAddress: data.req.ip || data.req.socket.remoteAddress,
        userAgent: data.req.headers['user-agent']
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - we don't want audit failures to break operations
    }
  }

  static async logProductDeletion(product: any, reason: string, req: Request) {
    await this.log({
      action: 'DELETE',
      entityType: 'Product',
      entityId: product.id,
      entityData: {
        artisCodes: product.artisCodes,
        name: product.name,
        supplier: product.supplier,
        category: product.category,
        currentStock: product.currentStock,
        avgConsumption: product.avgConsumption
      },
      reason,
      req
    });
  }

  static async getProductDeletionHistory(productId?: string) {
    const where: any = {
      entityType: 'Product',
      action: 'DELETE'
    };
    
    if (productId) {
      where.entityId = productId;
    }
    
    return AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100
    });
  }
}