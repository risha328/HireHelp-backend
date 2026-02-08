import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleFormsService {
  private forms;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/forms.responses.readonly'],
    });

    this.forms = google.forms({ version: 'v1', auth });
  }

  async getFormResponses(formId: string) {
    try {
      const response = await this.forms.forms.responses.list({
        formId,
      });

      return response.data.responses || [];
    } catch (error: any) {
      // Silently return empty array for not found (404) or permission denied (403) errors
      if (error.status === 404 || error.code === 404 || error.status === 403 || error.code === 403) {
        return [];
      }
      throw new Error('Failed to fetch Google Forms responses');
    }
  }

  async getFormMetadata(formId: string) {
    try {
      const response = await this.forms.forms.get({
        formId,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Google Form metadata:', error);
      throw new Error('Failed to fetch Google Form metadata');
    }
  }
}
