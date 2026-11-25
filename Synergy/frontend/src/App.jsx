
import { useCallback, useEffect, useState } from "react";
import "./App.css";
import api from "./api";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Demonstration data for general analytics.
const weeklyData = [
  { day: "Mon", usage: 18 },
  { day: "Tue", usage: 22 },
  { day: "Wed", usage: 19 },
  { day: "Thu", usage: 28 },
  { day: "Fri", usage: 21 },
  { day: "Sat", usage: 17 },
  { day: "Sun", usage: 23 },
];

const applianceData = [
  { name: "Air Conditioner", value: 35 },
  { name: "Lighting", value: 15 },
  { name: "Refrigerator", value: 20 },
  { name: "Other Appliances", value: 30 },
];

const monthlyData = [
  { month: "Jan", usage: 120 },
  { month: "Feb", usage: 135 },
  { month: "Mar", usage: 128 },
  { month: "Apr", usage: 145 },
  { month: "May", usage: 138 },
  { month: "Jun", usage: 148 },
];

const chartColors = ["#65c18c", "#8b9cf5", "#f5bd65", "#e88b8b"];

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("synergy_user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      sessionStorage.removeItem("synergy_user");
      sessionStorage.removeItem("synergy_token");
      return null;
    }
  });

  const [isRegister, setIsRegister] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Energy readings from PostgreSQL.
  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [readingsError, setReadingsError] = useState("");

  // Alerts from PostgreSQL.
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");

  // Save user information during the browser session.
  useEffect(() => {
    if (user) {
      sessionStorage.setItem("synergy_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("synergy_user");
    }
  }, [user]);

  // Fetch readings from the backend.
  const fetchReadings = useCallback(async () => {
    setReadingsLoading(true);
    setReadingsError("");

    try {
      const response = await api.get("/energy/readings");

      const sortedReadings = [...response.data].sort(
        (a, b) =>
          new Date(a.recordedAt) - new Date(b.recordedAt)
      );

      setReadings(sortedReadings);
    } catch (err) {
      console.error("Energy reading error:", err);

      setReadingsError(
        "Unable to load energy readings. Please try again."
      );
    } finally {
      setReadingsLoading(false);
    }
  }, []);

  // Fetch alerts and unread count from the backend.
  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError("");

    try {
      const [alertsResponse, countResponse] = await Promise.all([
        api.get("/alerts"),
        api.get("/alerts/unread-count"),
      ]);

      setAlerts(alertsResponse.data);
      setUnreadCount(countResponse.data.count);
    } catch (err) {
      console.error("Alert loading error:", err);

      setAlertsError(
        "Unable to load alerts. Please try again."
      );
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Fetch readings and alerts when a user logs in.
  useEffect(() => {
    if (user) {
      fetchReadings();
      fetchAlerts();
    } else {
      setReadings([]);
      setReadingsError("");
      setAlerts([]);
      setUnreadCount(0);
      setAlertsError("");
    }
  }, [user, fetchReadings, fetchAlerts]);

  // Mark an alert as read.
  const markAlertAsRead = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read`);

      // Update the alert list immediately.
      setAlerts((previousAlerts) =>
        previousAlerts.map((alert) =>
          alert.id === alertId
            ? { ...alert, isRead: true }
            : alert
        )
      );

      // Refresh the unread count from the backend.
      const response = await api.get("/alerts/unread-count");
      setUnreadCount(response.data.count);
    } catch (err) {
      console.error("Unable to mark alert as read:", err);

      setAlertsError(
        "Unable to update this alert. Please try again."
      );
    }
  };

  // Latest energy reading.
  const latestReading =
    readings.length > 0
      ? readings[readings.length - 1]
      : null;

  // Prepare data for the saved energy chart.
  const readingChartData = readings.map((reading, index) => ({
    name: reading.recordedAt
      ? new Date(reading.recordedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : `Reading ${index + 1}`,
    energy: reading.energy,
  }));

  // Format date and time.
  const formatDateTime = (dateValue) => {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Handle form inputs.
  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Login and registration.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        await api.post("/auth/register", {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        });

        setSuccess("Account created successfully! Please sign in.");
        setIsRegister(false);

        setFormData({
          fullName: "",
          email: formData.email,
          password: "",
        });
      } else {
        const response = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        sessionStorage.setItem(
          "synergy_token",
          response.data.token
        );

        const loggedInUser = {
          id: response.data.id,
          fullName: response.data.fullName,
          email: response.data.email,
        };

        setUser(loggedInUser);
        setActiveTab("Overview");

        setFormData({
          fullName: "",
          email: "",
          password: "",
        });
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Something went wrong. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Logout.
  const logout = () => {
    sessionStorage.removeItem("synergy_token");
    sessionStorage.removeItem("synergy_user");

    setUser(null);
    setReadings([]);
    setAlerts([]);
    setUnreadCount(0);
    setActiveTab("Overview");
    setIsRegister(false);

    setFormData({
      fullName: "",
      email: "",
      password: "",
    });

    setError("");
    setSuccess("");
  };

  // LOGIN AND REGISTRATION PAGE.
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">

          <div className="auth-logo">
            <h1>Synergy</h1>
            <p>Smart Energy Monitoring System</p>
          </div>

          <div className="auth-heading">
            <h2>
              {isRegister
                ? "Create your account"
                : "Welcome back"}
            </h2>

            <p>
              {isRegister
                ? "Sign up to start monitoring your energy."
                : "Sign in to continue to your dashboard."}
            </p>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {success && (
            <div className="success-message">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {isRegister && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>

                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </button>

          </form>

          <div className="auth-switch">
            {isRegister
              ? "Already have an account? "
              : "Don't have an account? "}

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setSuccess("");
              }}
            >
              {isRegister ? "Sign In" : "Create Account"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // MAIN DASHBOARD.
  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <header className="dashboard-header">

        <div className="dashboard-brand">
          <h1>Synergy</h1>
          <p>Smart Energy Monitoring</p>
        </div>

        <div className="dashboard-user">
          <span>Welcome, {user.fullName}</span>

          <button
            className="logout-button"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>

      </header>

      <main className="dashboard-content">

        {/* DASHBOARD HEADING */}
        <div className="dashboard-heading">
          <div>
            <h2>Energy Dashboard</h2>
            <p>
              Monitor and understand your energy consumption.
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="dashboard-tabs">

          <button
            className={activeTab === "Overview" ? "active" : ""}
            onClick={() => setActiveTab("Overview")}
          >
            Overview
          </button>

          <button
            className={activeTab === "History" ? "active" : ""}
            onClick={() => setActiveTab("History")}
          >
            History
          </button>

          <button
            className={activeTab === "Reports" ? "active" : ""}
            onClick={() => setActiveTab("Reports")}
          >
            Reports
          </button>

          <button
            className={activeTab === "Alerts" ? "active" : ""}
            onClick={() => {
              setActiveTab("Alerts");
              fetchAlerts();
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              Alerts

              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#e76f6f",
                    color: "#ffffff",
                    borderRadius: "20px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </span>
          </button>

        </div>

        {/* ================================= */}
        {/* OVERVIEW TAB */}
        {/* ================================= */}

        {activeTab === "Overview" && (
          <>

            <section>

              <div className="dashboard-heading">
                <div>
                  <h3>Live Energy Readings</h3>
                  <p>
                    Latest readings retrieved from your database.
                  </p>
                </div>

                <button
                  className="logout-button"
                  onClick={fetchReadings}
                  disabled={readingsLoading}
                >
                  {readingsLoading ? "Refreshing..." : "Refresh Data"}
                </button>
              </div>

              {readingsError && (
                <div className="error-message">
                  {readingsError}
                </div>
              )}

              <div className="demo-notice">
                These readings are stored in PostgreSQL.
                Sensor readings will appear here when your
                hardware sends them to the API.
              </div>

              <div className="stats-grid">

                <div className="stat-card">
                  <p>Voltage</p>
                  <h3>
                    {latestReading
                      ? `${latestReading.voltage} V`
                      : "--"}
                  </h3>
                  <small>Latest reading</small>
                </div>

                <div className="stat-card">
                  <p>Current</p>
                  <h3>
                    {latestReading
                      ? `${latestReading.current} A`
                      : "--"}
                  </h3>
                  <small>Latest reading</small>
                </div>

                <div className="stat-card">
                  <p>Power</p>
                  <h3>
                    {latestReading
                      ? `${latestReading.power} W`
                      : "--"}
                  </h3>
                  <small>Latest reading</small>
                </div>

                <div className="stat-card">
                  <p>Energy</p>
                  <h3>
                    {latestReading
                      ? `${latestReading.energy} kWh`
                      : "--"}
                  </h3>
                  <small>Latest reading</small>
                </div>

              </div>

              {/* SAVED ENERGY CHART */}
              <div className="chart-panel">

                <div className="chart-heading">
                  <h3>Saved Energy Readings</h3>
                  <p>
                    Energy values retrieved from PostgreSQL.
                  </p>
                </div>

                {readingsLoading ? (
                  <p>Loading energy readings...</p>
                ) : readings.length === 0 ? (
                  <p>No energy readings have been saved yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={readingChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="energy"
                        name="Energy (kWh)"
                        stroke="#65c18c"
                        fill="#65c18c"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                <p className="dashboard-note">
                  Total saved records: {readings.length}
                </p>

              </div>

            </section>

            {/* DEMONSTRATION ANALYTICS */}
            <section>

              <div className="dashboard-heading">
                <div>
                  <h3>Energy Analytics</h3>
                  <p>
                    Illustrative weekly and appliance usage charts.
                  </p>
                </div>
              </div>

              <div className="demo-notice">
                The following analytics still use sample
                demonstration data, not live database readings.
              </div>

              <div className="stats-grid">

                <div className="stat-card">
                  <p>Total Energy Used</p>
                  <h3>148.3 <span>kWh</span></h3>
                  <small>Sample data</small>
                </div>

                <div className="stat-card">
                  <p>Average Daily Usage</p>
                  <h3>21.2 <span>kWh</span></h3>
                  <small>Sample data</small>
                </div>

                <div className="stat-card">
                  <p>Estimated Electricity Bill</p>
                  <h3>₹1,483</h3>
                  <small>Sample estimate</small>
                </div>

                <div className="stat-card">
                  <p>Highest Usage</p>
                  <h3>28 <span>kWh</span></h3>
                  <small>Thursday - sample data</small>
                </div>

              </div>

              <div className="charts-grid">

                <div className="chart-panel">
                  <div className="chart-heading">
                    <h3>Weekly Energy Consumption</h3>
                    <p>Sample energy used each day</p>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="usage"
                        name="Energy"
                        stroke="#65c18c"
                        fill="#65c18c"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-panel">
                  <div className="chart-heading">
                    <h3>Appliance Usage</h3>
                    <p>Sample energy distribution</p>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>

                      <Pie
                        data={applianceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {applianceData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={
                              chartColors[
                                index % chartColors.length
                              ]
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip />

                    </PieChart>
                  </ResponsiveContainer>

                  <div className="chart-legend">
                    {applianceData.map((item, index) => (
                      <div key={item.name}>
                        <span
                          className="legend-dot"
                          style={{
                            backgroundColor:
                              chartColors[
                                index % chartColors.length
                              ],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>

                </div>

              </div>

              <div className="chart-panel">

                <div className="chart-heading">
                  <h3>Daily Energy Usage</h3>
                  <p>Sample weekly energy comparison</p>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />

                    <Bar
                      dataKey="usage"
                      name="Energy"
                      fill="#65c18c"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

              </div>

            </section>

          </>
        )}

        {/* ================================= */}
        {/* HISTORY TAB */}
        {/* ================================= */}

        {activeTab === "History" && (
          <section>

            <div className="dashboard-heading">
              <div>
                <h3>Energy History</h3>
                <p>
                  View all energy readings saved under your account.
                </p>
              </div>

              <button
                className="logout-button"
                onClick={fetchReadings}
                disabled={readingsLoading}
              >
                {readingsLoading ? "Refreshing..." : "Refresh History"}
              </button>
            </div>

            <div className="demo-notice">
              This history contains readings retrieved from your
              PostgreSQL database and belongs to your account.
            </div>

            {readingsError && (
              <div className="error-message">
                {readingsError}
              </div>
            )}

            <div className="chart-panel">

              <div className="chart-heading">
                <h3>Saved Readings</h3>
                <p>
                  Total records: {readings.length}
                </p>
              </div>

              {readingsLoading ? (
                <p>Loading your energy history...</p>
              ) : readings.length === 0 ? (
                <p>
                  No energy readings found. Once your device
                  sends readings, they will appear here.
                </p>
              ) : (

                <div style={{ width: "100%", overflowX: "auto" }}>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "left",
                      minWidth: "750px",
                    }}
                  >

                    <thead>
                      <tr>
                        {[
                          "Reading ID",
                          "Voltage",
                          "Current",
                          "Power",
                          "Energy",
                          "Date & Time",
                        ].map((heading) => (
                          <th
                            key={heading}
                            style={{
                              padding: "16px 12px",
                              borderBottom: "1px solid #294136",
                              color: "#a5e9c0",
                              fontWeight: 600,
                              fontSize: "14px",
                            }}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>

                      {[...readings].reverse().map((reading) => (
                        <tr key={reading.id}>

                          <td style={tableCellStyle}>
                            #{reading.id}
                          </td>

                          <td style={tableCellStyle}>
                            {reading.voltage} V
                          </td>

                          <td style={tableCellStyle}>
                            {reading.current} A
                          </td>

                          <td style={tableCellStyle}>
                            {reading.power} W
                          </td>

                          <td style={tableCellStyle}>
                            {reading.energy} kWh
                          </td>

                          <td style={tableCellStyle}>
                            {formatDateTime(reading.recordedAt)}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

            <div className="chart-panel">

              <div className="chart-heading">
                <h3>Energy History Chart</h3>
                <p>
                  Energy consumption across your saved readings.
                </p>
              </div>

              {readings.length === 0 ? (
                <p>No chart data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={readingChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />

                    <Bar
                      dataKey="energy"
                      name="Energy (kWh)"
                      fill="#65c18c"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}

            </div>

          </section>
        )}

        {/* ================================= */}
        {/* REPORTS TAB */}
        {/* ================================= */}

        {activeTab === "Reports" && (
          <>

            <div className="demo-notice">
              These reports use sample data for demonstration purposes.
              They are not yet calculated from your saved sensor readings.
            </div>

            <section className="reports-panel">

              <h3>Energy Usage Report</h3>

              <p className="report-subtitle">
                Sample summary of energy consumption.
              </p>

              <div className="reports-grid">

                <div className="stat-card">
                  <p>Total Energy Used</p>
                  <h3>148.3 <span>kWh</span></h3>
                </div>

                <div className="stat-card">
                  <p>Average Daily Usage</p>
                  <h3>21.2 <span>kWh</span></h3>
                </div>

                <div className="stat-card">
                  <p>Estimated Electricity Bill</p>
                  <h3>₹1,483</h3>
                </div>

                <div className="stat-card">
                  <p>Highest Usage Day</p>
                  <h3>Thursday</h3>
                  <small>28 kWh</small>
                </div>

              </div>

            </section>

            <section className="chart-panel">

              <div className="chart-heading">
                <h3>Monthly Energy Consumption</h3>
                <p>Sample energy usage over six months</p>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />

                  <Bar
                    dataKey="usage"
                    name="Energy"
                    fill="#65c18c"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>

            </section>

          </>
        )}

        {/* ================================= */}
        {/* ALERTS TAB */}
        {/* ================================= */}

        {activeTab === "Alerts" && (
          <section>

            <div className="dashboard-heading">
              <div>
                <h3>Notifications & Alerts</h3>
                <p>
                  Monitor unusual energy readings and system warnings.
                </p>
              </div>

              <button
                className="logout-button"
                onClick={fetchAlerts}
                disabled={alertsLoading}
              >
                {alertsLoading ? "Refreshing..." : "Refresh Alerts"}
              </button>
            </div>

            {/* ALERT SUMMARY */}
            <div className="stats-grid">

              <div className="stat-card">
                <p>Total Alerts</p>
                <h3>{alerts.length}</h3>
                <small>Alerts saved in your account</small>
              </div>

              <div className="stat-card">
                <p>Unread Alerts</p>
                <h3>{unreadCount}</h3>
                <small>Require your attention</small>
              </div>

              <div className="stat-card">
                <p>Read Alerts</p>
                <h3>
                  {alerts.filter((alert) => alert.isRead).length}
                </h3>
                <small>Already reviewed</small>
              </div>

            </div>

            {alertsError && (
              <div className="error-message">
                {alertsError}
              </div>
            )}

            {/* ALERT LIST */}
            <div className="chart-panel">

              <div className="chart-heading">
                <h3>Your Alerts</h3>
                <p>
                  Alerts generated automatically from your energy readings.
                </p>
              </div>

              {alertsLoading ? (
                <p>Loading alerts...</p>
              ) : alerts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "35px 15px" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>
                    ✓
                  </div>
                  <h3>No Alerts Yet</h3>
                  <p>
                    Your alerts will appear here when an energy
                    reading crosses a configured threshold.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: "20px",
                        borderRadius: "12px",
                        border: alert.isRead
                          ? "1px solid #294136"
                          : "1px solid #65c18c",
                        background: alert.isRead
                          ? "rgba(255,255,255,0.02)"
                          : "rgba(101,193,140,0.07)",
                      }}
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                          marginBottom: "12px",
                        }}
                      >

                        <h3 style={{ margin: 0 }}>
                          {alert.title}
                        </h3>

                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "5px 10px",
                            borderRadius: "20px",
                            background:
                              alert.severity === "CRITICAL"
                                ? "rgba(231,111,111,0.15)"
                                : "rgba(245,189,101,0.15)",
                            color:
                              alert.severity === "CRITICAL"
                                ? "#e88b8b"
                                : "#f5bd65",
                          }}
                        >
                          {alert.severity}
                        </span>

                      </div>

                      <p
                        style={{
                          color: "#c4d6cc",
                          margin: "0 0 12px",
                          lineHeight: 1.6,
                        }}
                      >
                        {alert.message}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >

                        <div>
                          <small style={{ color: "#91a99a" }}>
                            {formatDateTime(alert.createdAt)}
                          </small>

                          <div style={{ marginTop: "5px" }}>
                            <small
                              style={{
                                color: alert.isRead ? "#91a99a" : "#65c18c",
                                fontWeight: 600,
                              }}
                            >
                              {alert.isRead ? "Read" : "Unread"}
                            </small>
                          </div>
                        </div>

                        {!alert.isRead && (
                          <button
                            className="logout-button"
                            onClick={() => markAlertAsRead(alert.id)}
                          >
                            Mark as Read
                          </button>
                        )}

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </section>
        )}

        {/* FOOTER */}
        <footer className="dashboard-footer">
          Synergy Smart Energy Monitoring System
        </footer>

      </main>
    </div>
  );
}

// Styling for history table cells.
const tableCellStyle = {
  padding: "16px 12px",
  borderBottom: "1px solid #24382e",
  color: "#c4d6cc",
  fontSize: "14px",
};

export default App;
