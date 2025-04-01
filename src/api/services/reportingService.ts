import apiClient from '../client';
import {
  ReportCreate, ReportUpdate,
  ReportResponse, ReportsResponse,
  ReportScheduleResponse, ReportSchedulesResponse
} from '../types';

// --- Reports ---

export const getReports = async (reportType?: string): Promise<ReportsResponse> => {
  const params = reportType ? { report_type: reportType } : {};
  const response = await apiClient.get<ReportsResponse>('/reports/', { params });
  return response.data;
};

export const getReportById = async (id: string): Promise<ReportResponse> => {
  const response = await apiClient.get<ReportResponse>(`/reports/${id}`);
  return response.data;
};

export const createReport = async (reportData: ReportCreate): Promise<ReportResponse> => {
  const response = await apiClient.post<ReportResponse>('/reports/', reportData);
  return response.data;
};

export const updateReport = async (id: string, reportData: ReportUpdate): Promise<ReportResponse> => {
  const response = await apiClient.put<ReportResponse>(`/reports/${id}`, reportData);
  return response.data;
};

export const deleteReport = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/reports/${id}`);
  return response.data;
};

export const regenerateReport = async (id: string): Promise<ReportResponse> => {
  const response = await apiClient.post<ReportResponse>(`/reports/${id}/regenerate`);
  return response.data;
};

// --- Report Schedules ---

export const getReportSchedules = async (): Promise<ReportSchedulesResponse> => {
  const response = await apiClient.get<ReportSchedulesResponse>('/reports/schedules');
  return response.data;
};

// Assuming scheduleData structure needs definition or use Record<string, unknown>
// TODO: Define a ReportScheduleCreate type if possible
export const createReportSchedule = async (scheduleData: Record<string, unknown>): Promise<ReportScheduleResponse> => {
  const response = await apiClient.post<ReportScheduleResponse>('/reports/schedules', scheduleData);
  return response.data;
};

// TODO: Define a ReportScheduleUpdate type if possible
export const updateReportSchedule = async (id: string, scheduleData: Record<string, unknown>): Promise<ReportScheduleResponse> => {
  const response = await apiClient.put<ReportScheduleResponse>(`/reports/schedules/${id}`, scheduleData);
  return response.data;
};

export const deleteReportSchedule = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/reports/schedules/${id}`);
  return response.data;
};