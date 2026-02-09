import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { appRoutingProviders } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';

// bootstrapApplication(AppComponent, {
//   providers: [appRoutingProviders],
// }).catch(err => console.error(err));

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
