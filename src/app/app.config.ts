import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  NbThemeModule,
  NbLayoutModule,
  NbSidebarModule,
  NbCardModule,
  NbButtonModule,
  NbInputModule,
  NbIconModule,
  NbSelectModule,
  NbAutocompleteModule,
  NbSpinnerModule,
  NbBadgeModule,
  NbTooltipModule,
  NbAlertModule,
  NbFormFieldModule,
  NbOptionModule,
  NbMenuModule,
  NbDialogModule,
  NbToastrModule,
} from '@nebular/theme';
import { NbEvaIconsModule } from '@nebular/eva-icons';
import { DragDropModule } from '@angular/cdk/drag-drop';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    importProvidersFrom(
      BrowserAnimationsModule,
      NbThemeModule.forRoot({ name: 'dark' }),
      NbLayoutModule,
      NbSidebarModule.forRoot(),
      NbMenuModule.forRoot(),
      NbCardModule,
      NbButtonModule,
      NbInputModule,
      NbIconModule,
      NbSelectModule,
      NbAutocompleteModule,
      NbSpinnerModule,
      NbBadgeModule,
      NbTooltipModule,
      NbAlertModule,
      NbFormFieldModule,
      NbOptionModule,
      NbDialogModule.forRoot(),
      NbToastrModule.forRoot(),
      NbEvaIconsModule,
      DragDropModule,
    ),
  ],
};
