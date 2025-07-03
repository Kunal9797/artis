# Supabase Migration Quick Checklist

## Day 1 Morning (2-3 hours)
- [ ] Create Supabase account and project
- [ ] Save all connection strings
- [ ] Run `./migrate-to-supabase.sh` 
- [ ] Verify data in Supabase Dashboard

## Day 1 Afternoon (2-3 hours)  
- [ ] Update backend database config
- [ ] Test backend locally with Supabase
- [ ] Update frontend environment variables
- [ ] Run full test suite

## Day 2 Morning (2-3 hours)
- [ ] Deploy backend to staging (if available)
- [ ] Test all critical features:
  - [ ] Login/Authentication
  - [ ] Product list and CRUD
  - [ ] Design paper consumption entry
  - [ ] Purchase records
  - [ ] Excel import/export
  - [ ] Distributor management
- [ ] Check performance metrics

## Day 2 Afternoon (1-2 hours)
- [ ] Update production environment variables
- [ ] Deploy to production
- [ ] Monitor logs for 30 minutes
- [ ] Quick smoke test all features
- [ ] Inform team migration is complete

## Post-Migration (Optional)
- [ ] Enable Supabase Row Level Security
- [ ] Set up automated backups
- [ ] Configure team access in Supabase
- [ ] Document any custom configurations