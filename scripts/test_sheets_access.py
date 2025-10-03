#!/usr/bin/env python3
"""
Test access to Google Sheets
"""

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Google Sheets ID
SPREADSHEET_ID = '1oaNZ9qteBrvrei0gRFjlVf_DzeogWu5r'

# Service account credentials
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = '/Users/kunal/.cursor-tutor/artis/backend/credentials/google-sheets-key.json'

def test_access():
    """Test if we can access the spreadsheet"""
    try:
        # Get credentials
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)

        # Try to get spreadsheet info
        spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()

        print("✅ Successfully accessed spreadsheet!")
        print(f"Title: {spreadsheet.get('properties', {}).get('title', 'Unknown')}")
        print(f"Sheets in spreadsheet:")

        for sheet in spreadsheet.get('sheets', []):
            props = sheet.get('properties', {})
            print(f"  - {props.get('title')} (ID: {props.get('sheetId')})")

        return True

    except HttpError as error:
        print(f"❌ Error accessing spreadsheet: {error}")
        print("\nPossible issues:")
        print("1. The spreadsheet ID might be incorrect")
        print("2. The service account doesn't have access")
        print("3. The document might be in a different format")
        print("\nPlease ensure you've shared the Google Sheet with the service account email.")

        # Try to read the service account email
        try:
            import json
            with open(SERVICE_ACCOUNT_FILE, 'r') as f:
                data = json.load(f)
                print(f"\nService account email: {data.get('client_email', 'Unknown')}")
                print("Share the spreadsheet with this email address and give it Editor access.")
        except:
            pass

        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_access()