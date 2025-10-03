#!/usr/bin/env python3
"""
Create template sheets for distributor orders in Google Sheets
"""

import os
import sys
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Google Sheets ID for DECORATIVE ORDERS
SPREADSHEET_ID = '1oaNZ9qteBrvrei0gRFjlVf_DzeogWu5r'

# Service account credentials
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = '/Users/kunal/.cursor-tutor/artis/backend/credentials/google-sheets-key.json'

def get_sheets_service():
    """Initialize Google Sheets API service"""
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    return service

def create_template_sheets(service, spreadsheet_id):
    """Create all template sheets"""

    # Sheet configurations
    sheets_to_create = [
        {
            'name': 'Orders_Data',
            'headers': [
                'distributor_name', 'location', 'state', 'order_date',
                'thickness_72_92', 'thickness_08', 'thickness_1mm',
                'total_pieces', 'month_year', 'notes'
            ],
            'color': {'red': 0.85, 'green': 0.85, 'blue': 1.0}  # Light blue
        },
        {
            'name': 'Monthly_Summary',
            'headers': [
                'distributor_name', 'location', 'month_year', 'total_orders',
                'thickness_72_92_total', 'thickness_08_total',
                'thickness_1mm_total', 'monthly_total_pieces'
            ],
            'color': {'red': 0.85, 'green': 1.0, 'blue': 0.85}  # Light green
        },
        {
            'name': 'Distributor_Master',
            'headers': [
                'distributor_name', 'location', 'state', 'region',
                'distributor_code', 'active_status'
            ],
            'color': {'red': 1.0, 'green': 0.95, 'blue': 0.8}  # Light yellow
        },
        {
            'name': 'Data_Validation',
            'headers': ['states', 'regions', 'distributor_names', 'cities'],
            'color': {'red': 0.95, 'green': 0.95, 'blue': 0.95}  # Light gray
        },
        {
            'name': 'Instructions',
            'headers': ['Step', 'Description'],
            'color': {'red': 1.0, 'green': 0.85, 'blue': 0.85}  # Light red
        }
    ]

    # Batch request to create sheets
    requests = []

    for sheet_config in sheets_to_create:
        # Create sheet
        requests.append({
            'addSheet': {
                'properties': {
                    'title': sheet_config['name'],
                    'tabColor': sheet_config['color'],
                    'gridProperties': {
                        'rowCount': 1000,
                        'columnCount': len(sheet_config['headers']) + 5,
                        'frozenRowCount': 1  # Freeze header row
                    }
                }
            }
        })

    try:
        # Execute batch update to create sheets
        batch_update_request = {'requests': requests}
        response = service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body=batch_update_request
        ).execute()

        print(f"Created {len(sheets_to_create)} sheets")

        # Now add headers and initial data to each sheet
        for sheet_config in sheets_to_create:
            add_headers_and_data(service, spreadsheet_id, sheet_config)

        return True

    except HttpError as error:
        print(f"An error occurred: {error}")
        return False

def add_headers_and_data(service, spreadsheet_id, sheet_config):
    """Add headers and initial data to a sheet"""

    sheet_name = sheet_config['name']
    headers = sheet_config['headers']

    # Prepare values based on sheet type
    values = [headers]  # Start with headers

    if sheet_name == 'Orders_Data':
        # Add sample data rows
        values.extend([
            ['RAJGIRI PLY', 'MUMBAI', 'Maharashtra', '17.07.2025', 0, 40, 0, 40, 'July 2025', 'Sample entry'],
            ['STAR LAMINATE', 'THANE', 'Maharashtra', '17.07.2025', 0, 2449, 0, 2449, 'July 2025', 'Sample entry'],
            ['', '', '', '', '', '', '', '=SUM(E2:G2)', '', 'Formula for total_pieces']
        ])

    elif sheet_name == 'Distributor_Master':
        # Add list of known distributors
        values.extend([
            ['RAJGIRI PLY', 'MUMBAI', 'Maharashtra', 'West', 'RGP001', 'Yes'],
            ['STAR LAMINATE', 'THANE', 'Maharashtra', 'West', 'STL001', 'Yes'],
            ['BHARAT TIMBER', 'VASAI', 'Maharashtra', 'West', 'BHT001', 'Yes'],
            ['SHIV LAMINATES', 'LATUR', 'Maharashtra', 'West', 'SHL001', 'Yes'],
            ['GAJANAN TRADERS', 'DHULIA', 'Maharashtra', 'West', 'GJT001', 'Yes'],
            ['NUTAN TRADERS', 'BALIYA', 'Uttar Pradesh', 'North', 'NTT001', 'Yes'],
            ['G S TRADERS', 'SATNA', 'Madhya Pradesh', 'Central', 'GST001', 'Yes'],
            ['LIBERTY PLY', 'HALDWANI', 'Uttarakhand', 'North', 'LBP001', 'Yes'],
            ['SHRI RADHEY', 'AGRA', 'Uttar Pradesh', 'North', 'SHR001', 'Yes'],
            ['GR TRADERS', 'LUCKNOW', 'Uttar Pradesh', 'North', 'GRT001', 'Yes'],
            ['GOPALJI PLYWOOD', 'DEHRADUN', 'Uttarakhand', 'North', 'GPP001', 'Yes'],
            ['MEERUT TRADING CO', 'MEERUT', 'Uttar Pradesh', 'North', 'MTC001', 'Yes'],
            ['BANKE BIHARI', 'BHOPAL', 'Madhya Pradesh', 'Central', 'BKB001', 'Yes'],
            ['PAKEEZA PLY', 'KASHMIR', 'Jammu & Kashmir', 'North', 'PKP001', 'Yes'],
            ['BALAJI TRADING', 'BANGALORE', 'Karnataka', 'South', 'BJT001', 'Yes'],
            ['EUROSWISS', 'BANGALORE', 'Karnataka', 'South', 'ERS001', 'Yes']
        ])

    elif sheet_name == 'Data_Validation':
        # Add validation lists
        states = ['Maharashtra', 'Uttar Pradesh', 'Madhya Pradesh', 'Uttarakhand',
                 'Karnataka', 'Gujarat', 'Rajasthan', 'Punjab', 'Haryana',
                 'West Bengal', 'Jammu & Kashmir', 'Bihar', 'Jharkhand']
        regions = ['North', 'South', 'East', 'West', 'Central']

        max_rows = max(len(states), len(regions))
        for i in range(max_rows):
            row = []
            row.append(states[i] if i < len(states) else '')
            row.append(regions[i] if i < len(regions) else '')
            row.append('')  # distributor_names column
            row.append('')  # cities column
            values.append(row)

    elif sheet_name == 'Instructions':
        values.extend([
            ['1', 'Use Orders_Data sheet for entering individual orders'],
            ['2', 'Date format must be DD.MM.YYYY (e.g., 17.07.2025)'],
            ['3', 'Enter quantities in respective thickness columns'],
            ['4', 'total_pieces will auto-calculate if formula is set'],
            ['5', 'month_year should be in format "Month Year" (e.g., July 2025)'],
            ['6', 'Distributor_Master contains reference data for all distributors'],
            ['7', 'Monthly_Summary can be populated using pivot tables or formulas'],
            ['8', 'Use Data_Validation sheet to maintain dropdown lists'],
            ['', ''],
            ['Notes:', ''],
            ['', 'thickness_72_92: For .72/.82/.92 mm range'],
            ['', 'thickness_08: For 0.8 mm (Woodrica/Artvio)'],
            ['', 'thickness_1mm: For 1 mm (Artis)'],
            ['', 'Leave thickness column as 0 if no quantity for that thickness']
        ])

    # Update the sheet with values
    body = {'values': values}

    try:
        result = service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A1",
            valueInputOption='USER_ENTERED',
            body=body
        ).execute()

        print(f"Updated {sheet_name}: {result.get('updatedCells')} cells updated")

        # Add formatting
        format_sheet(service, spreadsheet_id, sheet_name, len(headers))

    except HttpError as error:
        print(f"Error updating {sheet_name}: {error}")

