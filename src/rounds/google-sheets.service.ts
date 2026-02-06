import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleSheetsService {
  private sheets;
  private serviceAccountEmail: string;

  constructor() {
    this.serviceAccountEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.serviceAccountEmail,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getSheetData(spreadsheetId: string, range: string = 'A:Z') {
    console.log('GoogleSheetsService: Attempting to fetch sheet data for ID:', spreadsheetId);
    console.log('GoogleSheetsService: Using range:', range);
    console.log('GoogleSheetsService: GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Not set');
    console.log('GoogleSheetsService: GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Not set');

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      console.log('GoogleSheetsService: Successfully fetched data, rows:', response.data.values?.length || 0);
      return response.data.values || [];
    } catch (error: any) {
      console.error('GoogleSheetsService: Error details:', {
        status: error.status,
        code: error.code,
        message: error.message,
        response: error.response?.data
      });

      // If the sheet is not found (404), return empty array instead of throwing
      if (error.status === 404 || error.code === 404) {
        console.warn(`Google Sheet with ID ${spreadsheetId} not found or not accessible. Returning empty data.`);
        return [];
      }
      // Check for API not enabled error (403)
      if (error.status === 403 && error.message && error.message.includes('Google Sheets API has not been used')) {
        console.error('Google Sheets API is not enabled for this project:', error);
        throw new Error('Google Sheets API is not enabled. Please enable it in the Google Cloud Console at https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=910589534723');
      }
      console.error('Error fetching Google Sheets data:', error);
      // Provide more specific error messages
      if (error.status === 403) {
        throw new Error(`Access denied to Google Sheet. Please share the spreadsheet with the service account email: ${this.serviceAccountEmail} and grant it "Viewer" access. Error: ${error.message}`);
      } else if (error.status === 404) {
        throw new Error(`Google Sheet not found. Please check the spreadsheet ID and ensure it exists. Error: ${error.message}`);
      } else if (error.status === 401) {
        throw new Error(`Authentication failed. Please check the Google service account credentials. Error: ${error.message}`);
      } else {
        throw new Error(`Failed to fetch Google Sheets data: ${error.message || error}`);
      }
    }
  }

  async getSheetMetadata(spreadsheetId: string) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return response.data;
    } catch (error: any) {
      // Check for API not enabled error (403)
      if (error.status === 403 && error.message && error.message.includes('Google Sheets API has not been used')) {
        console.error('Google Sheets API is not enabled for this project:', error);
        throw new Error('Google Sheets API is not enabled. Please enable it in the Google Cloud Console at https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=910589534723');
      }
      console.error('Error fetching Google Sheet metadata:', error);
      throw new Error('Failed to fetch Google Sheet metadata');
    }
  }

  getServiceAccountEmail(): string {
    return this.serviceAccountEmail;
  }
}
