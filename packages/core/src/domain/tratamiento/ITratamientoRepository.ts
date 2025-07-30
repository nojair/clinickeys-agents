export interface ITratamientoRepository {
  /**
   * Returns all active treatments for a clinic and super clinic.
   */
  getActiveTreatmentsForClinic(clinicId: number, superClinicId: number): Promise<any[]>;

  /**
   * Returns treatment details by treatment ID.
   */
  getTreatmentDetailsById(treatmentId: number): Promise<any | undefined>;

  /**
   * Finds treatments that contain the provided name (LIKE %...%).
   */
  findTreatmentsContainingName(name: string, clinicId: number, superClinicId: number): Promise<any[]>;

  /**
   * Finds treatments by array of names, with relevance and exact match info.
   */
  findTreatmentsByNamesWithRelevance(names: string[], clinicId: number): Promise<any[]>;
}
