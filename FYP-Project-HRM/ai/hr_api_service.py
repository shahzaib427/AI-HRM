"""
hr_api_service.py  ← NEW FILE
Place this at:  ai/hr_api_service.py

WHAT IT DOES:
    Calls your MERN backend APIs and returns clean formatted text
    that boat_module.py can inject into the chatbot response.

ENDPOINTS USED (from your actual MERN route files):
    GET /api/attendance/my-attendance          ← attendanceRoutes.js
    GET /api/employee/payroll                  ← employeePayrollRoutes.js
    GET /api/employee/payroll/dashboard        ← employeePayrollRoutes.js
    GET /api/employee/payroll/:id/payslip      ← employeePayrollRoutes.js

    ── These you need to add to your MERN (instructions below) ──
    GET /api/leave/balance                     ← leaveRoutes.js (add this)
    GET /api/leave/my-leaves                   ← leaveRoutes.js (add this)
    GET /api/employee/profile                  ← employeeRoutes.js (add this)
    GET /api/notifications                     ← notificationRoutes.js (add if exists)

HOW JWT WORKS HERE:
    - React saves JWT in localStorage after login (your MERN already does this)
    - React sends it in every request header as: Authorization: Bearer <token>
    - Flask reads that header from the incoming request
    - Flask passes it here, and we forward it to MERN
    - MERN validates it with your protect() middleware
    - MERN knows which employee is asking → returns their data only
"""

import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Standard response wrapper
# Every method returns this so boat_module always gets the same structure
# ─────────────────────────────────────────────────────────────────────────────
class APIResponse:
    def __init__(self, success: bool, data=None, error: str = "", status_code: int = 200):
        self.success     = success
        self.data        = data
        self.error       = error
        self.status_code = status_code


