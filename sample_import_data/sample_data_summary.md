
# Sample Data Import Summary
Generated on: 2025-07-03 18:20:09

## Files Created:
1. **sample_consumption_import.xlsx**
   - Monthly consumption data for 20 products
   - Period: January 2024 - December 2024
   - Format: Matches existing consumption template

2. **sample_purchase_orders_import.xlsx**
   - Purchase orders throughout 2024
   - Random purchases for all product lines
   - Includes PO numbers and supplier information

3. **sample_corrections_import.xlsx**
   - Inventory corrections and adjustments
   - Both positive and negative adjustments
   - Includes reasons for each correction

4. **sample_initial_stock_import.xlsx**
   - Opening balances as of January 1, 2024
   - Can be used to set initial stock levels

## Product Codes Used:
- Artis (1mm): ART-001, ART-002, ART-003, ART-004, ART-005 ...
- Woodrica (0.8mm): WDR-001, WDR-002, WDR-003, WDR-004, WDR-005 ...
- Artvio (0.8mm): ATV-001, ATV-002, ATV-003, ATV-004, ATV-005 ...

## Import Order:
1. First import initial stock (sample_initial_stock_import.xlsx) as purchase orders
2. Then import consumption data (sample_consumption_import.xlsx)
3. Import additional purchases (sample_purchase_orders_import.xlsx)
4. Finally, apply any corrections (sample_corrections_import.xlsx)

## Notes:
- All dates are in 2024 for consistency
- Consumption varies by product thickness (higher for 1mm Artis products)
- Purchase amounts are realistic based on typical order sizes
- Corrections include both positive and negative adjustments
