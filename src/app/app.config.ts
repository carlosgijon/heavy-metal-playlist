import { DragDropModule } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NbEvaIconsModule } from '@nebular/eva-icons';
import {
  NbAlertModule,
  NbAutocompleteModule,
  NbBadgeModule,
  NbButtonModule,
  NbCardModule,
  NbDialogModule,
  NbFormFieldModule,
  NbIconModule,
  NbInputModule,
  NbLayoutModule,
  NbMenuModule,
  NbOptionModule,
  NbSelectModule,
  NbSidebarModule,
  NbSpinnerModule,
  NbThemeModule,
  NbToastrModule,
  NbTooltipModule,
} from '@nebular/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    importProvidersFrom(
      BrowserAnimationsModule,
      NbThemeModule.forRoot({ name: 'default' }),
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