# ─────────────────────────────────────────────────────────────────────────────
# HRApiService
# One instance per chatbot request (stateless, JWT-scoped)
# ─────────────────────────────────────────────────────────────────────────────
class HRApiService:
    """
    Args:
        base_url  : Your MERN backend base URL, e.g. "http://localhost:5000/api"
        jwt_token : Full "Bearer <token>" string from the React frontend
        timeout   : Seconds before giving up on a MERN call (default 10)
    """

    def __init__(self, base_url: str, jwt_token: str, timeout: int = 10):
        self.base_url = base_url.rstrip("/")
        self.timeout  = timeout
        self.headers  = {
            "Authorization": jwt_token,         # e.g. "Bearer eyJhbGci..."
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Internal GET helper — all public methods call this
    # ─────────────────────────────────────────────────────────────────────────
    def _get(self, endpoint: str, params: Optional[dict] = None) -> APIResponse:
        url = f"{self.base_url}{endpoint}"
        try:
            logger.info(f"[HRApiService] GET {url}")
            resp = requests.get(url, headers=self.headers, params=params, timeout=self.timeout)

            if resp.status_code == 401:
                return APIResponse(False, error="Session expired. Please log in again.", status_code=401)
            if resp.status_code == 403:
                return APIResponse(False, error="You don't have permission to view this data.", status_code=403)
            if resp.status_code == 404:
                return APIResponse(False, error="Data not found.", status_code=404)
            if resp.status_code >= 500:
                return APIResponse(False, error="HR system is temporarily unavailable.", status_code=resp.status_code)

            resp.raise_for_status()
            return APIResponse(True, data=resp.json(), status_code=resp.status_code)

        except requests.exceptions.Timeout:
            logger.error(f"[HRApiService] Timeout: {url}")
            return APIResponse(False, error="The HR system took too long to respond. Please try again.", status_code=504)
        except requests.exceptions.ConnectionError:
            logger.error(f"[HRApiService] Cannot connect: {url}")
            return APIResponse(False, error="Cannot connect to the HR system right now.", status_code=503)
        except requests.exceptions.RequestException as e:
            logger.error(f"[HRApiService] Error: {e}")
            return APIResponse(False, error=f"Unexpected error: {str(e)}", status_code=500)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. ATTENDANCE
    #    Route: GET /api/attendance/my-attendance
    #    Already exists in your attendanceRoutes.js ✅
    #    Optional params: dateFrom, dateTo (your route supports query params)
    # ─────────────────────────────────────────────────────────────────────────
    def get_attendance(self, date_from: str = None, date_to: str = None) -> APIResponse:
        params = {}
        if date_from: params["dateFrom"] = date_from
        if date_to:   params["dateTo"]   = date_to
        return self._get("/attendance/my-attendance", params or None)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. PAYROLL LIST
    #    Route: GET /api/employee/payroll
    #    Already exists in your employeePayrollRoutes.js ✅
    #    Optional params: year, status, page, limit
    # ─────────────────────────────────────────────────────────────────────────
    def get_payroll(self, year: str = None) -> APIResponse:
        params = {"limit": 3}  # only show last 3 for chat context
        if year: params["year"] = year
        return self._get("/employee/payroll", params)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. PAYROLL DASHBOARD / STATS
    #    Route: GET /api/employee/payroll/dashboard
    #    Already exists in your employeePayrollRoutes.js ✅
    # ─────────────────────────────────────────────────────────────────────────
    def get_payroll_stats(self) -> APIResponse:
        return self._get("/employee/payroll/dashboard")

    # ─────────────────────────────────────────────────────────────────────────
    # 4. LEAVE BALANCE
    #    ⚠️  Add this route to your MERN leaveRoutes.js (code below)
    #    Route: GET /api/leave/balance
    # ─────────────────────────────────────────────────────────────────────────
    def get_leave_balance(self) -> APIResponse:
        return self._get("/leave/balance")

    # ─────────────────────────────────────────────────────────────────────────
    # 5. LEAVE REQUESTS
    #    ⚠️  Add this route to your MERN leaveRoutes.js (code below)
    #    Route: GET /api/leave/my-leaves
    # ─────────────────────────────────────────────────────────────────────────
    def get_leave_requests(self) -> APIResponse:
        return self._get("/leave/my-leaves")

    # ─────────────────────────────────────────────────────────────────────────
    # 6. EMPLOYEE PROFILE
    #    ⚠️  Add this route to your MERN (code below)
    #    Route: GET /api/employee/profile
    #    (or use /api/auth/me if that exists in your MERN)
    # ─────────────────────────────────────────────────────────────────────────
    def get_employee_profile(self) -> APIResponse:
        return self._get("/employee/profile")

    # ─────────────────────────────────────────────────────────────────────────
    # 7. NOTIFICATIONS
    #    ⚠️  Add this route to your MERN (code below)
    #    Route: GET /api/notifications
    # ─────────────────────────────────────────────────────────────────────────
    def get_notifications(self) -> APIResponse:
        return self._get("/notifications")


# ─────────────────────────────────────────────────────────────────────────────
# HRDataFormatter
# Converts raw MERN JSON into clean human-readable text
# This text is injected into the chatbot response
# ─────────────────────────────────────────────────────────────────────────────
class HRDataFormatter:

    @staticmethod
    def format_attendance(data) -> str:
        """
        Handles both list response (array of records) and object response.
        Your MERN getMyAttendance returns paginated data — we handle both.
        """
        try:
            # Handle paginated response: { attendance: [...], total: N }
            records = data if isinstance(data, list) else data.get("attendance", data.get("records", []))

            if not records:
                return "📅 No attendance records found for the selected period."

            # Count stats from records
            present = sum(1 for r in records if r.get("status", "").lower() in ["present", "approved"])
            absent  = sum(1 for r in records if r.get("status", "").lower() == "absent")
            late    = sum(1 for r in records if r.get("status", "").lower() == "late")
            total   = len(records)

            lines = [f"📅 **Your Attendance Summary ({total} records):**"]
            lines.append(f"  ✅ Present:  {present} days")
            lines.append(f"  ❌ Absent:   {absent} days")
            lines.append(f"  ⏰ Late:     {late} days")

            # Show last 3 records for context
            lines.append("\n**Recent Records:**")
            for rec in records[:3]:
                date     = rec.get("date", rec.get("createdAt", "?"))[:10]
                checkin  = rec.get("checkInTime", rec.get("checkIn", "—"))
                checkout = rec.get("checkOutTime", rec.get("checkOut", "—"))
                status   = rec.get("status", "?").capitalize()
                lines.append(f"  • {date} | In: {checkin} | Out: {checkout} | {status}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_attendance error: {e}")
            return "📅 Attendance data retrieved but could not be formatted."

    @staticmethod
    def format_payroll(data) -> str:
        """
        Your employeePayrollController returns paginated payroll list.
        data = { payrolls: [...], total: N } or just [...]
        """
        try:
            records = data if isinstance(data, list) else data.get("payrolls", data.get("data", []))

            if not records:
                return "💰 No payroll records found."

            lines = ["💰 **Your Recent Payroll Records:**"]
            for rec in records[:3]:  # show last 3
                month   = rec.get("month", rec.get("payPeriod", "?"))
                net     = rec.get("netSalary", rec.get("netPay", rec.get("amount", "?")))
                status  = rec.get("status", rec.get("paymentStatus", "?"))
                paid_on = rec.get("paidDate", rec.get("paymentDate", ""))

                line = f"  • {month} | Net Pay: PKR {net:,}" if isinstance(net, (int, float)) else f"  • {month} | Net Pay: {net}"
                line += f" | Status: {str(status).capitalize()}"
                if paid_on:
                    line += f" | Paid: {str(paid_on)[:10]}"
                lines.append(line)

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_payroll error: {e}")
            return "💰 Payroll data retrieved but could not be formatted."

    @staticmethod
    def format_payroll_stats(data) -> str:
        """Dashboard stats from GET /api/employee/payroll/dashboard"""
        try:
            if not data:
                return "💰 Payroll summary not available."

            lines = ["💰 **Your Payroll Summary:**"]

            # Handle different possible response shapes
            total_earned  = data.get("totalEarned", data.get("totalSalary", data.get("total", "?")))
            latest_salary = data.get("latestSalary", data.get("currentSalary", data.get("netPay", "?")))
            status        = data.get("latestStatus", data.get("status", "?"))

            if total_earned != "?": lines.append(f"  • Total Earned:   PKR {total_earned:,}" if isinstance(total_earned, (int,float)) else f"  • Total Earned:   {total_earned}")
            if latest_salary != "?": lines.append(f"  • Latest Salary:  PKR {latest_salary:,}" if isinstance(latest_salary, (int,float)) else f"  • Latest Salary:  {latest_salary}")
            if status != "?": lines.append(f"  • Latest Status:  {str(status).capitalize()}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_payroll_stats error: {e}")
            return "💰 Payroll summary retrieved but could not be formatted."

    @staticmethod
    def format_leave_balance(data) -> str:
        try:
            if not data:
                return "📋 Leave balance not available."

            lines = ["📋 **Your Leave Balance:**"]
            # Try common field names
            casual  = data.get("casualLeave",  data.get("casual",  data.get("remaining", "?")))
            sick    = data.get("sickLeave",    data.get("sick",    None))
            annual  = data.get("annualLeave",  data.get("annual",  None))
            total   = data.get("totalRemaining", data.get("total", None))

            lines.append(f"  • Casual Leave:  {casual} days")
            if sick   is not None: lines.append(f"  • Sick Leave:    {sick} days")
            if annual is not None: lines.append(f"  • Annual Leave:  {annual} days")
            if total  is not None: lines.append(f"  • **Total Left:  {total} days**")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_leave_balance error: {e}")
            return "📋 Leave balance retrieved but could not be formatted."

    @staticmethod
    def format_leave_requests(data) -> str:
        try:
            records = data if isinstance(data, list) else data.get("leaves", data.get("requests", []))

            if not records:
                return "📝 No leave requests found."

            lines = ["📝 **Your Leave Requests:**"]
            status_icons = {"approved": "✅", "pending": "⏳", "rejected": "❌"}

            for req in records[:5]:
                status = str(req.get("status", "?")).lower()
                icon   = status_icons.get(status, "📌")
                ltype  = req.get("leaveType", req.get("type", "Leave"))
                frm    = str(req.get("startDate", req.get("from", "?"))  )[:10]
                to     = str(req.get("endDate",   req.get("to",   "?"))  )[:10]
                lines.append(f"  {icon} {ltype} | {frm} → {to} | {status.capitalize()}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_leave_requests error: {e}")
            return "📝 Leave history retrieved but could not be formatted."

    @staticmethod
    def format_employee_profile(data) -> str:
        try:
            # Handle nested employee object
            emp = data.get("employee", data.get("user", data)) if isinstance(data, dict) else data

            if not emp:
                return "👤 Profile not available."

            lines = ["👤 **Your Profile:**"]
            field_map = [
                ("Name",         ["name", "fullName", "firstName"]),
                ("Employee ID",  ["employeeId", "empId", "employeeCode"]),
                ("Designation",  ["designation", "position", "jobTitle"]),
                ("Department",   ["department", "dept"]),
                ("Joining Date", ["joiningDate", "joinDate", "startDate", "createdAt"]),
                ("Email",        ["email", "workEmail"]),
                ("Role",         ["role"]),
            ]
            for label, keys in field_map:
                for k in keys:
                    val = emp.get(k)
                    if val:
                        if k in ("joiningDate", "joinDate", "startDate", "createdAt"):
                            val = str(val)[:10]
                        lines.append(f"  • {label}: {val}")
                        break

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_employee_profile error: {e}")
            return "👤 Profile retrieved but could not be formatted."

    @staticmethod
    def format_notifications(data) -> str:
        try:
            records = data if isinstance(data, list) else data.get("notifications", [])

            if not records:
                return "🔔 No new notifications."

            lines = [f"🔔 **Notifications ({len(records)}):**"]
            for n in records[:3]:
                read  = n.get("read", n.get("isRead", True))
                dot   = "🔵" if not read else "⚪"
                title = n.get("title", n.get("message", "Notification"))
                date  = str(n.get("createdAt", n.get("date", "")))[:10]
                lines.append(f"  {dot} {title} — {date}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"format_notifications error: {e}")
            return "🔔 Notifications retrieved but could not be formatted."


# ─────────────────────────────────────────────────────────────────────────────
# MERN ROUTES TO ADD
# Copy-paste these into your MERN backend if the routes don't exist yet.
# ─────────────────────────────────────────────────────────────────────────────
"""
── leaveRoutes.js  (ADD these two routes) ───────────────────────────────────

router.get('/balance', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user._id).select('leaveBalance leaves');
    // Adjust field names to match your Leave/Employee model
    const balance = employee?.leaveBalance || {
      casual: employee?.leaves?.casual || 0,
      sick:   employee?.leaves?.sick   || 0,
      annual: employee?.leaves?.annual || 0,
    };
    res.json({ success: true, ...balance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/my-leaves', protect, async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

── employeeRoutes.js  (ADD this route) ──────────────────────────────────────

router.get('/profile', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user._id)
      .select('-password')
      .populate('department', 'name');
    res.json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

── notificationRoutes.js  (ADD this route if not exists) ────────────────────

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
"""