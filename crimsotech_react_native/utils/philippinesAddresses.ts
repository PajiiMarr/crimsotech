// Philippines Address Data
// This is a simplified version. In production, you might want to use an API or a more comprehensive dataset

export interface Province {
  code: string;
  name: string;
  region: string;
}

export interface City {
  code: string;
  name: string;
  provinceCode: string;
  type: 'city' | 'municipality';
}

export interface Barangay {
  code: string;
  name: string;
  cityCode: string;
}

// Major Provinces in the Philippines
export const provinces: Province[] = [
  { code: 'NCR', name: 'Metro Manila (NCR)', region: 'NCR' },
  { code: 'ABR', name: 'Abra', region: 'CAR' },
  { code: 'AGN', name: 'Agusan del Norte', region: 'XIII' },
  { code: 'AGS', name: 'Agusan del Sur', region: 'XIII' },
  { code: 'AKL', name: 'Aklan', region: 'VI' },
  { code: 'ALB', name: 'Albay', region: 'V' },
  { code: 'ANT', name: 'Antique', region: 'VI' },
  { code: 'APA', name: 'Apayao', region: 'CAR' },
  { code: 'AUR', name: 'Aurora', region: 'III' },
  { code: 'BAS', name: 'Basilan', region: 'BARMM' },
  { code: 'BAN', name: 'Bataan', region: 'III' },
  { code: 'BTN', name: 'Batanes', region: 'II' },
  { code: 'BTG', name: 'Batangas', region: 'IV-A' },
  { code: 'BEN', name: 'Benguet', region: 'CAR' },
  { code: 'BIL', name: 'Biliran', region: 'VIII' },
  { code: 'BOH', name: 'Bohol', region: 'VII' },
  { code: 'BUK', name: 'Bukidnon', region: 'X' },
  { code: 'BUL', name: 'Bulacan', region: 'III' },
  { code: 'CAG', name: 'Cagayan', region: 'II' },
  { code: 'CAN', name: 'Camarines Norte', region: 'V' },
  { code: 'CAS', name: 'Camarines Sur', region: 'V' },
  { code: 'CAM', name: 'Camiguin', region: 'X' },
  { code: 'CAP', name: 'Capiz', region: 'VI' },
  { code: 'CAT', name: 'Catanduanes', region: 'V' },
  { code: 'CAV', name: 'Cavite', region: 'IV-A' },
  { code: 'CEB', name: 'Cebu', region: 'VII' },
  { code: 'COM', name: 'Compostela Valley', region: 'XI' },
  { code: 'NCO', name: 'Cotabato', region: 'XII' },
  { code: 'DAV', name: 'Davao del Norte', region: 'XI' },
  { code: 'DAS', name: 'Davao del Sur', region: 'XI' },
  { code: 'DAO', name: 'Davao Occidental', region: 'XI' },
  { code: 'DAE', name: 'Davao Oriental', region: 'XI' },
  { code: 'DIN', name: 'Dinagat Islands', region: 'XIII' },
  { code: 'EAS', name: 'Eastern Samar', region: 'VIII' },
  { code: 'GUI', name: 'Guimaras', region: 'VI' },
  { code: 'IFU', name: 'Ifugao', region: 'CAR' },
  { code: 'ILN', name: 'Ilocos Norte', region: 'I' },
  { code: 'ILS', name: 'Ilocos Sur', region: 'I' },
  { code: 'ILI', name: 'Iloilo', region: 'VI' },
  { code: 'ISA', name: 'Isabela', region: 'II' },
  { code: 'KAL', name: 'Kalinga', region: 'CAR' },
  { code: 'LUN', name: 'La Union', region: 'I' },
  { code: 'LAG', name: 'Laguna', region: 'IV-A' },
  { code: 'LAN', name: 'Lanao del Norte', region: 'X' },
  { code: 'LAS', name: 'Lanao del Sur', region: 'BARMM' },
  { code: 'LEY', name: 'Leyte', region: 'VIII' },
  { code: 'MAG', name: 'Maguindanao', region: 'BARMM' },
  { code: 'MAD', name: 'Marinduque', region: 'IV-B' },
  { code: 'MAS', name: 'Masbate', region: 'V' },
  { code: 'MSC', name: 'Misamis Occidental', region: 'X' },
  { code: 'MSR', name: 'Misamis Oriental', region: 'X' },
  { code: 'MOU', name: 'Mountain Province', region: 'CAR' },
  { code: 'NEC', name: 'Negros Occidental', region: 'VI' },
  { code: 'NER', name: 'Negros Oriental', region: 'VII' },
  { code: 'NSA', name: 'Northern Samar', region: 'VIII' },
  { code: 'NUE', name: 'Nueva Ecija', region: 'III' },
  { code: 'NUV', name: 'Nueva Vizcaya', region: 'II' },
  { code: 'MDC', name: 'Occidental Mindoro', region: 'IV-B' },
  { code: 'MDR', name: 'Oriental Mindoro', region: 'IV-B' },
  { code: 'PLW', name: 'Palawan', region: 'IV-B' },
  { code: 'PAM', name: 'Pampanga', region: 'III' },
  { code: 'PAN', name: 'Pangasinan', region: 'I' },
  { code: 'QUE', name: 'Quezon', region: 'IV-A' },
  { code: 'QUI', name: 'Quirino', region: 'II' },
  { code: 'RIZ', name: 'Rizal', region: 'IV-A' },
  { code: 'ROM', name: 'Romblon', region: 'IV-B' },
  { code: 'WSA', name: 'Samar', region: 'VIII' },
  { code: 'SAR', name: 'Sarangani', region: 'XII' },
  { code: 'SIQ', name: 'Siquijor', region: 'VII' },
  { code: 'SOR', name: 'Sorsogon', region: 'V' },
  { code: 'SCO', name: 'South Cotabato', region: 'XII' },
  { code: 'SLE', name: 'Southern Leyte', region: 'VIII' },
  { code: 'SUK', name: 'Sultan Kudarat', region: 'XII' },
  { code: 'SLU', name: 'Sulu', region: 'BARMM' },
  { code: 'SUN', name: 'Surigao del Norte', region: 'XIII' },
  { code: 'SUR', name: 'Surigao del Sur', region: 'XIII' },
  { code: 'TAR', name: 'Tarlac', region: 'III' },
  { code: 'TAW', name: 'Tawi-Tawi', region: 'BARMM' },
  { code: 'ZMB', name: 'Zambales', region: 'III' },
  { code: 'ZAN', name: 'Zamboanga del Norte', region: 'IX' },
  { code: 'ZAS', name: 'Zamboanga del Sur', region: 'IX' },
  { code: 'ZSI', name: 'Zamboanga Sibugay', region: 'IX' },
];

