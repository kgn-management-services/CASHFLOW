
// server/middleware/adminOnly.js
function isAdmin(role) {
  return role === "admin" || role === "super_admin";
}
function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdmin(req.user.role))
    return res.status(403).json({ error: "Admins only" });
  next();
}
module.exports = { adminOnly, isAdmin };
