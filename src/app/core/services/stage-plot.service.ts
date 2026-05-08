import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StagePlot {
  id: string;
  bandId: string;
  plotData: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class StagePlotService {
  private apiUrl = `${environment.apiUrl}/stage-plot`;

  constructor(private http: HttpClient) {}

  getStagePlot(): Observable<StagePlot> {
    return this.http.get<StagePlot>(this.apiUrl);
  }

  saveStagePlot(plotData: string): Observable<StagePlot> {
    return this.http.post<StagePlot>(this.apiUrl, { plotData });
  }
}
