export interface WebcamStatus {
  sourceName: 'Las Leñas oficial';
  officialUrl: 'https://laslenas.com/camara-en-vivo/';
  status: 'available' | 'unavailable';
  embeddable: boolean;
  checkedAt: string;
  message: string | null;
}
