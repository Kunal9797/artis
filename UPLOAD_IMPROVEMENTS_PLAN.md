# Monthly Upload Process Improvements

## Current Pain Points → Solutions

### 1. **Manual Product Code Entry → Pre-filled Templates**
- ✅ Smart template generator with all product codes
- ✅ Dropdown validation for product selection
- ✅ Auto-populated supplier and category info

### 2. **No Upload History → Full Tracking System**
- ✅ BulkOperations table tracks every upload
- ✅ Link transactions to specific uploads via operationId
- ✅ See who uploaded what and when

### 3. **Duplicate Uploads → Prevention & Detection**
- ✅ Monthly upload status view shows existing data
- ✅ Warning in templates when data exists
- ✅ Duplicate detection view

### 4. **Poor Error Handling → Better Reporting**
```typescript
// Enhanced error tracking
interface EnhancedUploadResponse {
  operation: {
    id: string;
    status: 'completed' | 'partial' | 'failed';
  };
  summary: {
    totalRows: number;
    processed: number;
    failed: number;
    skipped: number;
  };
  errors: Array<{
    row: number;
    artisCode: string;
    reason: string;
    suggestion: string;
  }>;
  downloadErrorReport: string; // URL to download detailed error Excel
}
```

## Implementation Plan

### Phase 1: Backend Enhancements (1-2 days)
1. **Update Upload Endpoints** to:
   - Create BulkOperation record before processing
   - Link all transactions to operationId
   - Generate detailed error reports
   - Return operation summary

2. **Add New Endpoints**:
   - `GET /api/bulk-operations` - List upload history
   - `GET /api/bulk-operations/:id` - Get specific upload details
   - `GET /api/monthly-status/:year` - Check which months have data
   - `POST /api/templates/generate` - Generate pre-filled templates

### Phase 2: Frontend Upload Wizard (2-3 days)
1. **Month Selection Screen**
   - Calendar view showing uploaded months
   - Green = Complete, Yellow = Partial, Red = Missing
   - Prevent accidental duplicate uploads

2. **Upload Preview**
   - Show data summary before processing
   - Highlight potential issues
   - Allow user to cancel

3. **Progress Tracking**
   - Real-time progress bar
   - Show current processing status
   - Pause/resume capability

4. **Error Management**
   - Inline error display
   - Download error report as Excel
   - Suggested fixes for common issues

### Phase 3: Advanced Features (Optional)
1. **Auto-detection**
   - Detect file type from content
   - Auto-map columns
   - Handle different date formats

2. **Bulk Rollback**
   - Undo entire upload operation
   - Restore previous state
   - Audit trail maintained

3. **Upload Templates**
   - Save upload configurations
   - Reuse for similar files
   - Share across team

## Quick Implementation Guide

### Step 1: Update Backend Controller
```typescript
// inventory.controller.ts
async uploadConsumption(req: Request, res: Response) {
  const file = req.file;
  const userId = req.user.id;
  
  // Create operation record
  const operation = await BulkOperation.create({
    type: 'consumption',
    uploadedBy: userId,
    fileName: file.originalname,
    status: 'processing'
  });
  
  try {
    // Process file
    const result = await processConsumptionFile(file, operation.id);
    
    // Update operation
    await operation.update({
      status: result.hasErrors ? 'partial' : 'completed',
      recordsTotal: result.total,
      recordsProcessed: result.processed,
      recordsFailed: result.failed,
      errorLog: result.errors
    });
    
    res.json({
      operation,
      summary: result.summary,
      errors: result.errors,
      downloadUrl: `/api/bulk-operations/${operation.id}/error-report`
    });
  } catch (error) {
    await operation.update({ status: 'failed', errorLog: error.message });
    throw error;
  }
}
```

### Step 2: Enhanced Upload Dialog
```typescript
// EnhancedBulkUploadDialog.tsx
const EnhancedBulkUploadDialog = () => {
  const [step, setStep] = useState<'select-month' | 'preview' | 'upload'>('select-month');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  
  // Check what's already uploaded
  useEffect(() => {
    fetchMonthlyStatus(new Date().getFullYear());
  }, []);
  
  // Multi-step wizard
  return (
    <Dialog>
      {step === 'select-month' && <MonthSelector />}
      {step === 'preview' && <UploadPreview />}
      {step === 'upload' && <UploadProgress />}
    </Dialog>
  );
};
```

### Step 3: Upload History View
```typescript
// UploadHistory.tsx
const UploadHistory = () => {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Date</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>File</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Records</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {operations.map(op => (
          <TableRow key={op.id}>
            <TableCell>{formatDate(op.uploadedAt)}</TableCell>
            <TableCell>{op.type}</TableCell>
            <TableCell>{op.fileName}</TableCell>
            <TableCell>
              <StatusChip status={op.status} />
            </TableCell>
            <TableCell>
              {op.recordsProcessed}/{op.recordsTotal}
            </TableCell>
            <TableCell>
              <IconButton onClick={() => viewDetails(op.id)}>
                <VisibilityIcon />
              </IconButton>
              {op.errorLog && (
                <IconButton onClick={() => downloadErrorReport(op.id)}>
                  <DownloadIcon />
                </IconButton>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

## Benefits

1. **Reduced Errors**
   - Pre-filled product codes eliminate typos
   - Validation prevents invalid data
   - Clear error messages help quick fixes

2. **Time Savings**
   - No manual product code entry
   - Bulk error fixes with error report
   - Reusable templates

3. **Better Control**
   - See upload history
   - Track who uploaded what
   - Prevent duplicate uploads
   - Rollback if needed

4. **Improved Visibility**
   - Dashboard shows data coverage
   - Monthly status at a glance
   - Audit trail for compliance