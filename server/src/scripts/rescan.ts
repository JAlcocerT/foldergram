import { scannerService } from '../services/scanner-service.js';

const result = await scannerService.scanAll('script');
console.log(JSON.stringify(result, null, 2));
