import User from './User';
import Product from './Product';
import Transaction from './Transaction';
import { initializeAssociations } from './Product';

initializeAssociations();

export { Product, Transaction, User }; 