// Major Cities and Municipalities (sample - in production, use a comprehensive dataset)
export const cities: City[] = [
  // Metro Manila
  { code: 'MNL-001', name: 'Manila', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-002', name: 'Quezon City', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-003', name: 'Makati', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-004', name: 'Taguig', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-005', name: 'Pasig', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-006', name: 'Mandaluyong', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-007', name: 'Pasay', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-008', name: 'Caloocan', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-009', name: 'Las Piñas', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-010', name: 'Parañaque', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-011', name: 'Muntinlupa', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-012', name: 'Marikina', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-013', name: 'Valenzuela', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-014', name: 'Malabon', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-015', name: 'Navotas', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-016', name: 'San Juan', provinceCode: 'NCR', type: 'city' },
  { code: 'MNL-017', name: 'Pateros', provinceCode: 'NCR', type: 'municipality' },
  
  // Cavite
  { code: 'CAV-001', name: 'Bacoor', provinceCode: 'CAV', type: 'city' },
  { code: 'CAV-002', name: 'Dasmariñas', provinceCode: 'CAV', type: 'city' },
  { code: 'CAV-003', name: 'Imus', provinceCode: 'CAV', type: 'city' },
  { code: 'CAV-004', name: 'Tagaytay', provinceCode: 'CAV', type: 'city' },
  { code: 'CAV-005', name: 'Trece Martires', provinceCode: 'CAV', type: 'city' },
  { code: 'CAV-006', name: 'Kawit', provinceCode: 'CAV', type: 'municipality' },
  { code: 'CAV-007', name: 'General Trias', provinceCode: 'CAV', type: 'municipality' },
  
  // Laguna
  { code: 'LAG-001', name: 'Calamba', provinceCode: 'LAG', type: 'city' },
  { code: 'LAG-002', name: 'San Pedro', provinceCode: 'LAG', type: 'city' },
  { code: 'LAG-003', name: 'Santa Rosa', provinceCode: 'LAG', type: 'city' },
  { code: 'LAG-004', name: 'Biñan', provinceCode: 'LAG', type: 'city' },
  { code: 'LAG-005', name: 'Los Baños', provinceCode: 'LAG', type: 'municipality' },
  { code: 'LAG-006', name: 'San Pablo', provinceCode: 'LAG', type: 'city' },
  
  // Rizal
  { code: 'RIZ-001', name: 'Antipolo', provinceCode: 'RIZ', type: 'city' },
  { code: 'RIZ-002', name: 'Taytay', provinceCode: 'RIZ', type: 'municipality' },
  { code: 'RIZ-003', name: 'Cainta', provinceCode: 'RIZ', type: 'municipality' },
  { code: 'RIZ-004', name: 'Angono', provinceCode: 'RIZ', type: 'municipality' },
  
  // Bulacan
  { code: 'BUL-001', name: 'Malolos', provinceCode: 'BUL', type: 'city' },
  { code: 'BUL-002', name: 'Meycauayan', provinceCode: 'BUL', type: 'city' },
  { code: 'BUL-003', name: 'San Jose del Monte', provinceCode: 'BUL', type: 'city' },
  { code: 'BUL-004', name: 'Marilao', provinceCode: 'BUL', type: 'municipality' },
  
  // Cebu
  { code: 'CEB-001', name: 'Cebu City', provinceCode: 'CEB', type: 'city' },
  { code: 'CEB-002', name: 'Lapu-Lapu', provinceCode: 'CEB', type: 'city' },
  { code: 'CEB-003', name: 'Mandaue', provinceCode: 'CEB', type: 'city' },
  { code: 'CEB-004', name: 'Talisay', provinceCode: 'CEB', type: 'city' },
  
  // Davao del Sur
  { code: 'DAS-001', name: 'Davao City', provinceCode: 'DAS', type: 'city' },
  { code: 'DAS-002', name: 'Digos', provinceCode: 'DAS', type: 'city' },
  
  // Iloilo
  { code: 'ILI-001', name: 'Iloilo City', provinceCode: 'ILI', type: 'city' },
  { code: 'ILI-002', name: 'Passi', provinceCode: 'ILI', type: 'city' },
  
  // Pampanga
  { code: 'PAM-001', name: 'Angeles', provinceCode: 'PAM', type: 'city' },
  { code: 'PAM-002', name: 'San Fernando', provinceCode: 'PAM', type: 'city' },
  { code: 'PAM-003', name: 'Mabalacat', provinceCode: 'PAM', type: 'city' },
  
  // Batangas
  { code: 'BTG-001', name: 'Batangas City', provinceCode: 'BTG', type: 'city' },
  { code: 'BTG-002', name: 'Lipa', provinceCode: 'BTG', type: 'city' },
  { code: 'BTG-003', name: 'Tanauan', provinceCode: 'BTG', type: 'city' },
  
  // Zamboanga del Sur
  { code: 'ZAS-001', name: 'Zamboanga City', provinceCode: 'ZAS', type: 'city' },
];

// Barangays in Zamboanga City
export const barangays: Barangay[] = [
  { code: 'ZAM-001', name: 'Arena Blanco', cityCode: 'ZAS-001' },
  { code: 'ZAM-002', name: 'Ayala', cityCode: 'ZAS-001' },
  { code: 'ZAM-003', name: 'Baluno', cityCode: 'ZAS-001' },
  { code: 'ZAM-004', name: 'Boalan', cityCode: 'ZAS-001' },
  { code: 'ZAM-005', name: 'Bolong', cityCode: 'ZAS-001' },
  { code: 'ZAM-006', name: 'Buenavista', cityCode: 'ZAS-001' },
  { code: 'ZAM-007', name: 'Bunguiao', cityCode: 'ZAS-001' },
  { code: 'ZAM-008', name: 'Busay', cityCode: 'ZAS-001' },
  { code: 'ZAM-009', name: 'Cabaluay', cityCode: 'ZAS-001' },
  { code: 'ZAM-010', name: 'Cabatangan', cityCode: 'ZAS-001' },
  { code: 'ZAM-011', name: 'Cacao', cityCode: 'ZAS-001' },
  { code: 'ZAM-012', name: 'Calabasa', cityCode: 'ZAS-001' },
  { code: 'ZAM-013', name: 'Calarian', cityCode: 'ZAS-001' },
  { code: 'ZAM-014', name: 'Camino Nuevo', cityCode: 'ZAS-001' },
  { code: 'ZAM-015', name: 'Campo Islam', cityCode: 'ZAS-001' },
  { code: 'ZAM-016', name: 'Canelar', cityCode: 'ZAS-001' },
  { code: 'ZAM-017', name: 'Capisan', cityCode: 'ZAS-001' },
  { code: 'ZAM-018', name: 'Cawit', cityCode: 'ZAS-001' },
  { code: 'ZAM-019', name: 'Culianan', cityCode: 'ZAS-001' },
  { code: 'ZAM-020', name: 'Curuan', cityCode: 'ZAS-001' },
  { code: 'ZAM-021', name: 'Dita', cityCode: 'ZAS-001' },
  { code: 'ZAM-022', name: 'Divisoria', cityCode: 'ZAS-001' },
  { code: 'ZAM-023', name: 'Dulian (Upper Bunguiao)', cityCode: 'ZAS-001' },
  { code: 'ZAM-024', name: 'Dulian (Upper Pasonanca)', cityCode: 'ZAS-001' },
  { code: 'ZAM-025', name: 'Guisao', cityCode: 'ZAS-001' },
  { code: 'ZAM-026', name: 'Guiwan', cityCode: 'ZAS-001' },
  { code: 'ZAM-027', name: 'Kasanyangan', cityCode: 'ZAS-001' },
  { code: 'ZAM-028', name: 'La Paz', cityCode: 'ZAS-001' },
  { code: 'ZAM-029', name: 'Labuan', cityCode: 'ZAS-001' },
  { code: 'ZAM-030', name: 'Lamisahan', cityCode: 'ZAS-001' },
  { code: 'ZAM-031', name: 'Landang Gua', cityCode: 'ZAS-001' },
  { code: 'ZAM-032', name: 'Landang Laum', cityCode: 'ZAS-001' },
  { code: 'ZAM-033', name: 'Lanzones', cityCode: 'ZAS-001' },
  { code: 'ZAM-034', name: 'Lapakan', cityCode: 'ZAS-001' },
  { code: 'ZAM-035', name: 'Latuan (Curuan)', cityCode: 'ZAS-001' },
  { code: 'ZAM-036', name: 'Licomo', cityCode: 'ZAS-001' },
  { code: 'ZAM-037', name: 'Limaong', cityCode: 'ZAS-001' },
  { code: 'ZAM-038', name: 'Limpapa', cityCode: 'ZAS-001' },
  { code: 'ZAM-039', name: 'Lubigan', cityCode: 'ZAS-001' },
  { code: 'ZAM-040', name: 'Lumayang', cityCode: 'ZAS-001' },
  { code: 'ZAM-041', name: 'Lunzuran', cityCode: 'ZAS-001' },
  { code: 'ZAM-042', name: 'Maasin', cityCode: 'ZAS-001' },
  { code: 'ZAM-043', name: 'Malagutay', cityCode: 'ZAS-001' },
  { code: 'ZAM-044', name: 'Mampang', cityCode: 'ZAS-001' },
  { code: 'ZAM-045', name: 'Manalipa', cityCode: 'ZAS-001' },
  { code: 'ZAM-046', name: 'Mangusu', cityCode: 'ZAS-001' },
  { code: 'ZAM-047', name: 'Manicahan', cityCode: 'ZAS-001' },
  { code: 'ZAM-048', name: 'Mariki', cityCode: 'ZAS-001' },
  { code: 'ZAM-049', name: 'Mercedes', cityCode: 'ZAS-001' },
  { code: 'ZAM-050', name: 'Muti', cityCode: 'ZAS-001' },
  { code: 'ZAM-051', name: 'Pamucutan', cityCode: 'ZAS-001' },
  { code: 'ZAM-052', name: 'Pangapuyan', cityCode: 'ZAS-001' },
  { code: 'ZAM-053', name: 'Panubigan', cityCode: 'ZAS-001' },
  { code: 'ZAM-054', name: 'Pasobolong', cityCode: 'ZAS-001' },
  { code: 'ZAM-055', name: 'Pasonanca', cityCode: 'ZAS-001' },
  { code: 'ZAM-056', name: 'Patalon', cityCode: 'ZAS-001' },
  { code: 'ZAM-057', name: 'Putik', cityCode: 'ZAS-001' },
  { code: 'ZAM-058', name: 'Quiniput', cityCode: 'ZAS-001' },
  { code: 'ZAM-059', name: 'Recodo', cityCode: 'ZAS-001' },
  { code: 'ZAM-060', name: 'Rio Hondo', cityCode: 'ZAS-001' },
  { code: 'ZAM-061', name: 'Salaan', cityCode: 'ZAS-001' },
  { code: 'ZAM-062', name: 'San Jose Cawa-Cawa', cityCode: 'ZAS-001' },
  { code: 'ZAM-063', name: 'San Jose Gusu', cityCode: 'ZAS-001' },
  { code: 'ZAM-064', name: 'San Roque', cityCode: 'ZAS-001' },
  { code: 'ZAM-065', name: 'Sangali', cityCode: 'ZAS-001' },
  { code: 'ZAM-066', name: 'Santa Barbara', cityCode: 'ZAS-001' },
  { code: 'ZAM-067', name: 'Santa Catalina', cityCode: 'ZAS-001' },
  { code: 'ZAM-068', name: 'Santa Maria', cityCode: 'ZAS-001' },
  { code: 'ZAM-069', name: 'Santo Niño', cityCode: 'ZAS-001' },
  { code: 'ZAM-070', name: 'Sibulao (Curuan)', cityCode: 'ZAS-001' },
  { code: 'ZAM-071', name: 'Sinubung', cityCode: 'ZAS-001' },
  { code: 'ZAM-072', name: 'Sinunuc', cityCode: 'ZAS-001' },
  { code: 'ZAM-073', name: 'Tagasilay', cityCode: 'ZAS-001' },
  { code: 'ZAM-074', name: 'Taguiti', cityCode: 'ZAS-001' },
  { code: 'ZAM-075', name: 'Talabaan', cityCode: 'ZAS-001' },
  { code: 'ZAM-076', name: 'Talisayan', cityCode: 'ZAS-001' },
  { code: 'ZAM-077', name: 'Talon-Talon', cityCode: 'ZAS-001' },
  { code: 'ZAM-078', name: 'Taluksangay', cityCode: 'ZAS-001' },
  { code: 'ZAM-079', name: 'Tetuan', cityCode: 'ZAS-001' },
  { code: 'ZAM-080', name: 'Tictapul', cityCode: 'ZAS-001' },
  { code: 'ZAM-081', name: 'Tigbalabag', cityCode: 'ZAS-001' },
  { code: 'ZAM-082', name: 'Tigtabon', cityCode: 'ZAS-001' },
  { code: 'ZAM-083', name: 'Tolosa', cityCode: 'ZAS-001' },
  { code: 'ZAM-084', name: 'Tugbungan', cityCode: 'ZAS-001' },
  { code: 'ZAM-085', name: 'Tulungatung', cityCode: 'ZAS-001' },
  { code: 'ZAM-086', name: 'Tumaga', cityCode: 'ZAS-001' },
  { code: 'ZAM-087', name: 'Tumalutab', cityCode: 'ZAS-001' },
  { code: 'ZAM-088', name: 'Tumitus', cityCode: 'ZAS-001' },
  { code: 'ZAM-089', name: 'Victoria', cityCode: 'ZAS-001' },
  { code: 'ZAM-090', name: 'Vitali', cityCode: 'ZAS-001' },
  { code: 'ZAM-091', name: 'Zambowood', cityCode: 'ZAS-001' },
  { code: 'ZAM-092', name: 'Zone I (Poblacion)', cityCode: 'ZAS-001' },
  { code: 'ZAM-093', name: 'Zone II (Poblacion)', cityCode: 'ZAS-001' },
  { code: 'ZAM-094', name: 'Zone III (Poblacion)', cityCode: 'ZAS-001' },
  { code: 'ZAM-095', name: 'Zone IV (Poblacion)', cityCode: 'ZAS-001' },
];

export const getProvinces = (): Province[] => {
  return provinces.sort((a, b) => a.name.localeCompare(b.name));
};

export const getCitiesByProvince = (provinceCode: string): City[] => {
  return cities
    .filter((city) => city.provinceCode === provinceCode)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getBarangaysByCity = (cityCode: string): Barangay[] => {
  return barangays
    .filter((barangay) => barangay.cityCode === cityCode)
    .sort((a, b) => a.name.localeCompare(b.name));
};

