export function getBaseApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace('/api', '');
  }
  return import.meta.env.PROD ? 'https://jshs-logistics.onrender.com' : 'http://localhost:4000';
}

// Function to build document URL
export function buildDocumentUrl(filePath: string): string {
  return `${getBaseApiUrl()}${filePath}`;
}

// Function to get status display text
export function getStatusDisplay(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// Function to get status color classes
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Shipment statuses
    'CREATED': 'text-blue-600 dark:text-blue-300',
    'ASSIGNED': 'text-indigo-600 dark:text-indigo-300',
    'DISPATCHED': 'text-amber-600 dark:text-amber-300',
    'IN_TRANSIT': 'text-orange-600 dark:text-orange-300',
    'DELIVERED': 'text-green-600 dark:text-green-300',
    'CANCELLED': 'text-red-600 dark:text-red-300',
    
    // Invoice statuses
    'DRAFT': 'text-gray-600 dark:text-gray-300',
    'ISSUED': 'text-blue-600 dark:text-blue-300',
    'FUNDED': 'text-purple-600 dark:text-purple-300',
    'PAID': 'text-green-600 dark:text-green-300',
    'DISPUTED': 'text-amber-600 dark:text-amber-300',
    'REFUNDED': 'text-red-600 dark:text-red-300',
    
    // Vehicle statuses
    'AVAILABLE': 'text-green-600 dark:text-green-300',
    'IN_USE': 'text-orange-600 dark:text-orange-300',
    'MAINTENANCE': 'text-red-600 dark:text-red-300',
  };
  
  return statusColors[status] || 'text-slate-600 dark:text-slate-300';
}