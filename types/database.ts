export type UserRole='admin'|'director'|'sales'|'cashier'|'warehouse'|'accountant'|'site_manager';
export type ContactType='client'|'prospect'|'supplier'|'provider'|'subcontractor'|'other';
export type DocumentStatus='draft'|'validated'|'partially_paid'|'paid'|'cancelled';
export type ProjectStatus='prospect'|'quote'|'pending'|'accepted'|'preparation'|'in_progress'|'suspended'|'completed'|'cancelled';
export interface Contact{ id:string; company_id:string; type:ContactType; name:string; phone:string|null; email:string|null; address:string|null; city:string|null; }
export interface Item{ id:string; company_id:string; sku:string|null; name:string; item_type:'material'|'product'|'service'; unit:string; purchase_price:number; sale_price:number; stock_quantity:number; min_stock_quantity:number; }
