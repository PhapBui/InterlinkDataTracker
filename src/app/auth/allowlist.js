export const allowlist = [
  // 'bvphap.tk@gmail.com', // Admin mặc định
  // 'admin@gmail.com',
  // 'mod1@gmail.com',
  // 'mod2@gmail.com',
  // 'user1@gmail.com'
];

export function isAllowed(email) {
  if (!email) return false;
  const cleanedEmail = email.trim().toLowerCase();

  // Kiểm tra biến môi trường
  const envAllowed = process.env.ALLOWED_EMAILS;
  if (envAllowed) {
    const list = envAllowed.split(',').map(e => e.trim().toLowerCase());
    if (list.includes(cleanedEmail)) return true;
  }

  return allowlist.map(e => e.toLowerCase()).includes(cleanedEmail);
}

export function isAdmin(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === 'bvphap.tk@gmail.com';
}