def format_sheet(service, spreadsheet_id, sheet_name, num_headers):
    """Apply formatting to the sheet"""

    # Get sheet ID
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    sheet_id = None
    for sheet in spreadsheet['sheets']:
        if sheet['properties']['title'] == sheet_name:
            sheet_id = sheet['properties']['sheetId']
            break

    if not sheet_id:
        print(f"Could not find sheet ID for {sheet_name}")
        return

    requests = []

    # Format header row
    requests.append({
        'repeatCell': {
            'range': {
                'sheetId': sheet_id,
                'startRowIndex': 0,
                'endRowIndex': 1
            },
            'cell': {
                'userEnteredFormat': {
                    'backgroundColor': {'red': 0.2, 'green': 0.5, 'blue': 0.8},
                    'textFormat': {
                        'foregroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0},
                        'fontSize': 11,
                        'bold': True
                    },
                    'horizontalAlignment': 'CENTER'
                }
            },
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    })

    # Auto-resize columns
    requests.append({
        'autoResizeDimensions': {
            'dimensions': {
                'sheetId': sheet_id,
                'dimension': 'COLUMNS',
                'startIndex': 0,
                'endIndex': num_headers
            }
        }
    })

    # Add borders to data area
    requests.append({
        'updateBorders': {
            'range': {
                'sheetId': sheet_id,
                'startRowIndex': 0,
                'endRowIndex': 50,  # First 50 rows
                'startColumnIndex': 0,
                'endColumnIndex': num_headers
            },
            'top': {'style': 'SOLID'},
            'bottom': {'style': 'SOLID'},
            'left': {'style': 'SOLID'},
            'right': {'style': 'SOLID'},
            'innerHorizontal': {'style': 'SOLID', 'width': 1},
            'innerVertical': {'style': 'SOLID', 'width': 1}
        }
    })

    # Add data validation for Orders_Data sheet
    if sheet_name == 'Orders_Data':
        # Add formula for total_pieces column
        requests.append({
            'repeatCell': {
                'range': {
                    'sheetId': sheet_id,
                    'startRowIndex': 1,
                    'endRowIndex': 1000,
                    'startColumnIndex': 7,  # Column H (total_pieces)
                    'endColumnIndex': 8
                },
                'cell': {
                    'userEnteredValue': {
                        'formulaValue': '=SUM(E:G)'
                    }
                },
                'fields': 'userEnteredValue'
            }
        })

    # Execute formatting requests
    if requests:
        batch_update_request = {'requests': requests}
        try:
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body=batch_update_request
            ).execute()
            print(f"Formatting applied to {sheet_name}")
        except HttpError as error:
            print(f"Error formatting {sheet_name}: {error}")

def main():
    """Main function"""
    print("Creating distributor order template sheets...")
    print(f"Target spreadsheet ID: {SPREADSHEET_ID}")

    # Get Google Sheets service
    service = get_sheets_service()

    # Create template sheets
    success = create_template_sheets(service, SPREADSHEET_ID)

    if success:
        print("\n✅ Template sheets created successfully!")
        print(f"Open the spreadsheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")
        print("\nNext steps:")
        print("1. Manually enter the distributor order data in the Orders_Data sheet")
        print("2. Use the Distributor_Master sheet as reference")
        print("3. Follow the Instructions sheet for guidance")
    else:
        print("\n❌ Failed to create template sheets")
        print("Please check the error messages above")

if __name__ == "__main__":
    main()