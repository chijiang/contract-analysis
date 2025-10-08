const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWdoZmZpOGYwMDAzeW1qOGd1dTM5Yml3IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6ImNtZ2hmZmhkcTAwMDB5bWo4eWE5eXR0NGgiLCJpYXQiOjE3NTk4OTc5NDAsImV4cCI6MTc1OTk4NDM0MH0.gvnrCAwyd5mqzJv-OeT2Y93iaxo7R97k9w1OoWNgiG0';

const URL_PERMISSIONS = {
  "admin": ["/", "/*"],
  "user": ["/", "/contracts/*", "/settings"],
};

function matchesPattern(pattern, pathname) {
  const regexPattern = pattern
    .replace(/\*/g, ".*")
    .replace(/\//g, "\\/");
  
  const regex = new RegExp(`^${regexPattern}$`);
  console.log(`Testing pattern: ${pattern} -> regex: ${regexPattern} against path: ${pathname}`);
  console.log(`Match result: ${regex.test(pathname)}`);
  return regex.test(pathname);
}

function checkPermission(role, pathname) {
  const permissions = URL_PERMISSIONS[role] || [];
  console.log(`Checking permissions for role: ${role}, path: ${pathname}`);
  console.log(`Permissions:`, permissions);
  
  for (const pattern of permissions) {
    if (matchesPattern(pattern, pathname)) {
      return true;
    }
  }
  
  return false;
}

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Decoded token:', decoded);
  
  const hasPermission = checkPermission(decoded.role, '/');
  console.log(`Final permission result: ${hasPermission}`);
} catch (error) {
  console.error('Error:', error);
}

