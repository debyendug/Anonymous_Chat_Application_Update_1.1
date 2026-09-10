import { Routes } from '@angular/router';
import { Home } from './home/home';
import {ChatAppNew } from './chat-app-new/chat-app-new'

export const routes: Routes = [
  { path: '', component: Home },
   { path: 'ChatAppNew', component: ChatAppNew },
  { path: 'ChatAppNew', redirectTo: 'ChatAppNew', pathMatch: 'full' }
    
];
